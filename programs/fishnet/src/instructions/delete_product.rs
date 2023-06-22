use {
    crate::state::*,
    crate::errors::ErrorCode,
    anchor_lang::prelude::*,
    anchor_spl::token_interface::TokenInterface
};

#[derive(Accounts)]
pub struct DeleteProduct<'info> {
    pub token_program: Interface<'info, TokenInterface>,
    #[account(mut)]
    pub product_authority: Signer<'info>,
    #[account(
        mut,
        seeds = [
            b"product".as_ref(),
            product.first_id.as_ref(),
            product.second_id.as_ref(),
        ],
        close = product_authority,
        bump = product.bump,
        has_one = product_authority @ ErrorCode::IncorrectAuthority,
    )]
    pub product: Box<Account<'info, Product>>,
}

pub fn handler<'info>(_ctx: Context<DeleteProduct>) -> Result<()> {
    Ok(())
}