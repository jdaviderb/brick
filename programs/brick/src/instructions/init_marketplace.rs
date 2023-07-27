use {
    crate::state::*,
    anchor_lang::prelude::*,
    crate::errors::ErrorCode,
    crate::utils::init_mint,
    anchor_spl::{
        token_interface::{
            Mint, 
            TokenAccount, 
            TokenInterface
        },
        token::ID as TokenProgramV0,
        token_2022::ID as TokenProgram2022,
    },
    spl_token_2022::extension::ExtensionType,
};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitMarketplaceParams {
    pub fee: u16,
    pub fee_reduction: u16,
    pub seller_reward: u16,
    pub buyer_reward: u16,
    pub deliver_token: bool,
    pub rewards_enabled: bool,
    pub allow_secondary: bool,
    pub permissionless: bool,
    pub access_mint_bump: u8,
    pub fee_payer: FeePayer,
}

#[derive(Accounts)]
#[instruction(params: InitMarketplaceParams)]
pub struct InitMarketplace<'info> {
    pub system_program: Program<'info, System>,
    #[account(address = TokenProgram2022 @ ErrorCode::IncorrectTokenProgram)]
    pub token_program_2022: Interface<'info, TokenInterface>,
    #[account(address = TokenProgramV0 @ ErrorCode::IncorrectTokenProgram)]
    pub token_program_v0: Interface<'info, TokenInterface>,
    pub rent: Sysvar<'info, Rent>,
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        init,
        payer = signer,
        space = Marketplace::SIZE,
        seeds = [
            b"marketplace".as_ref(),
            signer.key().as_ref(),
        ],
        bump,
    )]
    pub marketplace: Box<Account<'info, Marketplace>>,
    /// CHECK: is init in the instruction logic
    #[account(
        mut,
        seeds = [
            b"access_mint".as_ref(),
            marketplace.key().as_ref(),
        ],
        bump = params.access_mint_bump,
    )]    
    pub access_mint: AccountInfo<'info>,
    pub reward_mint: Box<InterfaceAccount<'info, Mint>>,
    pub discount_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(
        init,
        payer = signer,
        seeds = [
            b"bounty_vault".as_ref(), 
            marketplace.key().as_ref(),
            reward_mint.key().as_ref(),
        ],
        bump,
        token::mint = reward_mint,
        token::authority = marketplace,
        token::token_program = token_program_v0,
    )]
    pub bounty_vault: Box<InterfaceAccount<'info, TokenAccount>>,
}

pub fn handler<'info>(ctx: Context<InitMarketplace>, params: InitMarketplaceParams) -> Result<()> {
    if params.fee_reduction > 10000 || params.fee > 10000 || params.seller_reward > 10000 || params.buyer_reward > 10000 {
        return Err(ErrorCode::IncorrectFee.into());
    }

    // validate access_mint pda
    let marketplace_key: Pubkey = ctx.accounts.marketplace.key();
    let mint_seeds = &[
        b"access_mint".as_ref(),
        marketplace_key.as_ref(),
    ];

    let (account_address, nonce) = Pubkey::find_program_address(mint_seeds, &ctx.program_id.key());
    if account_address != ctx.accounts.access_mint.key() {
        msg!(
            "Create account with PDA: {:?} was requested while PDA: {:?} was expected",
            ctx.accounts.access_mint.key(),
            account_address,
        );
        return Err(ErrorCode::IncorrectSeeds.into());
    }

    let mut signer_mint_seeds = mint_seeds.to_vec();
    let bump = &[nonce];
    signer_mint_seeds.push(bump);

    let signer: Pubkey = ctx.accounts.signer.key();
    let marketplace_seeds = &[
        b"marketplace".as_ref(),
        signer.as_ref(),
        &[ctx.accounts.marketplace.bumps.bump],
    ];

    init_mint(
        signer_mint_seeds,
        marketplace_seeds.to_vec(),
        vec![ExtensionType::NonTransferable],
        ctx.accounts.system_program.to_account_info(),
        ctx.accounts.token_program_2022.to_account_info(),
        ctx.accounts.rent.to_account_info(),
        ctx.accounts.access_mint.to_account_info(),
        ctx.accounts.marketplace.to_account_info(),
        ctx.accounts.signer.to_account_info(),
        ctx.accounts.rent.clone(),
    )?;

    let mut bounty_vaults: Vec<Pubkey> = Vec::with_capacity(Marketplace::VAULT_COUNT); 
    bounty_vaults.push(ctx.accounts.bounty_vault.key());

    let mut vault_bumps: Vec<u8> = Vec::with_capacity(Marketplace::VAULT_COUNT); 
    vault_bumps.push(*ctx.bumps.get("bounty_vault").unwrap());

    (*ctx.accounts.marketplace).authority = ctx.accounts.signer.key();
    (*ctx.accounts.marketplace).deliver_token = params.deliver_token;
    (*ctx.accounts.marketplace).permission_config = PermissionConfig {
        allow_secondary: params.allow_secondary,
        permissionless: params.permissionless,
        access_mint: ctx.accounts.access_mint.key(),
    };
    (*ctx.accounts.marketplace).fees_config = FeesConfig {
        discount_mint: ctx.accounts.discount_mint.key(),
        fee: params.fee,
        fee_reduction: params.fee_reduction,
        fee_payer: params.fee_payer,
    };
    (*ctx.accounts.marketplace).rewards_config = RewardsConfig {
        reward_mint: ctx.accounts.reward_mint.key(),
        bounty_vaults,
        seller_reward: params.seller_reward,
        buyer_reward: params.buyer_reward,
        rewards_enabled: params.rewards_enabled,
    };
    (*ctx.accounts.marketplace).bumps = MarketplaceBumps {
        bump: *ctx.bumps.get("marketplace").unwrap(),
        vault_bumps,
        access_mint_bump: nonce,
    };
    
    Ok(())
}
