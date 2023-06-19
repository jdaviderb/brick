use {
    crate::state::*,
    crate::errors::ErrorCode,
    anchor_lang::prelude::*,
};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct EditPointsParams {
    pub fee_basis_points: u16,
    pub promotion_basis_points: u16,
    pub fee_reduction_basis_points: u16
}

#[derive(Accounts)]
pub struct EditPoints<'info> {
    #[account(mut)]
    pub governance_authority: Signer<'info>,
    #[account(
        mut,
        seeds = [
            b"governance".as_ref(),
            governance.governance_name.as_ref(),
        ],
        bump = governance.bump,
        has_one = governance_authority @ ErrorCode::IncorrectAuthority,
    )]
    pub governance: Box<Account<'info, Governance>>,
}

pub fn handler<'info>(
    ctx: Context<EditPoints>, 
    params: EditPointsParams,
) -> Result<()> {
    Governance::validate_basis_points(params.clone())?;

    ctx.accounts.governance.fee_basis_points = params.fee_basis_points;
    ctx.accounts.governance.fee_reduction_basis_points = params.fee_reduction_basis_points;
    ctx.accounts.governance.promotion_basis_points = params.promotion_basis_points;

    Ok(())
}