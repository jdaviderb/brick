use {
    crate::state::*,
    anchor_lang::{
        prelude::*,
        system_program::System,
    },
    anchor_spl::token_interface::Mint,
};

#[derive(Accounts)]
pub struct CreateConfig<'info> {
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: the mint will be created in the create_product ix.
    pub token_mint: UncheckedAccount<'info>,
    #[account(
        seeds = [
            b"app".as_ref(),
            app.app_name.as_bytes()
        ],
        bump = app.bump,
    )]
    pub app: Account<'info, App>,
    #[account(
        init,
        payer = authority,
        space = TokenConfig::SIZE,
        seeds = [
            b"token_config".as_ref(),
            token_mint.key().as_ref(),
        ],
        bump,
    )]
    pub token_config: Box<Account<'info, TokenConfig>>,
    pub payment_mint: Box<InterfaceAccount<'info, Mint>>,
}

pub fn handler<'info>(
    ctx: Context<CreateConfig>,
    first_id: [u8; 32],
    second_id: [u8; 32],
    refund_timespan: u64,
    token_price: u64,
    exemplars: i32,
    mint_bump: u8
) -> Result<()> {
    (*ctx.accounts.token_config).first_id = first_id;
    (*ctx.accounts.token_config).second_id = second_id;
    (*ctx.accounts.token_config).app_pubkey = ctx.accounts.app.key();
    (*ctx.accounts.token_config).token_mint = ctx.accounts.token_mint.key();
    (*ctx.accounts.token_config).authority = ctx.accounts.authority.key();
    (*ctx.accounts.token_config).active_payments = 0;
    (*ctx.accounts.token_config).seller_config = SellerConfig {
        refund_timespan,
        payment_mint: ctx.accounts.payment_mint.key(),
        token_price,
        exemplars,
    };
    (*ctx.accounts.token_config).bumps = Bumps {
        bump: *ctx.bumps.get("token_config").unwrap(),
        mint_bump, // will be set in the create_product ix
    };

    Ok(())
}
