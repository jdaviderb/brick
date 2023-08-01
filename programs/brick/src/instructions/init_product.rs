use {
    crate::state::*,
    crate::error::ErrorCode,
    crate::utils::mint_builder,
    anchor_lang::prelude::*,
    spl_token_2022::extension::ExtensionType,
    anchor_lang::system_program::System,
    anchor_spl::{
        token_interface::{
            TokenInterface,
            Mint,
            TokenAccount
        },
        token_2022::ID as TokenProgram2022,
    },
};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitProductParams {
    pub first_id: [u8; 32],
    pub second_id: [u8; 32],
    pub product_price: u64,
    pub mint_bump: u8
}

#[derive(Accounts)]
#[instruction(params: InitProductParams)]
pub struct InitProduct<'info> {
    pub system_program: Program<'info, System>,
    #[account(address = TokenProgram2022 @ ErrorCode::IncorrectTokenProgram)]
    pub token_program_2022: Interface<'info, TokenInterface>,
    pub rent: Sysvar<'info, Rent>,
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        mut,
        seeds = [
            b"marketplace".as_ref(),
            marketplace.authority.as_ref(),
        ],
        bump = marketplace.bumps.bump,
    )]
    pub marketplace: Box<Account<'info, Marketplace>>,
    #[account(
        init,
        payer = signer,
        space = PRODUCT_SIZE,
        seeds = [
            b"product".as_ref(),
            params.first_id.as_ref(),
            params.second_id.as_ref(),
            marketplace.key().as_ref(),
        ],
        bump,
    )]
    pub product: Box<Account<'info, Product>>,
    /// CHECK: is init in the instruction logic
    #[account(
        mut,
        seeds = [
            b"product_mint".as_ref(),
            params.first_id.as_ref(),
            params.second_id.as_ref(),
            marketplace.key().as_ref(),
        ],
        bump = params.mint_bump,
    )]    
    pub product_mint: AccountInfo<'info>,
    pub payment_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(
        mut,
        seeds = [
            b"access_mint".as_ref(),
            marketplace.key().as_ref(),
        ],
        bump = marketplace.bumps.access_mint_bump,
        constraint = access_mint.key() == marketplace.permission_config.access_mint
            @ ErrorCode::IncorrectMint
    )]    
    pub access_mint: Option<Box<InterfaceAccount<'info, Mint>>>,
    #[account(
        mut,
        constraint = access_vault.mint == marketplace.permission_config.access_mint
            @ ErrorCode::IncorrectMint
    )]    
    pub access_vault: Option<Box<InterfaceAccount<'info, TokenAccount>>>,
}

pub fn handler<'info>(ctx: Context<InitProduct>, params: InitProductParams) -> Result<()> {
    if !ctx.accounts.marketplace.permission_config.permissionless {
        let access_vault = ctx.accounts.access_vault.as_ref()
            .ok_or(ErrorCode::OptionalAccountNotProvided)?;

        if access_vault.amount == 0 {
            return Err(ErrorCode::NotInWithelist.into());
        }
    }
    let marketplace_key = ctx.accounts.marketplace.key();

    (*ctx.accounts.product).authority = ctx.accounts.signer.key();
    (*ctx.accounts.product).first_id = params.first_id;
    (*ctx.accounts.product).second_id = params.second_id; 
    (*ctx.accounts.product).marketplace = marketplace_key;
    (*ctx.accounts.product).product_mint = ctx.accounts.product_mint.key();

    (*ctx.accounts.product).seller_config = SellerConfig {
        payment_mint: ctx.accounts.payment_mint.key(),
        product_price: params.product_price,
    };
    (*ctx.accounts.product).bumps = ProductBumps {
        bump: *ctx.bumps.get("product").unwrap(),
        mint_bump: params.mint_bump,
    };

    // validate product_mint pda
    let mint_seeds = &[
        b"product_mint".as_ref(),
        ctx.accounts.product.first_id.as_ref(),
        ctx.accounts.product.second_id.as_ref(),
        marketplace_key.as_ref(),
    ];
    let (account_address, nonce) = Pubkey::find_program_address(mint_seeds, &ctx.program_id.key());
    if account_address != ctx.accounts.product_mint.key() {
        msg!(
            "Create account with PDA: {:?} was requested while PDA: {:?} was expected",
            ctx.accounts.product_mint.key(),
            account_address,
        );
        return Err(ErrorCode::IncorrectSeeds.into());
    }

    let mut signer_mint_seeds = mint_seeds.to_vec();
    let bump = &[nonce];
    signer_mint_seeds.push(bump);

    let product_seeds = &[
        b"product".as_ref(),
        ctx.accounts.product.product_mint.as_ref(),
        &[ctx.accounts.product.bumps.bump],
    ];

    let extensions = if ctx.accounts.marketplace.token_config.transferable {
        vec![]
    } else {
        vec![ExtensionType::NonTransferable]
    };

    mint_builder(
        signer_mint_seeds,
        product_seeds.to_vec(),
        extensions,
        ctx.accounts.system_program.to_account_info(),
        ctx.accounts.token_program_2022.to_account_info(),
        ctx.accounts.rent.to_account_info(),
        ctx.accounts.product_mint.to_account_info(),
        ctx.accounts.product.to_account_info(),
        ctx.accounts.signer.to_account_info(),
        ctx.accounts.rent.clone(),
    )?;

    Ok(())
}
