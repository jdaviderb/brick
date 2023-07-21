use {
    crate::state::*,
    crate::errors::ErrorCode,
    anchor_lang::{
        prelude::*,
        system_program::System,
    },
    anchor_spl::{
        token_interface::{Mint, MintTo, TokenInterface, TokenAccount},
        token::{transfer, Transfer, ID as TokenProgramV0},
        token_2022::{mint_to, ID as TokenProgram2022},
        associated_token::{AssociatedToken, ID as AssociatedTokenProgram},
    },
};

#[derive(Accounts)]
pub struct RegisterBuy<'info> {
    pub system_program: Program<'info, System>,
    #[account(address = TokenProgramV0 @ ErrorCode::IncorrectTokenProgram, executable)]
    pub token_program_v0: Interface<'info, TokenInterface>,
    #[account(address = TokenProgram2022 @ ErrorCode::IncorrectTokenProgram, executable)]
    pub token_program_22: Interface<'info, TokenInterface>,
    #[account(address = AssociatedTokenProgram @ ErrorCode::IncorrectTokenProgram, executable)]
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        mut,
        seeds = [
            b"marketplace".as_ref(),
            marketplace.authority.as_ref(),
        ],
        bump = marketplace.bumps.bump,
    )]
    pub marketplace: Box<Account<'info, Marketplace>>,
    #[account(
        mut,
        seeds = [
            b"product".as_ref(),
            product.first_id.as_ref(),
            product.second_id.as_ref(),
            product.marketplace.as_ref(),
        ],
        bump = product.bumps.bump,
    )]
    pub product: Box<Account<'info, Product>>,
    #[account(
        mut,
        seeds = [
            b"product_mint".as_ref(),
            product.first_id.as_ref(),
            product.second_id.as_ref(),
            marketplace.key().as_ref(),
        ],
        bump = product.bumps.mint_bump,
        constraint = product_mint.key() == product.product_mint
            @ ErrorCode::IncorrectMint,
    )]    
    pub product_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(
        constraint = payment_mint.key() == product.seller_config.payment_mint
            @ ErrorCode::IncorrectMint,
    )]
    pub payment_mint: Box<InterfaceAccount<'info, Mint>>,
    /// init_if_needed PR fix t2022: https://github.com/coral-xyz/anchor/pull/2541
    /// init_if_needed,
    /// payer = signer,
    /// associated_token::mint = product_mint,
    /// associated_token::authority = signer,
    /// associated_token::token_program = token_program_22,
    #[account(
        mut,
        constraint = buyer_token_vault.owner == signer.key()
            @ ErrorCode::IncorrectAuthority,
        constraint = buyer_token_vault.mint == product_mint.key()
            @ ErrorCode::IncorrectATA,
    )]
    pub buyer_token_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        mut,
        constraint = buyer_transfer_vault.owner == signer.key()
            @ ErrorCode::IncorrectAuthority,
        constraint = buyer_transfer_vault.mint == product.seller_config.payment_mint.key()
            @ ErrorCode::IncorrectATA,
    )]
    pub buyer_transfer_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        mut,
        constraint = seller_transfer_vault.owner == product.authority 
            @ ErrorCode::IncorrectAuthority,
        constraint = seller_transfer_vault.mint == product.seller_config.payment_mint.key()
            @ ErrorCode::IncorrectATA,
    )]
    pub seller_transfer_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    /// ATA that receives fees
    #[account(
        mut,
        constraint = marketplace_transfer_vault.owner == marketplace.authority 
            @ ErrorCode::IncorrectAuthority,
        constraint = marketplace_transfer_vault.mint == payment_mint.key() 
            @ ErrorCode::IncorrectATA,
    )]
    pub marketplace_transfer_vault: Box<InterfaceAccount<'info, TokenAccount>>,
}

pub fn handler<'info>(ctx: Context<RegisterBuy>) -> Result<()> {
    if ctx.accounts.marketplace.fees_config.fee > 0 {
        let (total_fee, seller_amount) = Marketplace::calculate_transfer_distribution(
            ctx.accounts.marketplace.fees_config.clone(),
            ctx.accounts.product.seller_config.payment_mint,
            ctx.accounts.product.seller_config.product_price,
        )?;
        
        transfer(
            CpiContext::new(
                ctx.accounts.token_program_v0.to_account_info(), 
                Transfer {
                    from: ctx.accounts.buyer_transfer_vault.to_account_info(),
                    to: ctx.accounts.marketplace_transfer_vault.to_account_info(),
                    authority: ctx.accounts.signer.to_account_info(),
                },
            ),
            total_fee,
        ).map_err(|_| ErrorCode::TransferError)?;

        transfer(
            CpiContext::new(
                ctx.accounts.token_program_v0.to_account_info(), 
                Transfer {
                    from: ctx.accounts.buyer_transfer_vault.to_account_info(),
                    to: ctx.accounts.seller_transfer_vault.to_account_info(),
                    authority: ctx.accounts.signer.to_account_info(),
                },
            ),
            seller_amount,
        ).map_err(|_| ErrorCode::TransferError)?;
    } else {
        transfer(
            CpiContext::new(
                ctx.accounts.token_program_v0.to_account_info(), 
                Transfer {
                    from: ctx.accounts.buyer_transfer_vault.to_account_info(),
                    to: ctx.accounts.seller_transfer_vault.to_account_info(),
                    authority: ctx.accounts.signer.to_account_info(),
                },
            ),
            ctx.accounts.product.seller_config.product_price,
        ).map_err(|_| ErrorCode::TransferError)?;
    }

    let seeds = &[
        b"product".as_ref(),
        ctx.accounts.product.first_id.as_ref(),
        ctx.accounts.product.second_id.as_ref(),
        ctx.accounts.product.marketplace.as_ref(),
        &[ctx.accounts.product.bumps.bump],
    ];

    mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program_22.to_account_info(),
            MintTo {
                mint: ctx.accounts.product_mint.to_account_info(),
                to: ctx.accounts.buyer_token_vault.to_account_info(),
                authority: ctx.accounts.product.to_account_info(),
            },
            &[&seeds[..]],
        ),
        1
    ).map_err(|_| ErrorCode::MintToError)?;

    Ok(())
}
