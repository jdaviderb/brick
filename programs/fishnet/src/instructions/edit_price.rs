use {
    crate::state::*,
    crate::errors::ErrorCode,
    anchor_lang::prelude::*,
};

#[derive(Accounts)]
pub struct EditPrice<'info> {
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
}

pub fn handler<'info>(ctx: Context<EditPrice>, product_price: u64) -> Result<()> {
    (*ctx.accounts.product).seller_config.product_price = product_price;

    Ok(())
}