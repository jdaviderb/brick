use {
    crate::state::*,
    crate::errors::ErrorCode,
    anchor_lang::prelude::*,
};

#[derive(Accounts)]
pub struct EditPrice<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [
            b"token_config".as_ref(),
            token_config.token_mint.as_ref()
        ], 
        bump = token_config.bumps.bump,
        constraint = token_config.authority == authority.key() @ ErrorCode::IncorrectTokenAuthority
    )]
    pub token_config: Box<Account<'info, TokenConfig>>,
}

pub fn handler<'info>(ctx: Context<EditPrice>, token_price: u64) -> Result<()> {
    (*ctx.accounts.token_config).seller_config.token_price = token_price;

    Ok(())
}