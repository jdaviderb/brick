use {
    crate::state::*,
    anchor_lang::prelude::*,
    crate::errors::ErrorCode,
    anchor_spl::{
        token_interface::{Mint, TokenAccount, TokenInterface},
        token::ID as TokenProgramV0,
    },
};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitMarketplaceParams {
    pub fee: u16,
    pub fee_reduction: u16,
    pub seller_reward: u16,
    pub buyer_reward: u16,
    pub rewards_enabled: bool,
}

#[derive(Accounts)]
#[instruction(params: InitMarketplaceParams)]
pub struct InitMarketplace<'info> {
    pub system_program: Program<'info, System>,
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
    pub reward_mint: Box<InterfaceAccount<'info, Mint>>,
    pub discount_mint: Box<InterfaceAccount<'info, Mint>>,
    /// CHECK: no need to validate because is an init ix, there are some cases when
    /// a user can set a "null" value and won't be an initialized account
    pub reward_trigger_mint: AccountInfo<'info>,
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

    let mut bounty_vaults: Vec<Pubkey> = Vec::with_capacity(Marketplace::VAULT_COUNT); 
    bounty_vaults.push(ctx.accounts.bounty_vault.key());

    let mut vault_bumps: Vec<u8> = Vec::with_capacity(Marketplace::VAULT_COUNT); 
    vault_bumps.push(*ctx.bumps.get("bounty_vault").unwrap());

    (*ctx.accounts.marketplace).authority = ctx.accounts.signer.key();
    (*ctx.accounts.marketplace).fees_config = FeesConfig {
        discount_mint: ctx.accounts.discount_mint.key(),
        fee: params.fee,
        fee_reduction: params.fee_reduction,
    };
    (*ctx.accounts.marketplace).rewards_config = RewardsConfig {
        reward_mint: ctx.accounts.reward_mint.key(),
        bounty_vaults,
        seller_reward: params.seller_reward,
        buyer_reward: params.buyer_reward,
        rewards_enabled: params.rewards_enabled,
        reward_trigger_mint: ctx.accounts.reward_trigger_mint.key(),
    };
    (*ctx.accounts.marketplace).bumps = MarketplaceBumps {
        bump: *ctx.bumps.get("marketplace").unwrap(),
        vault_bumps,
    };

    Ok(())
}
