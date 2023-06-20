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
    pub governance_name: [u8; 7],
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
            params.governance_name.as_ref(),
        ],
        bump,
    )]
    pub governance: Account<'info, Governance>,
    pub governance_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(
        init,
        payer = governance_authority,
        seeds = [
            b"governance_token_vault".as_ref(),
            governance.key().as_ref(),
        ],
        bump,
        token::mint = governance_mint,
        token::authority = governance,
        token::token_program = token_program_v0,
    )]
    pub governance_token_vault: Box<InterfaceAccount<'info, TokenAccount>>,
}

pub fn handler<'info>(ctx: Context<CreateGovernance>, params: CreateGovernanceParams) -> Result<()> {
    // this validation make that only the Fishnet account can be created
    Governance::validate_params(params.clone())?;

    (*ctx.accounts.governance).governance_name = params.governance_name;
    (*ctx.accounts.governance).governance_authority = ctx.accounts.governance_authority.key();
    (*ctx.accounts.governance).governance_mint = ctx.accounts.governance_mint.key();
    (*ctx.accounts.governance).governance_token_vault = ctx.accounts.governance_token_vault.key();
    (*ctx.accounts.governance).fee = params.fee;
    (*ctx.accounts.governance).fee_reduction = params.fee_reduction;
    (*ctx.accounts.governance).seller_promo = params.seller_promo;
    (*ctx.accounts.governance).buyer_promo = params.buyer_promo;
    (*ctx.accounts.governance).bump = *ctx.bumps.get("governance").unwrap();
    (*ctx.accounts.governance).vault_bump = *ctx.bumps.get("governance_token_vault").unwrap();

    Ok(())
}
