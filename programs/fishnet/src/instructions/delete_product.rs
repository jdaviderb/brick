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
    pub product_authority: Signer<'info>,
    #[account(
        mut,
        seeds = [
            b"product".as_ref(),
            product.product_mint.as_ref(),
        ],
        close = product,
        bump = product.bumps.bump,
        has_one = product_authority @ ErrorCode::IncorrectAuthority,
    )]
    pub product: Box<Account<'info, Product>>,
    #[account(
        mut,
        seeds = [
            b"product_mint".as_ref(),
            product.first_id.as_ref(),
            product.second_id.as_ref(),
        ],
        bump = product.bumps.mint_bump,
        constraint = product.product_mint == product_mint.key() @ ErrorCode::IncorrectMint
    )]
    pub product_mint: Box<InterfaceAccount<'info, Mint>>,
}

pub fn handler<'info>(ctx: Context<DeleteProduct>) -> Result<()> {
    let seeds = &[
        b"product".as_ref(),
        ctx.accounts.product.product_mint.as_ref(),
        &[ctx.accounts.product.bumps.bump],
    ];

    close_account(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            CloseAccount {
                account: ctx.accounts.product_mint.to_account_info(),
                destination: ctx.accounts.product_authority.to_account_info(),
                authority: ctx.accounts.product.to_account_info(),
            },
            &[&seeds[..]],
        ),
    )?;
    
    Ok(())
}