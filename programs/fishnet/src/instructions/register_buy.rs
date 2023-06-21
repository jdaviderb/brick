use {
    crate::state::*,
    crate::errors::ErrorCode,
    anchor_lang::{
        prelude::*,
        system_program::System,
    },
    anchor_spl::{
        associated_token::AssociatedToken,
        token_interface::{Mint, TokenInterface, TokenAccount, MintTo, Burn, CloseAccount},
        token::{transfer, Transfer},
        token_2022::{mint_to, burn, close_account, ID as TokenProgram2022},
        token::ID as TokenProgramV0,
    }
};

#[derive(Accounts)]
pub struct RegisterBuy<'info> {
    pub system_program: Program<'info, System>,
    #[account(address = TokenProgramV0 @ ErrorCode::IncorrectTokenProgram)]
    pub token_program_v0: Interface<'info, TokenInterface>,
    #[account(address = TokenProgram2022 @ ErrorCode::IncorrectTokenProgram)]
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
    /// CHECK: validated in the governance account contraints
    /// WHEN DEPLOYED ADD #[account(address =  @ ErrorCode::)]
    pub governance_authority: AccountInfo<'info>,
    /// CHECK: validated in the product account contraints
    pub product_authority: AccountInfo<'info>,
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        seeds = [
            b"governance".as_ref(),
            governance.governance_name.as_ref(),
        ],
        bump = governance.bump,
        has_one = governance_authority @ ErrorCode::IncorrectAuthority,
        has_one = governance_mint @ ErrorCode::IncorrectMint,
    )]
    pub governance: Account<'info, Governance>,
    #[account(
        seeds = [
            b"product".as_ref(),
            product_mint.key().as_ref(),
        ],
        bump = product.bumps.bump,
        has_one = product_mint @ ErrorCode::IncorrectMint,
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
    )]
    pub product_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(
        mut,
        constraint = payment_mint.key() == product.seller_config.payment_mint
            @ ErrorCode::IncorrectMint,
    )]
    pub payment_mint: Box<InterfaceAccount<'info, Mint>>,
    /// CHECK: validated in the governance account contraints
    pub governance_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(
        init,
        payer = signer,
        associated_token::mint = product_mint,
        associated_token::authority = signer,
        token::token_program = token_program
    )]
    pub buyer_token_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        mut,
        constraint = buyer_transfer_vault.owner == signer.key()
            @ ErrorCode::IncorrectAuthority,
        constraint = buyer_transfer_vault.mint == payment_mint.key()
            @ ErrorCode::IncorrectATA,
    )]
    pub buyer_transfer_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        mut,
        constraint = product_authority_transfer_vault.owner == product.product_authority 
            @ ErrorCode::IncorrectAuthority,
        constraint = product_authority_transfer_vault.mint == payment_mint.key()
            @ ErrorCode::IncorrectATA,
    )]
    pub product_authority_transfer_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    /// ATA that receives fees
    #[account(
        mut,
        constraint = governance_transfer_vault.owner == governance.governance_authority 
            @ ErrorCode::IncorrectAuthority,
        constraint = governance_transfer_vault.mint == payment_mint.key() 
            @ ErrorCode::IncorrectATA,
    )]
    pub governance_transfer_vault: Box<InterfaceAccount<'info, TokenAccount>>,
}

pub fn handler<'info>(ctx: Context<RegisterBuy>) -> Result<()> {
    if ctx.accounts.governance.fee > 0 {
        let (total_fee, seller_amount) = calculate_transfer_distribution(
            ctx.accounts.governance.fee,
            ctx.accounts.governance.fee_reduction,
            ctx.accounts.governance.governance_mint,
            ctx.accounts.product.seller_config.payment_mint,
            ctx.accounts.product.seller_config.product_price,
        )?;
        transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(), 
                Transfer {
                    from: ctx.accounts.buyer_transfer_vault.to_account_info(),
                    to: ctx.accounts.governance_transfer_vault.to_account_info(),
                    authority: ctx.accounts.signer.to_account_info(),
                },
            ),
            total_fee,
        ).map_err(|_| ErrorCode::TransferError)?;

        transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(), 
                Transfer {
                    from: ctx.accounts.buyer_transfer_vault.to_account_info(),
                    to: ctx.accounts.product_authority_transfer_vault.to_account_info(),
                    authority: ctx.accounts.signer.to_account_info(),
                },
            ),
            seller_amount,
        ).map_err(|_| ErrorCode::TransferError)?;
    } else {
        transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(), 
                Transfer {
                    from: ctx.accounts.buyer_transfer_vault.to_account_info(),
                    to: ctx.accounts.product_authority_transfer_vault.to_account_info(),
                    authority: ctx.accounts.signer.to_account_info(),
                },
            ),
            ctx.accounts.product.seller_config.product_price,
        ).map_err(|_| ErrorCode::TransferError)?;
    }

    mint_and_burn(
        ctx.accounts.token_program.to_account_info(),
        ctx.accounts.signer.to_account_info(),
        ctx.accounts.product.to_account_info(),
        ctx.accounts.product_mint.to_account_info(),
        ctx.accounts.buyer_token_vault.to_account_info(),
        ctx.accounts.product.bumps.bump
    )?;

    Ok(())
}

/// This function calculates the distribution of the token amount taking into account the fee and a potential fee reduction.
/// The fee is adjusted in case the payment mint is the same as the governance mint.
/// 
/// # Arguments
/// 
/// * `fee` - The initial fee for the transaction.
/// * `fee_reduction` - The reduction to apply to the fee in case the payment mint is the governance mint.
/// * `governance_mint` - The mint associated with the governance.
/// * `payment_mint` - The mint associated with the payment.
/// * `product_price` - The price of the product being sold.
/// 
/// # Returns
/// 
/// A Result with a tuple containing the total fee and the seller amount, or an ErrorCode.
fn calculate_transfer_distribution(
    fee: u16,
    fee_reduction: u16, 
    governance_mint: Pubkey,
    payment_mint: Pubkey, 
    product_price: u64
) -> std::result::Result<(u64, u64), ErrorCode> {
    // Adjust fee if the payment mint is the same as the governance mint
    let adjusted_fee_basis_points: u16 = if payment_mint == governance_mint {
        fee.saturating_sub(fee_reduction)
    } else {
        fee
    };

    // Compute the total fee
    let total_fee = (adjusted_fee_basis_points as u128)
        .checked_mul(product_price as u128)
        .ok_or(ErrorCode::NumericalOverflow)?
        .checked_div(10000)
        .ok_or(ErrorCode::NumericalOverflow)? as u64;

    // Compute the amount that goes to the seller
    let seller_amount = (product_price as u64)
        .checked_sub(total_fee)
        .ok_or(ErrorCode::NumericalOverflow)? as u64;

    Ok((total_fee, seller_amount))
}


fn mint_and_burn<'info>(
    token_program: AccountInfo<'info>,
    signer: AccountInfo<'info>,
    token_config: AccountInfo<'info>,
    token_mint: AccountInfo<'info>,
    buyer_token_vault: AccountInfo<'info>,
    token_config_bump: u8
) -> std::result::Result<(), ErrorCode> {
    let token_mint_key = token_mint.key().clone();
    let seeds = &[
        b"product".as_ref(),
        token_mint_key.as_ref(),
        &[token_config_bump],
    ];

    mint_to(
        CpiContext::new_with_signer(
            token_program.clone(),
            MintTo {
                mint: token_mint.clone(),
                to: buyer_token_vault.clone(),
                authority: token_config.clone(),
            },
            &[&seeds[..]],
        ),
        1
    ).map_err(|_| ErrorCode::MintToError)?;

    burn(
        CpiContext::new(
            token_program.clone(),
            Burn {
                mint: token_mint.clone(),
                from: buyer_token_vault.clone(),
                authority: signer.clone(),
            },
        ),
        1,
    ).map_err(|_| ErrorCode::BurnError)?;

    close_account(
        CpiContext::new(
            token_program.clone(),
            CloseAccount {
                account: buyer_token_vault.clone(),
                destination: signer.clone(),
                authority: signer.clone(),
            },
        ),
    ).map_err(|_| ErrorCode::CloseAccountError)?;

    Ok(())
}