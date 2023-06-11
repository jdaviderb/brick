use {
    crate::state::*,
    crate::utils::get_withdraw_amounts,
    crate::errors::ErrorCode,
    anchor_lang::prelude::*,
    anchor_spl::{
        associated_token::AssociatedToken,
        token_interface::{Mint, TokenInterface, TokenAccount},
        token::{close_account, transfer, Transfer, CloseAccount},
    }};

#[derive(Accounts)]
pub struct WithdrawFunds<'info> {
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [
            b"token_config".as_ref(),
            token_config.token_mint.as_ref(),
        ],
        bump = token_config.bumps.bump,
        constraint = app_creator_vault.owner == app.authority 
            @ ErrorCode::InconrrectCreatorAccount
    )]
    pub token_config: Box<Account<'info, TokenConfig>>,
    #[account(
        mut,
        seeds = [
            b"payment_account".as_ref(),
            token_mint.key().as_ref(),
            payment_account.buyer.as_ref(),
            payment_account.payment_timestamp.to_le_bytes().as_ref(),
        ],
        bump = payment_account.bump,
        close = buyer,
        constraint = authority.key() == payment_account.seller 
            @ ErrorCode::IncorrectPaymentAuthority,
    )]
    pub payment_account: Account<'info, Payment>,
    #[account(
        seeds = [
            b"app".as_ref(),
            app.app_name.as_bytes()
        ],
        bump = app.bump,
        constraint = app.key() == token_config.app_pubkey 
            @ ErrorCode::InconrrectAppAccount
    )]
    pub app: Account<'info, App>,
    #[account(
        mut,
        seeds = [
            b"token_mint".as_ref(),
            token_config.first_id.as_ref(),
            token_config.second_id.as_ref(),             
        ],
        bump = token_config.bumps.mint_bump,
        constraint = token_mint.key() == token_config.token_mint
            @ ErrorCode::IncorrectMint,

    )]
    pub token_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(
        constraint = payment_mint.key() == token_config.seller_config.payment_mint.key() 
            @ ErrorCode::IncorrectPaymentToken
    )]
    pub payment_mint: Box<InterfaceAccount<'info, Mint>>,
    /// CHECK: there is a constraint that confirms if this account is the buyer account, 
    /// only is used to send the rent from closing payment account
    #[account(
        mut, 
        constraint = payment_account.buyer == buyer.key()
    )]
    pub buyer: AccountInfo<'info>,
    /// CHECK: there is a constraint that confirms if this account is the creator account, 
    /// only is used to send the fee of the transaction
    #[account(
        mut, 
        constraint = app.authority == app_creator.key()
    )]
    pub app_creator: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [
            b"payment_vault".as_ref(),
            payment_account.key().as_ref(),
        ],
        bump = payment_account.bump_vault,
        constraint = payment_vault.owner == payment_account.key() 
            && payment_vault.mint == token_config.seller_config.payment_mint.key() 
            @ ErrorCode::IncorrectPaymentVault,
    )]
    pub payment_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        init_if_needed,
        payer = authority, 
        associated_token::mint = payment_mint, 
        associated_token::authority = app_creator,
        constraint = app_creator_vault.mint.key() == token_config.seller_config.payment_mint 
            @ ErrorCode::IncorrectReceiverTokenAccount, 
    )]
    pub app_creator_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        init_if_needed,
        payer = authority, 
        associated_token::mint = payment_mint, 
        associated_token::authority = authority,
        constraint = receiver_vault.mint.key() == token_config.seller_config.payment_mint 
            @ ErrorCode::IncorrectReceiverTokenAccount, 
    )]
    pub receiver_vault: Box<InterfaceAccount<'info, TokenAccount>>,
}

pub fn handler<'info>(ctx: Context<WithdrawFunds>) -> Result<()> {
    let clock = Clock::get()?;

    if ctx.accounts.payment_account.refund_consumed_at > clock.unix_timestamp as u64 {
        return Err(ErrorCode::CannotWithdrawYet.into());
    }
    
    let payment_timestamp = ctx.accounts.payment_account.payment_timestamp.to_le_bytes();
    let seeds = &[
        b"payment_account".as_ref(),
        ctx.accounts.payment_account.token_mint.as_ref(),
        ctx.accounts.payment_account.buyer.as_ref(),
        payment_timestamp.as_ref(),
        &[ctx.accounts.payment_account.bump],
    ];
    
    if ctx.accounts.app.fee_basis_points > 0 {
        let (total_fee, seller_amount) = get_withdraw_amounts(
            ctx.accounts.app.fee_basis_points,
            ctx.accounts.payment_account.token_price,
        )?;
    
        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.payment_vault.to_account_info(),
                    to: ctx.accounts.app_creator_vault.to_account_info(),
                    authority: ctx.accounts.payment_account.to_account_info(),
                },
                &[&seeds[..]],
            ),
            total_fee,
        )?;
    
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
            seller_amount,
        )?;
    } else {
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
    }
    
    close_account(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(), 
            CloseAccount {
                account: ctx.accounts.payment_vault.to_account_info(),
                destination: ctx.accounts.buyer.to_account_info(),
                authority: ctx.accounts.payment_account.to_account_info(),
            }, 
            &[&seeds[..]],
        )
    )?;
    
    (*ctx.accounts.token_config).active_payments -= 1;

    Ok(())
}