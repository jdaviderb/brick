use {
    crate::state::*,
    crate::errors::ErrorCode,
    anchor_lang::prelude::*,
    anchor_spl::{
        token_interface::{Mint, TokenInterface, TokenAccount},
        token::{close_account, transfer, Transfer, CloseAccount},
    }
};

#[derive(Accounts)]
pub struct Refund<'info> {
    pub token_program: Interface<'info, TokenInterface>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [
            b"token_config".as_ref(),
            token_config.token_mint.as_ref(),
        ],
        bump = token_config.bumps.bump
    )]
    pub token_config: Box<Account<'info, TokenConfig>>,
    #[account(
        mut,
        seeds = [
            b"token_mint".as_ref(),
            token_config.first_id.as_ref(),
            token_config.second_id.as_ref(),
        ],
        bump = token_config.bumps.mint_bump
    )]
    pub token_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(
        mut,
        constraint = receiver_vault.mint == token_config.seller_config.payment_mint @ ErrorCode::IncorrectReceiverTokenAccount
    )]
    pub receiver_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        mut,
        seeds = [
            b"payment_account".as_ref(),
            token_mint.key().as_ref(),
            payment_account.buyer.as_ref(),
            payment_account.payment_timestamp.to_le_bytes().as_ref(),
        ],
        bump = payment_account.bump,
        constraint = authority.key() == payment_account.buyer @ ErrorCode::IncorrectPaymentAuthority,
        close = authority,
    )]
    pub payment_account: Account<'info, Payment>,
    #[account(
        mut,
        seeds = [
            b"payment_vault".as_ref(),
            payment_account.key().as_ref(),
        ],
        bump = payment_account.bump_vault,
        constraint = payment_vault.owner == payment_account.key() && payment_vault.mint == token_config.seller_config.payment_mint.key() @ ErrorCode::IncorrectPaymentVault,
    )]
    pub payment_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        mut,
        constraint = buyer_token_vault.mint == token_mint.key() @ ErrorCode::IncorrectBuyerTokenAccountToStorePurchasedToken
    )]
    pub buyer_token_vault: Box<InterfaceAccount<'info, TokenAccount>>, // buyer token account to store the token
}

pub fn handler<'info>(ctx: Context<Refund>) -> Result<()> {
    let clock = Clock::get()?;
    if ctx.accounts.payment_account.refund_consumed_at < clock.unix_timestamp as u64 {
        return Err(ErrorCode::TimeForRefundHasConsumed.into());
    }

    let payment_timestamp = ctx.accounts.payment_account.payment_timestamp.to_le_bytes();
    let seeds = &[
        b"payment_account".as_ref(),
        ctx.accounts.payment_account.token_mint.as_ref(),
        ctx.accounts.payment_account.buyer.as_ref(),
        payment_timestamp.as_ref(),
        &[ctx.accounts.payment_account.bump],
    ];

    transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.payment_vault.to_account_info(),
                to: ctx.accounts.receiver_vault.to_account_info(),
                authority: ctx.accounts.payment_account.to_account_info(),
            },
            &[&seeds[..]],
        ),
        ctx.accounts.payment_account.token_price.into(),
    )?;

    close_account(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(), 
            CloseAccount {
                account: ctx.accounts.payment_vault.to_account_info(),
                destination: ctx.accounts.authority.to_account_info(),
                authority: ctx.accounts.payment_account.to_account_info(),
            }, 
            &[&seeds[..]],
        )
    )?;
    
    (*ctx.accounts.token_config).active_payments -= 1;

    Ok(())
}