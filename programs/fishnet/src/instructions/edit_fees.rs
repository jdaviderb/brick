use {
    crate::state::*,
    crate::errors::ErrorCode,
    anchor_lang::prelude::*,
};

#[derive(Accounts)]
pub struct EditFees<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [
            b"app".as_ref(),
            app.app_name.as_bytes(),
        ],
        bump = app.bump,
        constraint = app.authority == authority.key() @ ErrorCode::IncorrectTokenAuthority
    )]
    pub app: Box<Account<'info, App>>,
}

pub fn handler<'info>(
    ctx: Context<EditFees>, 
    fee_basis_points: u16,
) -> Result<()> {
    if fee_basis_points > 10000 {
        return Err(ErrorCode::IncorrectFee.into());
    }

    (*ctx.accounts.app).fee_basis_points = fee_basis_points;

    Ok(())
}