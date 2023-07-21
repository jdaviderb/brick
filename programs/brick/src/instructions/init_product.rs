use {
    crate::state::*,
    crate::errors::ErrorCode,
    anchor_lang::{
        prelude::*,
        system_program::{System, CreateAccount, create_account},
        solana_program::program::invoke_signed,
    },
    anchor_spl::{
        token_interface::{
            TokenInterface,
            Mint, 
            InitializeMint, 
            initialize_mint,
        },
        token_2022::ID as TokenProgram2022,
    },
    spl_token_2022::{
        extension::ExtensionType,
        state::Mint as Mint2022,
        instruction::initialize_non_transferable_mint
    },
};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitProductParams {
    pub first_id: [u8; 32],
    pub second_id: [u8; 32],
    pub product_price: u64,
    pub mint_bump: u8
}

#[derive(Accounts)]
#[instruction(params: InitProductParams)]
pub struct InitProduct<'info> {
    pub system_program: Program<'info, System>,
    #[account(address = TokenProgram2022 @ ErrorCode::IncorrectTokenProgram)]
    pub token_program_2022: Interface<'info, TokenInterface>,
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
        init,
        payer = signer,
        space = Product::SIZE,
        seeds = [
            b"product".as_ref(),
            params.first_id.as_ref(),
            params.second_id.as_ref(),
            marketplace.key().as_ref(),
        ],
        bump,
    )]
    pub product: Box<Account<'info, Product>>,
    /// CHECK: is init in the instruction logic
    #[account(
        mut,
        seeds = [
            b"product_mint".as_ref(),
            params.first_id.as_ref(),
            params.second_id.as_ref(),
            marketplace.key().as_ref(),
        ],
        bump = params.mint_bump,
    )]    
    pub product_mint: AccountInfo<'info>,
    pub payment_mint: Box<InterfaceAccount<'info, Mint>>,
}

pub fn handler<'info>(ctx: Context<InitProduct>, params: InitProductParams) -> Result<()> {
    let marketplace_key = ctx.accounts.marketplace.key();

    (*ctx.accounts.product).authority = ctx.accounts.signer.key();
    (*ctx.accounts.product).first_id = params.first_id;
    (*ctx.accounts.product).second_id = params.second_id; 
    (*ctx.accounts.product).marketplace = marketplace_key;
    (*ctx.accounts.product).product_mint = ctx.accounts.product_mint.key();

    (*ctx.accounts.product).seller_config = SellerConfig {
        payment_mint: ctx.accounts.payment_mint.key(),
        product_price: params.product_price,
    };
    (*ctx.accounts.product).bumps = ProductBumps {
        bump: *ctx.bumps.get("product").unwrap(),
        mint_bump: params.mint_bump,
    };

    let mint_seeds = &[
        b"product_mint".as_ref(),
        ctx.accounts.product.first_id.as_ref(),
        ctx.accounts.product.second_id.as_ref(),
        marketplace_key.as_ref(),
    ];

    // validate product_mint pda
    let (account_address, nonce) = Pubkey::find_program_address(mint_seeds, &ctx.program_id.key());
    if account_address != ctx.accounts.product_mint.key() {
        msg!(
            "Create account with PDA: {:?} was requested while PDA: {:?} was expected",
            ctx.accounts.product_mint.key(),
            account_address,
        );
        return Err(ErrorCode::IncorrectSeeds.into());
    } else {
        msg!("Both addresses match");
    }

    let mut signer_mint_seeds = mint_seeds.to_vec();
    let bump = &[nonce];
    signer_mint_seeds.push(bump);

    // create the mint with the non transferable extension:
    let space = ExtensionType::get_account_len::<Mint2022>(&[ExtensionType::NonTransferable]);
    create_account(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            CreateAccount { 
                from: ctx.accounts.signer.to_account_info(), 
                to: ctx.accounts.product_mint.to_account_info()
            },
            &[&signer_mint_seeds[..]],
        ),
        ctx.accounts.rent.minimum_balance(space), 
        space as u64, 
        &ctx.accounts.token_program_2022.key()
    )?;

    invoke_signed(
        &initialize_non_transferable_mint(
            &ctx.accounts.token_program_2022.key(), 
            &ctx.accounts.product_mint.key()
        )?,
        &[
            ctx.accounts.product.to_account_info().clone(),
            ctx.accounts.product_mint.to_account_info().clone()
        ],
        &[&signer_mint_seeds[..]],
    )?;

    let product_seeds = &[
        b"product".as_ref(),
        ctx.accounts.product.product_mint.as_ref(),
        &[ctx.accounts.product.bumps.bump],
    ];

    initialize_mint(
        CpiContext::new_with_signer(
            ctx.accounts.token_program_2022.to_account_info(),
            InitializeMint {
                mint: ctx.accounts.product_mint.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
            &[&signer_mint_seeds[..], &product_seeds[..]],
        ),
        0, 
        &ctx.accounts.product.key(), 
        None
    )?;

    Ok(())
}
