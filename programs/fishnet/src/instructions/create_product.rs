use {
    crate::state::*,
    crate::errors::ErrorCode,
    anchor_lang::{
        prelude::*,
        system_program::{System, CreateAccount, create_account},
    },
    spl_token_2022::{
        extension::ExtensionType,
        state::Mint as Mint2022,
    },
    anchor_spl::{
        token_interface::{
            TokenInterface,
            Mint, 
            InitializeMint, 
            InitializeMintCloseAuthority, 
            initialize_mint, 
            initialize_mint_close_authority
        },
        token_2022::ID as TokenProgram2022
    }
};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CreateProductParams {
    pub first_id: [u8; 32],
    pub second_id: [u8; 32],
    pub product_price: u64,
    pub usdc_price: u64,
    pub mint_bump: u8
}

#[derive(Accounts)]
#[instruction(params: CreateProductParams)]
pub struct CreateProduct<'info> {
    pub system_program: Program<'info, System>,
    #[account(address = TokenProgram2022 @ ErrorCode::IncorrectTokenProgram)]
    pub token_program: Interface<'info, TokenInterface>,
    pub rent: Sysvar<'info, Rent>,
    #[account(mut)]
    pub product_authority: Signer<'info>,
    /// CHECK: will be created in the ix logic
    #[account(
        mut,
        seeds = [
            b"product_mint".as_ref(),
            params.first_id.as_ref(),
            params.second_id.as_ref(),
        ],
        bump = params.mint_bump,
    )]    
    pub product_mint: AccountInfo<'info>,
    #[account(
        seeds = [
            b"governance".as_ref(),
            governance.governance_name.as_ref()
        ],
        bump = governance.bump,
    )]
    pub governance: Account<'info, Governance>,
    #[account(
        init,
        payer = product_authority,
        space = Product::SIZE,
        seeds = [
            b"product".as_ref(),
            product_mint.key().as_ref(),
        ],
        bump,
    )]
    pub product: Box<Account<'info, Product>>,
    pub payment_mint: Box<InterfaceAccount<'info, Mint>>,
}

pub fn handler<'info>(ctx: Context<CreateProduct>, params: CreateProductParams) -> Result<()> {
    (*ctx.accounts.product).first_id = params.first_id;
    (*ctx.accounts.product).second_id = params.second_id;
    (*ctx.accounts.product).governance = ctx.accounts.governance.key();
    (*ctx.accounts.product).product_mint = ctx.accounts.product_mint.key();
    (*ctx.accounts.product).product_authority = ctx.accounts.product_authority.key();
    (*ctx.accounts.product).seller_config = SellerConfig {
        payment_mint: ctx.accounts.payment_mint.key(),
        product_price: params.product_price,
        usdc_price: params.usdc_price
    };
    (*ctx.accounts.product).bumps = Bumps {
        bump: *ctx.bumps.get("product").unwrap(),
        mint_bump: params.mint_bump, // will be set in the create_product ix
    };

    let config_seeds = &[
        b"product".as_ref(),
        ctx.accounts.product.product_mint.as_ref(),
        &[ctx.accounts.product.bumps.bump],
    ];
    let mint_seeds = &[
        b"product_mint".as_ref(),
        ctx.accounts.product.first_id.as_ref(),
        ctx.accounts.product.second_id.as_ref(),
    ];

    //without the bump in mint_seeds, i get the same bump and pubkey in find_pda
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

    // create the mint with the close authority extension:
    msg!("CPI: create_account");
    let space = ExtensionType::get_account_len::<Mint2022>(&[ExtensionType::MintCloseAuthority]);
    create_account(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            CreateAccount { 
                from: ctx.accounts.product.to_account_info(), 
                to: ctx.accounts.product_mint.to_account_info()
            },
            &[&signer_mint_seeds[..]],
        ),
        ctx.accounts.rent.minimum_balance(space), 
        space as u64, 
        &ctx.accounts.token_program.key()
    )?;

    msg!("CPI: initialize_mint_close_authority");
    initialize_mint_close_authority(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            InitializeMintCloseAuthority {
                mint: ctx.accounts.product_mint.to_account_info(),
            },
            &[&signer_mint_seeds[..]],
        ),
        Some(&ctx.accounts.product.key()),
    )?;

    msg!("CPI: initialize_mint");
    initialize_mint(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            InitializeMint {
                mint: ctx.accounts.product_mint.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
            &[&signer_mint_seeds[..], &config_seeds[..]],
        ),
        0, 
        &ctx.accounts.product.key(), 
        None
    )?;

    Ok(())
}
