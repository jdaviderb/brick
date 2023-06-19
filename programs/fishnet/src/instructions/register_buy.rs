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
        mint::USDC
    }
};

#[derive(Accounts)]
#[instruction(timestamp: u64)]
pub struct RegisterBuy<'info> {
    pub system_program: Program<'info, System>,
    #[account(address = TokenProgramV0 @ ErrorCode::IncorrectTokenProgram)]
    pub token_program_v0: Interface<'info, TokenInterface>,
    #[account(address = TokenProgram2022 @ ErrorCode::IncorrectTokenProgram)]
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
    /// CHECK: validated in the governance account contraints
    pub governance_authority: AccountInfo<'info>,
    /// CHECK: validated in the product account contraints
    pub product_authority: AccountInfo<'info>,
    #[account(mut)]
    pub signer: Signer<'info>,
    /// CHECK: It is validated in the instruction logic
    #[account(
        seeds = [
            b"governance".as_ref(),
            governance.governance_name.as_ref(),
        ],
        bump = governance.bump,
        has_one = governance_authority @ ErrorCode::IncorrectAuthority,
        has_one = governance_token_vault @ ErrorCode::IncorrectATA,
        has_one = governance_usdc_vault @ ErrorCode::IncorrectATA,
    )]
    pub governance: Account<'info, Governance>,
    #[account(
        seeds = [
            b"product".as_ref(),
            product.key().as_ref(),
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
            @ ErrorCode::IncorrectAuthority,
    )]
    pub payment_mint: Box<InterfaceAccount<'info, Mint>>,
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
    )]
    pub buyer_transfer_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        mut,
        constraint = seller_transfer_vault.owner == product.product_authority 
            @ ErrorCode::IncorrectAuthority,
    )]
    pub seller_transfer_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    /// ATA that receives fees
    #[account(
        mut,
        constraint = governance_transfer_vault.owner == governance.governance_authority 
            @ ErrorCode::IncorrectAuthority,
        constraint = governance_transfer_vault.mint == payment_mint.key() 
            @ ErrorCode::IncorrectATA,
    )]
    pub governance_transfer_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        mut,
        constraint = governance_token_vault.owner == governance.governance_authority 
            @ ErrorCode::IncorrectAuthority,
        constraint = governance_token_vault.mint == governance.governance_mint
            @ ErrorCode::IncorrectATA,
    )]
    pub governance_token_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        mut,
        constraint = governance_usdc_vault.owner == governance.governance_authority 
            @ ErrorCode::IncorrectAuthority,
        constraint = governance_usdc_vault.mint == USDC 
            @ ErrorCode::IncorrectATA,
    )]    
    pub governance_usdc_vault: Box<InterfaceAccount<'info, TokenAccount>>,
}

pub fn handler<'info>(ctx: Context<RegisterBuy>) -> Result<()> {
    // performs all the transfers and also manages fees and promotions
    if ctx.accounts.governance.promotion_basis_points > 0 && ctx.accounts.payment_mint.key() == ctx.accounts.governance.governance_mint {
        promo_distribution(
            ctx.accounts.token_program.to_account_info().clone(),
            ctx.accounts.governance_usdc_vault.to_account_info().clone(),
            ctx.accounts.governance_transfer_vault.to_account_info().clone(),
            ctx.accounts.seller_transfer_vault.to_account_info().clone(),
            ctx.accounts.buyer_transfer_vault.to_account_info().clone(),
            ctx.accounts.signer.to_account_info().clone(),
            ctx.accounts.product.seller_config.product_price.clone(),
            ctx.accounts.product.seller_config.usdc_price.clone(),
            ctx.accounts.governance.promotion_basis_points.clone()
        )?;            
    } else {
        normal_distribution(
            ctx.accounts.token_program.to_account_info().clone(),
            ctx.accounts.signer.to_account_info().clone(),
            ctx.accounts.governance_transfer_vault.to_account_info().clone(),
            ctx.accounts.seller_transfer_vault.to_account_info().clone(),
            ctx.accounts.buyer_transfer_vault.to_account_info().clone(),
            ctx.accounts.governance.governance_mint.clone(),
            ctx.accounts.payment_mint.key().clone(),
            ctx.accounts.product.seller_config.product_price.clone(),
            ctx.accounts.governance.fee_basis_points.clone(),
            ctx.accounts.governance.fee_reduction_basis_points.clone(),
        )?;            
    }

    // mint, burn & close ata. it facilitates the infra, that reads this ix, to identify which product the buyer is paying for
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

fn promo_distribution<'info>(
    token_program: AccountInfo<'info>,
    governance_usdc_vault: AccountInfo<'info>,
    governance_transfer_vault: AccountInfo<'info>,
    seller_transfer_vault: AccountInfo<'info>,
    buyer_transfer_vault: AccountInfo<'info>,
    authority: AccountInfo<'info>,
    token_price: u64,
    usdc_price: u64,
    promotion_basis_points: u16,
) -> std::result::Result<(), ErrorCode> {
    let promotion_bonus = (promotion_basis_points as u128)
        .checked_mul(token_price as u128)
        .ok_or(ErrorCode::NumericalOverflow)?
        .checked_div(10000)
        .ok_or(ErrorCode::NumericalOverflow)? as u64;

    let total_amount = token_price.checked_add(promotion_bonus)
        .ok_or(ErrorCode::NumericalOverflow)? as u64;

    transfer(
        CpiContext::new(
            token_program.clone(), 
            Transfer {
                from: governance_transfer_vault.clone(),
                to: seller_transfer_vault.clone(),
                authority: authority.clone(),
            },
        ),
        total_amount,
    ).map_err(|_| ErrorCode::TransferError)?;    

    transfer(
        CpiContext::new(
            token_program.clone(), 
            Transfer {
                from: buyer_transfer_vault.clone(),
                to: governance_usdc_vault.clone(),
                authority: authority.clone(),
            },
        ),
        usdc_price,
    ).map_err(|_| ErrorCode::TransferError)?;

    Ok(())
}

fn normal_distribution<'info>(
    token_program: AccountInfo<'info>,
    authority: AccountInfo<'info>,
    governance_transfer_vault: AccountInfo<'info>,
    seller_transfer_vault: AccountInfo<'info>,
    buyer_transfer_vault: AccountInfo<'info>,
    governance_mint: Pubkey,
    payment_mint: Pubkey,
    token_price: u64,
    fee_basis_points: u16,
    fee_reduction: u16,
) -> std::result::Result<(), ErrorCode> {
    if fee_basis_points > 0 {
        let (total_fee, seller_amount) = distribute_transfer(
            fee_basis_points,
            fee_reduction,
            governance_mint,
            payment_mint,
            token_price,
        )?;
        transfer(
            CpiContext::new(
                token_program.clone(), 
                Transfer {
                    from: buyer_transfer_vault.clone(),
                    to: governance_transfer_vault.clone(),
                    authority: authority.clone(),
                },
            ),
            total_fee,
        ).map_err(|_| ErrorCode::TransferError)?;

        transfer(
            CpiContext::new(
                token_program.clone(), 
                Transfer {
                    from: buyer_transfer_vault.clone(),
                    to: seller_transfer_vault.clone(),
                    authority: authority.clone(),
                },
            ),
            seller_amount,
        ).map_err(|_| ErrorCode::TransferError)?;
    } else {
        transfer(
            CpiContext::new(
                token_program.clone(), 
                Transfer {
                    from: buyer_transfer_vault.clone(),
                    to: seller_transfer_vault.clone(),
                    authority: authority.clone(),
                },
            ),
            token_price,
        ).map_err(|_| ErrorCode::TransferError)?;
    }
    Ok(())
}

fn distribute_transfer(
    fee_basis_points: u16,
    fee_reduction: u16, 
    governance_mint: Pubkey,
    payment_mint: Pubkey, 
    price: u64
) -> std::result::Result<(u64, u64), ErrorCode> {
    let adjusted_fee_basis_points: u16 = if payment_mint == governance_mint {
        fee_basis_points.saturating_sub(fee_reduction)
    } else {
        fee_basis_points
    };

    let total_fee = (adjusted_fee_basis_points as u128)
        .checked_mul(price as u128)
        .ok_or(ErrorCode::NumericalOverflow)?
        .checked_div(10000)
        .ok_or(ErrorCode::NumericalOverflow)? as u64;

    let seller_amount = (price as u64)
        .checked_sub(total_fee)
        .ok_or(ErrorCode::NumericalOverflow)? as u64;

    Ok((total_fee, seller_amount))
}

fn mint_and_burn<'info>(
    token_program: AccountInfo<'info>,
    authority: AccountInfo<'info>,
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
                authority: authority.clone(),
            },
        ),
        1,
    ).map_err(|_| ErrorCode::BurnError)?;

    close_account(
        CpiContext::new(
            token_program.clone(),
            CloseAccount {
                account: buyer_token_vault.clone(),
                destination: authority.clone(),
                authority: authority.clone(),
            },
        ),
    ).map_err(|_| ErrorCode::CloseAccountError)?;

    Ok(())
}