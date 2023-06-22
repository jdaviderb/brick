use {
    crate::state::*,
    crate::errors::ErrorCode,
    anchor_lang::{
        prelude::*,
        system_program::System,
    },
    anchor_spl::{
        associated_token::AssociatedToken,
        token_interface::{Mint, TokenInterface, TokenAccount},
        token::{transfer, Transfer},
        token_2022::{ID as TokenProgram2022},
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
            product.first_id.as_ref(),
            product.second_id.as_ref(),
        ],
        bump = product.bump,
        has_one = product_authority @ ErrorCode::IncorrectAuthority,
    )]
    pub product: Box<Account<'info, Product>>,
    #[account(
        mut,
        constraint = payment_mint.key() == product.seller_config.payment_mint
            @ ErrorCode::IncorrectMint,
    )]
    pub payment_mint: Box<InterfaceAccount<'info, Mint>>,
    /// CHECK: validated in the governance account contraints
    pub governance_mint: Box<InterfaceAccount<'info, Mint>>,
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
        let (total_fee, seller_amount) = Governance::calculate_transfer_distribution(
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

    Ok(())
}
