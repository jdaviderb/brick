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
        seeds = ["governance".as_ref()],
        bump = governance.bump,
        has_one = governance_authority @ ErrorCode::IncorrectAuthority,
    )]
    pub governance: Box<Account<'info, Governance>>,
}

pub fn handler<'info>(
    ctx: Context<EditPoints>, 
    params: EditPointsParams,
) -> Result<()> {
    if params.fee_reduction > 10000 || params.fee > 10000 || params.seller_promo > 10000 || params.buyer_promo > 10000 {
        return Err(ErrorCode::IncorrectFee.into());
    }
    
    (*ctx.accounts.governance).fee = params.fee;
    (*ctx.accounts.governance).fee_reduction = params.fee_reduction;
    (*ctx.accounts.governance).seller_promo = params.seller_promo;
    (*ctx.accounts.governance).buyer_promo = params.buyer_promo;

    Ok(())
}