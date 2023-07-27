use {
    crate::state::*,
    crate::errors::ErrorCode,
    anchor_lang::{
        prelude::*,
        system_program::{
            System, 
            transfer as native_transfer,
            Transfer as NativeTransfer
        },
    },
    anchor_spl::{
        token_interface::{Mint, MintTo, TokenInterface, TokenAccount},
        token::{transfer, Transfer, ID as TokenProgramV0},
        token_2022::{mint_to, ID as TokenProgram2022},
    },
    spl_token_2022::native_mint::ID as NativeMint
};

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct RegisterBuy<'info> {
    pub system_program: Program<'info, System>,
    #[account(address = TokenProgramV0 @ ErrorCode::IncorrectTokenProgram, executable)]
    pub token_program_v0: Interface<'info, TokenInterface>,
    #[account(address = TokenProgram2022 @ ErrorCode::IncorrectTokenProgram, executable)]
    pub token_program_2022: Interface<'info, TokenInterface>,
    pub rent: Sysvar<'info, Rent>,
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub seller: Option<SystemAccount<'info>>,
    #[account(mut)]
    pub marketplace_auth: Option<SystemAccount<'info>>,
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
    /// CHECK: this account is used as index, not initialized
    #[account(
        mut,
        seeds = [
            b"payment".as_ref(),
            signer.key().as_ref(),
            product.key().as_ref(),
        ],
        bump = bump,
    )]
    pub payment: AccountInfo<'info>,
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
    pub product_mint: Option<Box<InterfaceAccount<'info, Mint>>>,
    #[account(
        constraint = payment_mint.key() == product.seller_config.payment_mint
            @ ErrorCode::IncorrectMint,
    )]
    pub payment_mint: InterfaceAccount<'info, Mint>,
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
        constraint = buyer_token_vault.mint == product.product_mint
            @ ErrorCode::IncorrectATA,
    )]
    pub buyer_token_vault: Option<Box<InterfaceAccount<'info, TokenAccount>>>,
    #[account(
        mut,
        constraint = buyer_transfer_vault.owner == signer.key()
            @ ErrorCode::IncorrectAuthority,
        constraint = buyer_transfer_vault.mint == product.seller_config.payment_mint.key()
            @ ErrorCode::IncorrectATA,
    )]
    pub buyer_transfer_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        constraint = seller_transfer_vault.owner == product.authority 
            @ ErrorCode::IncorrectAuthority,
        constraint = seller_transfer_vault.mint == product.seller_config.payment_mint.key()
            @ ErrorCode::IncorrectATA,
    )]
    pub seller_transfer_vault: InterfaceAccount<'info, TokenAccount>,
    /// ATA that receives fees
    #[account(
        mut,
        constraint = marketplace_transfer_vault.owner == marketplace.authority 
            @ ErrorCode::IncorrectAuthority,
        constraint = marketplace_transfer_vault.mint == payment_mint.key() 
            @ ErrorCode::IncorrectATA,
    )]
    pub marketplace_transfer_vault: InterfaceAccount<'info, TokenAccount>,
    // this account holds the reward tokens
    #[account(mut)]
    pub bounty_vault: Option<Box<InterfaceAccount<'info, TokenAccount>>>,
    #[account(mut)]
    pub seller_reward: Option<Account<'info, Reward>>,
    #[account(mut)]
    pub seller_reward_vault: Option<Box<InterfaceAccount<'info, TokenAccount>>>,
    #[account(mut)]
    pub buyer_reward: Option<Account<'info, Reward>>,
    #[account(mut)]
    pub buyer_reward_vault: Option<Box<InterfaceAccount<'info, TokenAccount>>>,
}

pub fn handler<'info>(ctx: Context<RegisterBuy>, _bump: u8, amount: u64) -> Result<()> {
    let adjusted_product_price = ctx.accounts.product.seller_config.product_price
        .checked_mul(amount).ok_or(ErrorCode::NumericalOverflow)?;

    if ctx.accounts.payment_mint.key() == NativeMint {
        let marketplace_auth = ctx.accounts.marketplace_auth.as_ref()
            .ok_or(ErrorCode::OptionalAccountNotProvided)?;
        let seller = ctx.accounts.seller.as_ref()
            .ok_or(ErrorCode::OptionalAccountNotProvided)?;
        
        handle_sol(
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.signer.to_account_info(),
            marketplace_auth.to_account_info(),
            seller.to_account_info(),
            ctx.accounts.marketplace.fees_config.clone(),
            ctx.accounts.product.seller_config.payment_mint,
            adjusted_product_price,
        )?;
    } else {
        handle_spl(
            ctx.accounts.token_program_v0.to_account_info(),
            ctx.accounts.signer.to_account_info(),
            ctx.accounts.marketplace_transfer_vault.to_account_info(),
            ctx.accounts.seller_transfer_vault.to_account_info(),
            ctx.accounts.buyer_transfer_vault.to_account_info(),
            ctx.accounts.marketplace.fees_config.clone(),
            ctx.accounts.product.seller_config.payment_mint,
            adjusted_product_price,            
        )?;
    }

    if Marketplace::is_rewards_active(
        ctx.accounts.marketplace.rewards_config.clone(), 
        ctx.accounts.product.seller_config.payment_mint,
        ctx.program_id.key(),
    ) {
        let marketplace_seeds = &[
            "marketplace".as_ref(),
            ctx.accounts.marketplace.authority.as_ref(),
            &[ctx.accounts.marketplace.bumps.bump],
        ];

        let seller_bonus = (ctx.accounts.marketplace.rewards_config.seller_reward as u128)
            .checked_mul(ctx.accounts.product.seller_config.product_price as u128)
            .ok_or(ErrorCode::NumericalOverflow)?
            .checked_div(10000)
            .ok_or(ErrorCode::NumericalOverflow)? as u64;

        let buyer_bonus = (ctx.accounts.marketplace.rewards_config.buyer_reward as u128)
            .checked_mul(ctx.accounts.product.seller_config.product_price as u128)
            .ok_or(ErrorCode::NumericalOverflow)?
            .checked_div(10000)
            .ok_or(ErrorCode::NumericalOverflow)? as u64;

        let bounty_vault = ctx.accounts.bounty_vault.as_ref()
            .ok_or(ErrorCode::OptionalAccountNotProvided)?;

        if ctx.accounts.payment_mint.key() == NativeMint {
            let seller = ctx.accounts.seller.as_ref()
                .ok_or(ErrorCode::OptionalAccountNotProvided)?;

            native_transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(), 
                    NativeTransfer {
                        from: bounty_vault.to_account_info(),
                        to: seller.to_account_info(),
                    },
                    &[&marketplace_seeds[..]],
                ),
                seller_bonus
            )?;
            
            native_transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(), 
                    NativeTransfer {
                        from: bounty_vault.to_account_info(),
                        to: ctx.accounts.signer.to_account_info(),
                    },
                    &[&marketplace_seeds[..]],
                ),
                seller_bonus
            )?;
        } else {
            let seller_reward_vault = ctx.accounts.seller_reward_vault.as_ref()
                .ok_or(ErrorCode::OptionalAccountNotProvided)?;
            let buyer_reward_vault = ctx.accounts.buyer_reward_vault.as_ref()
                .ok_or(ErrorCode::OptionalAccountNotProvided)?;

            transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program_v0.to_account_info(), 
                    Transfer {
                        from: bounty_vault.to_account_info(),
                        to: seller_reward_vault.to_account_info(),
                        authority: ctx.accounts.marketplace.to_account_info(),
                    },
                    &[&marketplace_seeds[..]],
                ),
                seller_bonus,
            ).map_err(|_| ErrorCode::TransferError)?;
    
            transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program_v0.to_account_info(), 
                    Transfer {
                        from: bounty_vault.to_account_info(),
                        to: buyer_reward_vault.to_account_info(),
                        authority: ctx.accounts.marketplace.to_account_info()
                    },
                    &[&marketplace_seeds[..]],
                ),
                buyer_bonus,
            ).map_err(|_| ErrorCode::TransferError)?;
        }
    }

    if ctx.accounts.marketplace.deliver_token {
        let product_mint = ctx.accounts.product_mint.as_ref()
            .ok_or(ErrorCode::OptionalAccountNotProvided)?;
        let buyer_token_vault = ctx.accounts.buyer_token_vault.as_ref()
            .ok_or(ErrorCode::OptionalAccountNotProvided)?;
        let seeds = &[
            b"product".as_ref(),
            ctx.accounts.product.first_id.as_ref(),
            ctx.accounts.product.second_id.as_ref(),
            ctx.accounts.product.marketplace.as_ref(),
            &[ctx.accounts.product.bumps.bump],
        ];
    
        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program_2022.to_account_info(),
                MintTo {
                    mint: product_mint.to_account_info(),
                    to: buyer_token_vault.to_account_info(),
                    authority: ctx.accounts.product.to_account_info(),
                },
                &[&seeds[..]],
            ),
            amount
        ).map_err(|_| ErrorCode::MintToError)?;
    }
    
    Ok(())
}

fn handle_sol<'info>(
    system_program: AccountInfo<'info>,
    signer: AccountInfo<'info>,
    marketplace_auth: AccountInfo<'info>,
    seller: AccountInfo<'info>,
    fees_config: FeesConfig,
    payment_mint: Pubkey,
    adjusted_product_price: u64,
) -> Result<()> {
    if fees_config.fee > 0 {
        let (total_fee, seller_amount) = Marketplace::calculate_transfer_distribution(
            fees_config,
            payment_mint,
            adjusted_product_price,
        )?;

        native_transfer(
            CpiContext::new(
                system_program.clone(), 
                NativeTransfer {
                    from: signer.clone(),
                    to: marketplace_auth,
            }), 
            total_fee
        )?;

        native_transfer(
            CpiContext::new(
                system_program, 
                NativeTransfer {
                    from: signer,
                    to: seller,
                }
            ), 
            seller_amount
        )?;
    } else {
        native_transfer(
            CpiContext::new(
                system_program, 
                NativeTransfer {
                    from: signer,
                    to: seller,
                }
            ), 
            adjusted_product_price
        )?;
    }

    Ok(())
}

fn handle_spl<'info>(
    token_program_v0: AccountInfo<'info>,
    signer: AccountInfo<'info>,
    marketplace_transfer_vault: AccountInfo<'info>,
    seller_transfer_vault: AccountInfo<'info>,
    buyer_transfer_vault: AccountInfo<'info>,
    fees_config: FeesConfig,
    payment_mint: Pubkey,
    adjusted_product_price: u64,
) -> Result<()> {
    if fees_config.fee > 0 {
        let (total_fee, seller_amount) = Marketplace::calculate_transfer_distribution(
            fees_config,
            payment_mint,
            adjusted_product_price,
        )?;
        transfer(
            CpiContext::new(
                token_program_v0.clone(), 
                Transfer {
                    from: buyer_transfer_vault.clone(),
                    to: marketplace_transfer_vault,
                    authority: signer.clone(),
                },
            ),
            total_fee,
        ).map_err(|_| ErrorCode::TransferError)?;

        transfer(
            CpiContext::new(
                token_program_v0, 
                Transfer {
                    from: buyer_transfer_vault,
                    to: seller_transfer_vault,
                    authority: signer,
                },
            ),
            seller_amount,
        ).map_err(|_| ErrorCode::TransferError)?;
    } else {
        transfer(
            CpiContext::new(
                token_program_v0, 
                Transfer {
                    from: buyer_transfer_vault,
                    to: seller_transfer_vault,
                    authority: signer,
                },
            ),
            adjusted_product_price,
        ).map_err(|_| ErrorCode::TransferError)?;
    }

    Ok(())
}
