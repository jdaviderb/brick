use {
    crate::state::*,
    crate::errors::ErrorCode,
    anchor_lang::prelude::*,
    anchor_spl::{
        token::{close_account, transfer, CloseAccount, Transfer},
        token_interface::{Mint, TokenInterface, TokenAccount},
        token::ID,
    }
};

#[derive(Accounts)]
pub struct WithdrawBonus<'info> {
    #[account(address = ID @ ErrorCode::IncorrectTokenProgram)]
    pub token_program: Interface<'info, TokenInterface>,    
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        seeds = [
            b"governance".as_ref(),
            governance.governance_name.as_ref(),
        ],
        bump = governance.bump,
        has_one = governance_mint @ ErrorCode::IncorrectMint,
        has_one = governance_bonus_vault @ ErrorCode::IncorrectATA,
    )]
    pub governance: Account<'info, Governance>,
    #[account(
        mut,
        seeds = [
            b"bonus".as_ref(),
            signer.key().as_ref(),
        ],
        close = signer,
        bump = bonus.bump,
        constraint = signer.key() == bonus.authority @ ErrorCode::IncorrectAuthority
    )]
    pub bonus: Account<'info, Bonus>,
    /// CHECK: validated in the governance account contraints
    pub governance_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(
        mut,
        seeds = [
            b"governance_bonus_vault".as_ref(),
            governance.key().as_ref(),
        ],
        bump = governance.vault_bump,
        constraint = governance_bonus_vault.owner == governance.key() @ ErrorCode::IncorrectAuthority,
        constraint = governance_bonus_vault.mint == governance_mint.key() @ ErrorCode::IncorrectMint,    
    )]
    pub governance_bonus_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        mut,
        constraint = receiver_vault.owner == bonus.authority @ ErrorCode::IncorrectAuthority,
        constraint = receiver_vault.mint == governance_mint.key() @ ErrorCode::IncorrectMint,    
    )]
    pub receiver_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        mut,
        seeds = [
            b"bonus_vault".as_ref(),
            signer.key().as_ref(),
        ],
        bump = bonus.vault_bump,
        constraint = bonus_vault.owner == bonus.key() @ ErrorCode::IncorrectAuthority,
        constraint = bonus_vault.mint == governance_mint.key() @ ErrorCode::IncorrectMint,
    )]
    pub bonus_vault: Box<InterfaceAccount<'info, TokenAccount>>,
}

pub fn handler<'info>(ctx: Context<WithdrawBonus>) -> Result<()> {

    if ctx.accounts.governance.buyer_promo > 0 && ctx.accounts.governance.seller_promo > 0 {
        return Err(ErrorCode::OpenPromotion.into());
    } 

    let seeds = &[
        b"bonus".as_ref(),
        ctx.accounts.bonus.authority.as_ref(),
        &[ctx.accounts.bonus.bump],
    ];
    
    msg!(
        "{:?} {:?} {:?}" ,
        ctx.accounts.bonus.amount,
        ctx.accounts.governance_bonus_vault.amount,
        ctx.accounts.receiver_vault.amount,
    );

    transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.bonus_vault.to_account_info(),
                to: ctx.accounts.receiver_vault.to_account_info(),
                authority: ctx.accounts.bonus.to_account_info(),
            },
            &[&seeds[..]],
        ),
        ctx.accounts.bonus.amount,
    ).map_err(|_| ErrorCode::TransferError)?;

    msg!(
        "{:?} {:?} {:?}" ,
        ctx.accounts.bonus.amount,
        ctx.accounts.governance_bonus_vault.amount,
        ctx.accounts.receiver_vault.amount,
    );

    close_account(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(), 
            CloseAccount {
                account: ctx.accounts.bonus_vault.to_account_info(),
                destination: ctx.accounts.signer.to_account_info(),
                authority: ctx.accounts.bonus.to_account_info(),
            }, 
            &[&seeds[..]],
        )
    )?;
    
    Ok(())
}