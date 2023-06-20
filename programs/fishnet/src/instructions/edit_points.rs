use {
    crate::state::*,
    crate::errors::ErrorCode,
    anchor_lang::prelude::*,
};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct EditPointsParams {
    pub fee: u16,
    pub fee_reduction: u16,
    pub seller_promo: u16,
    pub buyer_promo: u16
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

    (*ctx.accounts.governance).fee = params.fee;
    (*ctx.accounts.governance).fee_reduction = params.fee_reduction;
    (*ctx.accounts.governance).seller_promo = params.seller_promo;
    (*ctx.accounts.governance).buyer_promo = params.buyer_promo;

    Ok(())
}