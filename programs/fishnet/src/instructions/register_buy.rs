use {
    crate::state::*,
    crate::errors::ErrorCode,
    anchor_lang::{
        prelude::*,
        system_program::System,
    },
    anchor_spl::{
        associated_token::AssociatedToken,
        token::{transfer, Transfer},
        token_2022::{mint_to, burn, close_account},
        token_interface::{Mint, MintTo, TokenInterface, TokenAccount, Burn, CloseAccount},
    }
};

#[derive(Accounts)]
#[instruction(timestamp: u64)]
pub struct RegisterBuy<'info> {
    pub system_program: Program<'info, System>,
    pub token_program_v0: Interface<'info, TokenInterface>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
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
        init,
        payer = authority,
        space = Payment::SIZE,
        seeds = [
            b"payment_account".as_ref(),
            token_mint.key().as_ref(),
            authority.key().as_ref(),
            timestamp.to_le_bytes().as_ref(),
        ],
        bump,
    )]
    pub payment_account: Account<'info, Payment>,
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
    #[account(
        constraint = payment_mint.key() == token_config.seller_config.payment_mint.key() @ ErrorCode::IncorrectPaymentToken
    )]
    pub payment_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(
        init,
        payer = authority,
        seeds = [
            b"payment_vault".as_ref(),
            payment_account.key().as_ref(),
        ],
        bump,
        token::mint = payment_mint,
        token::authority = payment_account,
        token::token_program = token_program_v0
    )]
    pub payment_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        mut,
        constraint = buyer_transfer_vault.mint == token_config.seller_config.payment_mint.key() @ ErrorCode::IncorrectBuyerTokenAccountOnTransfer,
        token::token_program = token_program_v0,
    )]
    pub buyer_transfer_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        init,
        payer = authority,
        associated_token::mint = token_mint,
        associated_token::authority = authority,
        token::token_program = token_program
    )]
    pub buyer_token_vault: Box<InterfaceAccount<'info, TokenAccount>>,
}

pub fn handler<'info>(ctx: Context<RegisterBuy>, timestamp: u64) -> Result<()> {
    (*ctx.accounts.payment_account).token_mint = ctx.accounts.token_mint.key();
    (*ctx.accounts.payment_account).paid_mint = ctx.accounts.payment_mint.key();
    (*ctx.accounts.payment_account).seller = ctx.accounts.token_config.authority;
    (*ctx.accounts.payment_account).buyer = ctx.accounts.authority.key();
    (*ctx.accounts.payment_account).token_price = ctx.accounts.token_config.seller_config.token_price;
    (*ctx.accounts.payment_account).payment_timestamp = timestamp;
    (*ctx.accounts.payment_account).refund_consumed_at = ctx.accounts.token_config.seller_config.refund_timespan + timestamp;
    (*ctx.accounts.payment_account).bump = *ctx.bumps.get("payment_account").unwrap();
    (*ctx.accounts.payment_account).bump_vault = *ctx.bumps.get("payment_vault").unwrap();
    (*ctx.accounts.token_config).active_payments += 1;

    let seeds = &[
        b"token_config".as_ref(),
        ctx.accounts.token_config.token_mint.as_ref(),
        &[ctx.accounts.token_config.bumps.bump],
    ];

    transfer(
        CpiContext::new(
            ctx.accounts.token_program_v0.to_account_info(),
            Transfer {
                from: ctx.accounts.buyer_transfer_vault.to_account_info(),
                to: ctx.accounts.payment_vault.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            },
        ),
        ctx.accounts.token_config.seller_config.token_price.into(),
    )?;

    mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.token_mint.to_account_info(),
                to: ctx.accounts.buyer_token_vault.to_account_info(),
                authority: ctx.accounts.token_config.to_account_info(),
            },
            &[&seeds[..]],
        ),
        1
    )?;

    burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                authority: ctx.accounts.authority.to_account_info(),
                from: ctx.accounts.buyer_token_vault.to_account_info(),
                mint: ctx.accounts.token_mint.to_account_info(),
            },
        ),
        1,
    )?;

    close_account(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            CloseAccount {
                account: ctx.accounts.buyer_token_vault.to_account_info(),
                destination: ctx.accounts.authority.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            },
        ),
    )?;

    Ok(())
}