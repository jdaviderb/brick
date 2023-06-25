use {
    crate::state::*,
    anchor_lang::prelude::*,
    crate::errors::ErrorCode,
    anchor_spl::{
        token_interface::{Mint, TokenAccount, TokenInterface},
        token::ID as TokenProgramV0,
    },
};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateGovernanceParams {
    pub fee: u16,
    pub fee_reduction: u16,
    pub seller_promo: u16,
    pub buyer_promo: u16,
}

#[derive(Accounts)]
#[instruction(params: CreateGovernanceParams)]
pub struct CreateGovernance<'info> {
    pub system_program: Program<'info, System>,
    #[account(address = TokenProgramV0 @ ErrorCode::IncorrectTokenProgram)]
    pub token_program: Interface<'info, TokenInterface>,
    pub rent: Sysvar<'info, Rent>,
    #[account(mut)]
    pub governance_authority: Signer<'info>,
    #[account(
        init,
        payer = governance_authority,
        space = Governance::SIZE,
        seeds = [b"governance".as_ref()],
        bump,
    )]
    pub governance: Account<'info, Governance>,
    pub governance_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(
        init,
        payer = governance_authority,
        seeds = [b"governance_bonus_vault".as_ref()],
        bump,
        token::mint = governance_mint,
        token::authority = governance,
    )]
    pub governance_bonus_vault: Box<InterfaceAccount<'info, TokenAccount>>,
}

pub fn handler<'info>(ctx: Context<CreateGovernance>, params: CreateGovernanceParams) -> Result<()> {
    // this validation make that only the Fishnet account can be created
    if params.fee_reduction > 10000 || params.fee > 10000 || params.seller_promo > 10000 || params.buyer_promo > 10000 {
        return Err(ErrorCode::IncorrectFee.into());
    }

    (*ctx.accounts.governance).governance_authority = ctx.accounts.governance_authority.key();
    (*ctx.accounts.governance).governance_mint = ctx.accounts.governance_mint.key();
    (*ctx.accounts.governance).governance_bonus_vault = ctx.accounts.governance_bonus_vault.key();
    (*ctx.accounts.governance).fee = params.fee;
    (*ctx.accounts.governance).fee_reduction = params.fee_reduction;
    (*ctx.accounts.governance).seller_promo = params.seller_promo;
    (*ctx.accounts.governance).buyer_promo = params.buyer_promo;
    (*ctx.accounts.governance).bump = *ctx.bumps.get("governance").unwrap();
    (*ctx.accounts.governance).vault_bump = *ctx.bumps.get("governance_bonus_vault").unwrap();

    Ok(())
}
