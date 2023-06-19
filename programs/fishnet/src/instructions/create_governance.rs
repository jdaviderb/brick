use {
    crate::state::*,
    anchor_lang::prelude::*,
    crate::errors::ErrorCode,
    anchor_spl::{
        token_interface::{Mint, TokenInterface, TokenAccount},
        mint::USDC,
        token::ID as TokenProgramV0
    },
};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateGovernanceParams {
    pub governance_name: [u8; 7],
    pub fee_basis_points: u16,
    pub promotion_basis_points: u16,
    pub fee_reduction_basis_points: u16
}

#[derive(Accounts)]
#[instruction(app_name: String)]
pub struct CreateGovernance<'info> {
    pub system_program: Program<'info, System>,
    #[account(address = TokenProgramV0 @ ErrorCode::IncorrectTokenProgram)]
    pub token_program_v0: Interface<'info, TokenInterface>,
    pub rent: Sysvar<'info, Rent>,
    #[account(mut)]
    pub governance_authority: Signer<'info>,
    #[account(
        init,
        payer = governance_authority,
        space = Governance::SIZE,
        seeds = [
            b"governance".as_ref(),
            app_name.as_bytes(),
        ],
        bump,
    )]
    pub governance: Account<'info, Governance>,
    pub governance_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(
        constraint = governance_token_vault.mint == governance_mint.key() @ ErrorCode::IncorrectATA,
    )]
    pub governance_token_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        constraint = governance_usdc_vault.mint == USDC @ ErrorCode::IncorrectATA,
    )]
    pub governance_usdc_vault: Box<InterfaceAccount<'info, TokenAccount>>,
}

pub fn handler<'info>(ctx: Context<CreateGovernance>, params: CreateGovernanceParams) -> Result<()> {
    // this validation make that only the Fishnet account can be created
    Governance::validate_account(params.clone())?;

    (*ctx.accounts.governance).governance_name = params.governance_name;
    (*ctx.accounts.governance).governance_authority = ctx.accounts.governance_authority.key();
    (*ctx.accounts.governance).governance_mint = ctx.accounts.governance_mint.key();
    (*ctx.accounts.governance).governance_token_vault = ctx.accounts.governance_token_vault.key();
    (*ctx.accounts.governance).governance_usdc_vault = ctx.accounts.governance_usdc_vault.key();
    (*ctx.accounts.governance).fee_basis_points = params.fee_basis_points;
    (*ctx.accounts.governance).fee_reduction_basis_points = params.fee_reduction_basis_points;
    (*ctx.accounts.governance).promotion_basis_points = params.promotion_basis_points;
    (*ctx.accounts.governance).bump = *ctx.bumps.get("app").unwrap();
    
    Ok(())
}
