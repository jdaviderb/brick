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
        token_interface::{TokenInterface, InitializeMint, InitializeMintCloseAuthority, initialize_mint, initialize_mint_close_authority},
    }
};

#[derive(Accounts)]
pub struct CreateMint<'info> {
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub rent: Sysvar<'info, Rent>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: will be created in the ix logic
    #[account(
        mut,
        seeds = [
            b"token_mint".as_ref(),
            token_config.first_id.as_ref(),
            token_config.second_id.as_ref(),
        ],
        bump = token_config.bumps.mint_bump,
    )]    
    pub token_mint: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [
            b"token_config".as_ref(),
            token_mint.key().as_ref(),
        ],
        bump = token_config.bumps.bump,
        constraint = token_config.authority == authority.key()
            @ ErrorCode::InconrrectCreatorAccount
    )]
    pub token_config: Box<Account<'info, TokenConfig>>,
}

pub fn handler<'info>(ctx: Context<CreateMint>) -> Result<()> {
    let config_seeds = &[
        b"token_config".as_ref(),
        ctx.accounts.token_config.token_mint.as_ref(),
        &[ctx.accounts.token_config.bumps.bump],
    ];
    let mint_seeds = &[
        b"token_mint".as_ref(),
        ctx.accounts.token_config.first_id.as_ref(),
        ctx.accounts.token_config.second_id.as_ref(),
    ];

    //without the bump in mint_seeds, i get the same bump and pubkey in find_pda
    let (account_address, nonce) = Pubkey::find_program_address(mint_seeds, &ctx.program_id.key());
    if account_address != ctx.accounts.token_mint.key() {
        msg!(
            "Create account with PDA: {:?} was requested while PDA: {:?} was expected",
            ctx.accounts.token_mint.key(),
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
                from: ctx.accounts.authority.to_account_info(), 
                to: ctx.accounts.token_mint.to_account_info()
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
                mint: ctx.accounts.token_mint.to_account_info(),
            },
            &[&signer_mint_seeds[..]],
        ),
        Some(&ctx.accounts.token_config.key()),
    )?;
    msg!("CPI: initialize_mint");
    initialize_mint(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            InitializeMint {
                mint: ctx.accounts.token_mint.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
            &[&signer_mint_seeds[..], &config_seeds[..]],
        ),
        0, 
        &ctx.accounts.token_config.key(), 
        None
    )?;

    Ok(())
}
