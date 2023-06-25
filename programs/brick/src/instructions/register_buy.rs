use {
    crate::state::*,
    crate::errors::ErrorCode,
    anchor_lang::{
        prelude::*,
        solana_program::{
            account_info::AccountInfo, 
            instruction::Instruction,
            program::invoke_signed
        },
        system_program::System,
        InstructionData
    },
    anchor_spl::{
        token_interface::{Mint, TokenInterface, TokenAccount},
        token::{transfer, Transfer, ID},
    },
    aleph_solana_contract::instruction::DoMessage
};

#[derive(Accounts)]
pub struct RegisterBuy<'info> {
    pub system_program: Program<'info, System>,
    /// CHECK: contraint added to force using actual aleph message program
    #[account(address = aleph_solana_contract::ID, executable)]
    pub messages_program: UncheckedAccount<'info>,
    #[account(address = ID @ ErrorCode::IncorrectTokenProgram, executable)]
    pub token_program: Interface<'info, TokenInterface>,
    pub rent: Sysvar<'info, Rent>,
    /// CHECK: validated in the governance account contraints
    /// WHEN DEPLOYED ADD #[account(address =  @ ErrorCode::)]
    pub governance_authority: AccountInfo<'info>,
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        mut,
        seeds = [b"governance".as_ref()],
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

    let first_id_str = std::str::from_utf8(&ctx.accounts.product.first_id).unwrap();
    let second_id_str = std::str::from_utf8(&ctx.accounts.product.second_id).unwrap();
    let product_id = format!("{}{}", first_id_str, second_id_str);
    let message = DoMessage {
        msgtype: "post".to_string(),
        msgcontent: format!(
            "{{\"timeseriesID\":\"{}\",\"autorizer\":\"{}\",\"status\":\"GRANTED\",\"executionCount\":0,\"maxExecutionCount\":-1,\"requestor\":\"{}\"}}", 
            product_id, 
            ctx.accounts.product.product_authority.to_string(), 
            ctx.accounts.signer.key().to_string()
        ),
    };    
    
    let governance_seeds = &[
        b"governance".as_ref(),
        &[ctx.accounts.governance.bump],
    ];

    invoke_signed(
        &Instruction {
            program_id: ctx.accounts.messages_program.key(),
            accounts: vec![AccountMeta::new(ctx.accounts.governance.key(), true)],
            data: message.data(),
        },
        &[ctx.accounts.governance.to_account_info().clone()],
        &[&governance_seeds[..]],
    )?;

    Ok(())
}
