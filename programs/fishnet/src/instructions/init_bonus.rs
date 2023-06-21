use {
    crate::state::*,
    crate::errors::ErrorCode,
    anchor_lang::prelude::*,
    anchor_spl::{
        associated_token::AssociatedToken,
        token_interface::{Mint, TokenInterface, TokenAccount},
        token::ID as TokenProgramV0,
    }
};

#[derive(Accounts)]
pub struct InitBonus<'info> {
    pub system_program: Program<'info, System>,
    #[account(address = TokenProgramV0 @ ErrorCode::IncorrectTokenProgram)]
    pub token_program_v0: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        seeds = [
            b"governance".as_ref(),
            governance.governance_name.as_ref(),
        ],
        bump = governance.bump,
        has_one = governance_mint @ ErrorCode::IncorrectMint,
    )]
    pub governance: Account<'info, Governance>,
    #[account(
        init,
        payer = signer,
        space = Bonus::SIZE,
        seeds = [
            b"bonus".as_ref(),
            signer.key().as_ref(),
        ],
        bump,
    )]
    pub bonus: Account<'info, Bonus>,
    #[account(
        init,
        payer = signer,
        seeds = [
            b"bonus_vault".as_ref(),
            signer.key().as_ref(),
        ],
        bump,
        token::mint = governance_mint,
        token::authority = bonus,
        token::token_program = token_program_v0
    )]
    pub bonus_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    /// CHECK: validated in the governance account contraints
    pub governance_mint: Box<InterfaceAccount<'info, Mint>>,
}

pub fn handler<'info>(ctx: Context<InitBonus>,) -> Result<()> {
    (*ctx.accounts.bonus).authority = ctx.accounts.signer.key();
    (*ctx.accounts.bonus).amount = 0;
    (*ctx.accounts.bonus).bump = *ctx.bumps.get("bonus").unwrap();
    (*ctx.accounts.bonus).vault_bump = *ctx.bumps.get("bonus_vault").unwrap();

    Ok(())
}