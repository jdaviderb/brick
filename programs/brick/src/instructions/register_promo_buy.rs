use {
    crate::state::*,
    crate::errors::ErrorCode,
    anchor_lang::{
        prelude::*,
        system_program::System,
        InstructionData,
        solana_program::{
            account_info::AccountInfo, 
            instruction::Instruction,
            program::invoke_signed
        },
    },
    anchor_spl::{
        token_interface::{Mint, TokenInterface, TokenAccount},
        token::{transfer, Transfer, ID},
    },
    aleph_solana_contract::instruction::DoMessage
};

#[derive(Accounts)]
pub struct RegisterPromoBuy<'info> {
    pub system_program: Program<'info, System>,
    /// CHECK: contraint added to force using actual aleph message program
    #[account(address = aleph_solana_contract::ID, executable)]
    pub messages_program: UncheckedAccount<'info>,
    #[account(address = ID @ ErrorCode::IncorrectTokenProgram)]
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
        has_one = governance_bonus_vault @ ErrorCode::IncorrectATA,
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
    /// CHECK: validated in the governance account contraints
    pub governance_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(
        mut,
        constraint = buyer_transfer_vault.owner == signer.key()
            @ ErrorCode::IncorrectAuthority,
        constraint = buyer_transfer_vault.mint == governance_mint.key()
            @ ErrorCode::IncorrectATA,
    )]
    pub buyer_transfer_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        mut,
        constraint = product_authority_transfer_vault.owner == product.product_authority 
            @ ErrorCode::IncorrectAuthority,
        constraint = product_authority_transfer_vault.mint == governance_mint.key()
            @ ErrorCode::IncorrectATA,
    )]
    pub product_authority_transfer_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        mut,
        constraint = governance_transfer_vault.owner == governance.governance_authority
            @ ErrorCode::IncorrectAuthority,
        constraint = governance_transfer_vault.mint == governance.governance_mint
            @ ErrorCode::IncorrectATA,
    )]
    pub governance_transfer_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    // this account holds the bonus governance tokens, is controlled by the program and allows to withdraw when promo is finished
    #[account(
        mut,
        seeds = [b"governance_bonus_vault".as_ref()],
        bump = governance.vault_bump,
        constraint = governance_bonus_vault.owner == governance.key() @ ErrorCode::IncorrectAuthority,
        constraint = governance_bonus_vault.mint == governance.governance_mint @ ErrorCode::IncorrectMint,
    )]
    pub governance_bonus_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        mut,
        seeds = [
            b"bonus".as_ref(),
            product.product_authority.as_ref(),
        ],
        bump = product_authority_bonus.bump,
    )]
    pub product_authority_bonus: Account<'info, Bonus>,
    #[account(
        mut,
        seeds = [
            b"bonus_vault".as_ref(),
            product.product_authority.as_ref(),
        ],
        bump = product_authority_bonus.vault_bump,
        constraint = product_authority_bonus_vault.owner == product_authority_bonus.key() @ ErrorCode::IncorrectAuthority,
        constraint = product_authority_bonus_vault.mint == governance_mint.key() @ ErrorCode::IncorrectMint,
    )]
    pub product_authority_bonus_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        mut,
        seeds = [
            b"bonus".as_ref(),
            signer.key().as_ref(),
        ],
        bump = buyer_bonus.bump,
        constraint = signer.key() == buyer_bonus.authority @ ErrorCode::IncorrectAuthority
    )]
    pub buyer_bonus: Account<'info, Bonus>,
    #[account(
        mut,
        seeds = [
            b"bonus_vault".as_ref(),
            signer.key().as_ref(),
        ],
        bump = buyer_bonus.vault_bump,
        constraint = buyer_bonus_vault.owner == buyer_bonus.key() @ ErrorCode::IncorrectAuthority,
        constraint = buyer_bonus_vault.mint == governance_mint.key() @ ErrorCode::IncorrectMint,
    )]
    pub buyer_bonus_vault: Box<InterfaceAccount<'info, TokenAccount>>,
}

pub fn handler<'info>(ctx: Context<RegisterPromoBuy>) -> Result<()> {
    let product = &mut ctx.accounts.product;

    if Governance::is_active_promo(
        &ctx.accounts.governance, 
        &product.seller_config.payment_mint
    ) {
        apply_promo_distribution(
            &ctx.accounts.token_program.to_account_info(),
            &ctx.accounts.signer.to_account_info(),
            &ctx.accounts.governance_transfer_vault.to_account_info(),
            &ctx.accounts.governance_bonus_vault.to_account_info(), 
            &ctx.accounts.product_authority_transfer_vault.to_account_info(), 
            &ctx.accounts.buyer_transfer_vault.to_account_info(),
            &ctx.accounts.buyer_bonus_vault.to_account_info(), 
            &ctx.accounts.product_authority_bonus_vault.to_account_info(),
            &ctx.accounts.governance.to_account_info(),
            &ctx.accounts.governance,
            product.seller_config.product_price,
        )?;
    } else {
        return Err(ErrorCode::ClosedPromotion.into());
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

/// This function applies a promotional distribution of tokens in the instruction.
/// 
/// # Arguments
/// 
/// * `token_program` - The program of the token.
/// * `signer` - The signer of the transaction.
/// * `governance_transfer_vault` - The vault of the governance transfer.
/// * `product_authority_transfer_vault` - The vault of the seller's transfer.
/// * `buyer_transfer_vault` - The vault of the buyer's transfer.
/// * `product_price` - The price of the product.
/// * `seller_promo` - The promo for the seller.
/// * `buyer_promo` - The promo for the buyer.
/// 
/// # Returns
/// 
/// A Result indicating success or an ErrorCode.
fn apply_promo_distribution<'info>(
    token_program: &AccountInfo<'info>,
    signer: &AccountInfo<'info>,
    governance_transfer_vault: &AccountInfo<'info>,
    governance_bonus_vault: &AccountInfo<'info>,
    product_authority_transfer_vault: &AccountInfo<'info>,
    buyer_transfer_vault: &AccountInfo<'info>,
    buyer_bonus_vault: &AccountInfo<'info>,
    product_authority_bonus_vault: &AccountInfo<'info>,
    governance_info: &AccountInfo<'info>,
    governance: &Governance,
    product_price: u64,
) -> std::result::Result<(), ErrorCode> {
    let (total_fee, seller_amount) = Governance::calculate_transfer_distribution(
        governance.fee,
        governance.fee_reduction,
        governance.governance_mint,
        governance.governance_mint,
        product_price,
    )?;

    // buyer payment to the seller
    transfer(
        CpiContext::new(
            token_program.clone(), 
            Transfer {
                from: buyer_transfer_vault.clone(),
                to: product_authority_transfer_vault.clone(),
                authority: signer.clone(),
            },
        ),
        seller_amount,
    ).map_err(|_| ErrorCode::TransferError)?;

    // fees transfer
    transfer(
        CpiContext::new(
            token_program.clone(), 
            Transfer {
                from: buyer_transfer_vault.clone(),
                to: governance_transfer_vault.clone(),
                authority: signer.clone(),
            },
        ),
        total_fee,
    ).map_err(|_| ErrorCode::TransferError)?;



    let governance_seeds = &[
        b"governance".as_ref(),
        &[governance.bump],
    ];

    // seller bonus transfer
    let seller_bonus = (governance.seller_promo as u128)
        .checked_mul(product_price as u128)
        .ok_or(ErrorCode::NumericalOverflow)?
        .checked_div(10000)
        .ok_or(ErrorCode::NumericalOverflow)? as u64;

    transfer(
        CpiContext::new_with_signer(
            token_program.clone(), 
            Transfer {
                from: governance_bonus_vault.clone(),
                to: product_authority_bonus_vault.clone(),
                authority: governance_info.clone(),
            },
            &[&governance_seeds[..]],
        ),
        seller_bonus,
    ).map_err(|_| ErrorCode::TransferError)?;

    // buyer bonus transfer
    let buyer_bonus = (governance.buyer_promo as u128)
        .checked_mul(product_price as u128)
        .ok_or(ErrorCode::NumericalOverflow)?
        .checked_div(10000)
        .ok_or(ErrorCode::NumericalOverflow)? as u64;

    transfer(
        CpiContext::new_with_signer(
            token_program.clone(), 
            Transfer {
                from: governance_bonus_vault.clone(),
                to: buyer_bonus_vault.clone(),
                authority: governance_info.clone()
            },
            &[&governance_seeds[..]],
        ),
        buyer_bonus,
    ).map_err(|_| ErrorCode::TransferError)?;

    Ok(())
}
