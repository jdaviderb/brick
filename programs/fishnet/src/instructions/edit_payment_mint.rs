use {
    crate::state::*,
    crate::errors::ErrorCode,
    anchor_lang::prelude::*,
    anchor_spl::token_interface::Mint
};

#[derive(Accounts)]
pub struct EditPaymentMint<'info> {
    #[account(mut)]
    pub product_authority: Signer<'info>,
    #[account(
        mut,
        seeds = [
            b"product".as_ref(),
            product.product_mint.as_ref()
        ], 
        bump = product.bumps.bump,
        has_one = product_authority @ ErrorCode::IncorrectAuthority
    )]
    pub product: Box<Account<'info, Product>>,
    /// CHECK: no need to validate, seller is the unique wallet who can call this instruction
    pub payment_mint: Box<InterfaceAccount<'info, Mint>>,
}

pub fn handler<'info>(ctx: Context<EditPaymentMint>) -> Result<()> {
    (*ctx.accounts.product).seller_config.payment_mint = ctx.accounts.payment_mint.key();

    Ok(())
}