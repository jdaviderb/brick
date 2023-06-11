use {
    crate::state::*,
    crate::errors::ErrorCode,
    anchor_lang::prelude::*,
    anchor_spl::{
        token_interface::{Mint, TokenInterface},
        token_2022::{close_account, CloseAccount}
    }
};

#[derive(Accounts)]
pub struct DeleteProduct<'info> {
    pub token_program: Interface<'info, TokenInterface>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [
            b"token_config".as_ref(),
            token_config.token_mint.as_ref(),
        ],
        close = authority,
        bump = token_config.bumps.bump,
        constraint = token_config.authority == authority.key() @ ErrorCode::IncorrectTokenAuthority
    )]
    pub token_config: Box<Account<'info, TokenConfig>>,
    #[account(
        mut,
        seeds = [
            b"token_mint".as_ref(),
            token_config.first_id.as_ref(),
            token_config.second_id.as_ref(),
        ],
        bump = token_config.bumps.mint_bump,
        constraint = token_config.token_mint == token_mint.key() @ ErrorCode::IncorrectReceiverTokenAccount
    )]
    pub token_mint: Box<InterfaceAccount<'info, Mint>>,
}

pub fn handler<'info>(ctx: Context<DeleteProduct>) -> Result<()> {
    if ctx.accounts.token_config.active_payments > 0 {
        return Err(ErrorCode::CannotCloseProduct.into());
    }

    let seeds = &[
        b"token_config".as_ref(),
        ctx.accounts.token_config.token_mint.as_ref(),
        &[ctx.accounts.token_config.bumps.bump],
    ];

    close_account(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            CloseAccount {
                account: ctx.accounts.token_mint.to_account_info(),
                destination: ctx.accounts.authority.to_account_info(),
                authority: ctx.accounts.token_config.to_account_info(),
            },
            &[&seeds[..]],
        ),
    )?;
    
    Ok(())
}