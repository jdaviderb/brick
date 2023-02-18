// based on: https://github.com/danmt/create-mint-and-metadata-on-chain
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{burn, mint_to, transfer, Burn, Mint, MintTo, Token, TokenAccount, Transfer },
};

declare_id!("AxDTdwnYddq8jZB2Xouons961sv3sHSRHZuvGDuoVU2G");

#[program]
pub mod fishplace {
    use super::*;

    pub fn create_data_set(ctx: Context<CreateDataSet>, hash_id: String, title: String) -> Result<()> {
        (*ctx.accounts.data_set).title = title.clone();
        (*ctx.accounts.data_set).mint = ctx.accounts.mint.key();
        (*ctx.accounts.data_set).authority = ctx.accounts.authority.key();
        (*ctx.accounts.data_set).bump = *ctx.bumps.get("data_set").unwrap();
        (*ctx.accounts.data_set).hash_id = hash_id.clone();

        Ok(())
    }

    pub fn create_master_edition(
        ctx: Context<CreateMasterEdition>,
        master_edition_name: String,
        master_edition_symbol: String,
        master_edition_uri: String,
        master_edition_price: u32,
        master_edition_quantity: u32,
    ) -> Result<()> {
        (*ctx.accounts.master_edition_info).price = master_edition_price;
        (*ctx.accounts.master_edition_info).quantity = master_edition_quantity;
        (*ctx.accounts.master_edition_info).sold = 0;
        (*ctx.accounts.master_edition_info).used = 0;
        (*ctx.accounts.master_edition_info).bump = *ctx.bumps.get("master_edition_info").unwrap();
        (*ctx.accounts.master_edition_info).mint_bump = *ctx.bumps.get("master_edition_mint").unwrap();
        (*ctx.accounts.master_edition_info).metadata_bump = *ctx.bumps.get("master_edition_metadata").unwrap();

        if master_edition_quantity == 0 {
            (*ctx.accounts.master_edition_info).unlimited_quantity = true;
        } else {
            (*ctx.accounts.master_edition_info).unlimited_quantity = false;
        }

        let seeds = &[
            b"data_set".as_ref(),
            ctx.accounts.data_set.hash_id.as_ref(),
            &[ctx.accounts.data_set.bump],
        ];

        //This instruction creates and initializes a new Metadata account for a given Mint account
        solana_program::program::invoke_signed(
            &mpl_token_metadata::instruction::create_metadata_accounts_v3(
                //args:
                mpl_token_metadata::ID, //program_id
                (*ctx.accounts.master_edition_metadata).key(), //metadata_account
                ctx.accounts.master_edition_mint.key(), //mint
                ctx.accounts.data_set.key(), //mint_authority
                (*ctx.accounts.authority).key(), //payer
                ctx.accounts.data_set.key(), //update_authority
                master_edition_name,
                master_edition_symbol,
                master_edition_uri,
                None, //creators
                0, //sellerFeeBasisPoints
                true, //update_authority_is_signer
                true, //isMutable
                None, //collection
                None, //uses
                None, //collectionDetails
            ),
            //accounts context:
            &[
                ctx.accounts.master_edition_metadata.to_account_info().clone(), //metadata
                ctx.accounts.master_edition_mint.to_account_info().clone(), //mint
                ctx.accounts.data_set.to_account_info().clone(), //mint_authority
                ctx.accounts.authority.to_account_info().clone(), //payer
                ctx.accounts.data_set.to_account_info().clone(), //update_authority
            ],
            &[&seeds[..]],
        )?;

        Ok(())
    }

    pub fn buy_data_set(ctx: Context<BuyDataSet>, quantity: u32) -> Result<()> {
        if 
            (*ctx.accounts.master_edition_info).unlimited_quantity == false && 
            (*ctx.accounts.master_edition_info).quantity < (*ctx.accounts.master_edition_info).sold + quantity
        {
            return Err(ErrorCode::NotEnoughMintsAvailable.into());
        }

        (*ctx.accounts.master_edition_info).sold += quantity;

        let seeds = &[
            b"data_set".as_ref(),
            ctx.accounts.data_set.hash_id.as_ref(),
            &[ctx.accounts.data_set.bump],
        ];

        // call transfer from authority (buyer) to dataset authority (seller)
        transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.buyer_vault.to_account_info(),
                    to: ctx.accounts.seller_vault.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            ctx.accounts
                .master_edition_info
                .price
                .checked_mul(quantity.into())
                .unwrap()
                .into(),
        )?;

        // call mintTo instruction
        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.master_edition_mint.to_account_info(),
                    to: ctx.accounts.master_edition_vault.to_account_info(),
                    authority: ctx.accounts.data_set.to_account_info(),
                },
                &[&seeds[..]],
            ),
            quantity.into()
        )?;

        Ok(())
    }

    pub fn use_data_set(ctx: Context<UseDataSet>, quantity: u32) -> Result<()> {
        (*ctx.accounts.master_edition_info).used += quantity;

        burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    authority: ctx.accounts.authority.to_account_info(),
                    from: ctx.accounts.master_edition_vault.to_account_info(),
                    mint: ctx.accounts.master_edition_mint.to_account_info(),
                },
            ),
            quantity.into(),
        )?;

        Ok(())
    }

    pub fn delete_data_set(_ctx: Context<DeleteDataSet>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(hash_id: String)]
pub struct CreateDataSet<'info> {
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = DataSet::SIZE,
        seeds = [
            b"data_set".as_ref(),
            hash_id.as_ref(),
        ],
        bump
    )]
    pub data_set: Account<'info, DataSet>,
    pub mint: Account<'info, Mint>,
}

#[derive(Accounts)]
pub struct CreateMasterEdition<'info> {
    /// CHECK: contraint added to force using actual metaplex metadata program
    #[account(address = mpl_token_metadata::ID, executable)]
    pub metadata_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        seeds = [
            b"data_set".as_ref(),
            data_set.hash_id.as_ref()
        ], 
        bump = data_set.bump
    )]
    pub data_set: Account<'info, DataSet>,
    #[account(
        init,
        payer = authority,
        space = MasterEditionInfo::SIZE,
        seeds = [
            b"master_edition_info".as_ref(),
            data_set.key().as_ref(),
        ],
        bump,
    )]
    pub master_edition_info: Account<'info, MasterEditionInfo>,
    #[account(
        init,
        payer = authority,
        mint::decimals = 0,
        mint::authority = data_set,
        seeds = [
            b"master_edition_mint".as_ref(),
            data_set.key().as_ref(),
            master_edition_info.key().as_ref(),
        ],
        bump,
    )]
    pub master_edition_mint: Account<'info, Mint>,
    /// CHECK: this will be verified by token metadata program
    #[account(
        mut,
        seeds = [
            b"metadata".as_ref(),
            metadata_program.key().as_ref(),
            master_edition_mint.key().as_ref(),
        ],
        bump,
        seeds::program = metadata_program.key()
    )]
    pub master_edition_metadata: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct BuyDataSet<'info> {
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        seeds = [
            b"data_set".as_ref(),
            data_set.hash_id.as_ref(),
        ],
        bump = data_set.bump
    )]
    pub data_set: Account<'info, DataSet>,
    #[account(
        mut,
        seeds = [
            b"master_edition_info".as_ref(),
            data_set.key().as_ref(),
        ],
        bump = master_edition_info.bump,
    )]
    pub master_edition_info: Account<'info, MasterEditionInfo>,
    #[account(
        mut,
        constraint = buyer_vault.mint == data_set.mint @ ErrorCode::WrongBuyerMintProvided
    )]
    pub buyer_vault: Account<'info, TokenAccount>, // buyer token account to pay
    #[account(
        mut,
        constraint = seller_vault.mint == data_set.mint @ ErrorCode::WrongSellerMintProvided
    )]
    pub seller_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [
            b"master_edition_mint".as_ref(),
            data_set.key().as_ref(),
            master_edition_info.key().as_ref(),
        ],
        bump = master_edition_info.mint_bump
    )]
    pub master_edition_mint: Account<'info, Mint>,
    #[account(
        mut,
        constraint = master_edition_vault.mint == master_edition_mint.key() @ ErrorCode::WrongMasterEditionTokenAccount
    )]
    pub master_edition_vault: Box<Account<'info, TokenAccount>>, // buyer token account to store nft
}

#[derive(Accounts)]
pub struct UseDataSet<'info> {
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        seeds = [
            b"data_set".as_ref(),
            data_set.hash_id.as_ref(),
        ],
        bump = data_set.bump
    )]
    pub data_set: Account<'info, DataSet>,
    #[account(
        mut,
        seeds = [
            b"master_edition_info".as_ref(),
            data_set.key().as_ref(),
        ],
        bump = master_edition_info.bump,
        constraint = master_edition_vault.owner == authority.key() @ ErrorCode::WrongOwnerOfTheNFT
    )]
    pub master_edition_info: Account<'info, MasterEditionInfo>,
    #[account(
        mut,
        seeds = [
            b"master_edition_mint".as_ref(),
            data_set.key().as_ref(),
            master_edition_info.key().as_ref(),
        ],
        bump = master_edition_info.mint_bump,
    )]
    pub master_edition_mint: Account<'info, Mint>,
    #[account(
        mut,
        constraint = master_edition_vault.mint == master_edition_mint.key() @ ErrorCode::WrongMasterEditionTokenAccount
    )]
    pub master_edition_vault: Box<Account<'info, TokenAccount>>,
}

#[derive(Accounts)]
pub struct DeleteDataSet<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [
            b"data_set".as_ref(),
            data_set.hash_id.as_ref(),
        ],
        close = authority,
        bump = data_set.bump,
        constraint = data_set.authority == authority.key()
    )]
    pub data_set: Account<'info, DataSet>,
    #[account(
        mut,
        seeds = [
            b"master_edition_info".as_ref(),
            data_set.key().as_ref(),
        ],
        bump = master_edition_info.bump,
        close = authority,
        constraint = data_set.authority == authority.key() @ ErrorCode::WrongOwnerOfTheNFT
    )]
    pub master_edition_info: Account<'info, MasterEditionInfo>,
}
#[account]
pub struct DataSet {
    pub hash_id: String, // limited to 32 bits
    pub title: String, // limited to 32 bits
    pub mint: Pubkey,
    pub authority: Pubkey,
    pub bump: u8,
}

impl DataSet {
    pub const SIZE: usize = 8 + 36 + 36 + 32 + 32 + 1;
}

#[account]
pub struct MasterEditionInfo {
    pub price: u32,
    pub quantity: u32,
    pub sold: u32,
    pub used: u32,
    pub unlimited_quantity: bool,
    pub bump: u8,
    pub mint_bump: u8,
    pub metadata_bump: u8,
}

impl MasterEditionInfo {
    pub const SIZE: usize = 8 + 4 + 4 + 4 + 4  + 1 + 1 + 1 + 1;
}

#[error_code]
pub enum ErrorCode {
    #[msg("There are not enough NFTs to buy.")]
    NotEnoughMintsAvailable,
    #[msg("You are providing a wrong seller mint")]
    WrongSellerMintProvided,
    #[msg("You are providing a wrong buyer mint.")]
    WrongBuyerMintProvided,
    #[msg("You are providing a wrong token account where the dataset NFT is stored.")]
    WrongMasterEditionTokenAccount,
    #[msg("You are trying to use an NFT that you don't own.")]
    WrongOwnerOfTheNFT,
}


/* Another way to mint NFTs from the master edition (would replace the cpi made to the mint ix of the token_program in buy_data_set ix):
    //Given a Masted Edition, this instruction creates a new Edition derived from a new Mint account.
    solana_program::program::invoke_signed(
        &mpl_token_metadata::instruction::mint_new_edition_from_master_edition_via_token(
            //args:
            mpl_token_metadata::ID, //program_id
            (*ctx.accounts.new_metadata).key(), //edition metadata
            *ctx.accounts.new_edition.key(), //edition
            ctx.accounts.master_edition.key(), //master_edition NFT
            ctx.accounts.master_edition_mint.key(), //mint
            ctx.accounts.data_set.key(), //mint_authority
            (*ctx.accounts.authority).key(), //payer
            ctx.accounts.token_account_owner.key(), 
            ctx.accounts.token_account.key(), 
            ctx.accounts.new_metadata_update_authority.key(), 
            ctx.accounts.metadata.key(), 
            ctx.accounts.metadata_mint.key(), 
            edition,
        ),
        //accounts context:
        &[
            ctx.accounts.new_metadata.to_account_info().clone(), //"New Metadata key (pda of ['metadata', program id, mint id])"
            ctx.accounts.new_edition.to_account_info().clone(), //"New Edition (pda of ['metadata', program id, mint id, 'edition'])"
            ctx.accounts.master_edition.to_account_info().clone(), //"Master Record Edition V2 (pda of ['metadata', program id, master metadata mint id, 'edition'])"
            ctx.accounts.new_mint.to_account_info().clone(), //"Mint of new token - THIS WILL TRANSFER AUTHORITY AWAY FROM THIS KEY"
            ctx.accounts.edition_mark_pda.to_account_info().clone(), //"Edition pda to mark creation - will be checked for pre-existence. (pda of ['metadata', program id, 
                                                                    //master metadata mint id, 'edition', edition_number]) where edition_number is NOT the edition number 
                                                                    //you pass in args but actually edition_number = floor(edition/EDITION_MARKER_BIT_SIZE)."
            ctx.accounts.new_mint_authority.to_account_info().clone(), //newMintAuthority
            ctx.accounts.authority.to_account_info().clone(), //payer
            ctx.accounts.data_set.to_account_info().clone(), //owner of token account containing master token
            ctx.accounts.master_edition_token_account.to_account_info().clone(), //"token account containing token from master metadata mint"
            ctx.accounts.data_set.to_account_info().clone(), //Update authority info for new metadata
            ctx.accounts.master_edition_metadata.to_account_info().clone(),
        ],
        &[&seeds[..]],
    )?;

    as we are not creating nfts, only metadata accounts, we cant use this:
    burn nfts ix from metadata_program using cpi:

    solana_program::program::invoke_signed(
        &mpl_token_metadata::instruction::burn_nft(
            //args:
            mpl_token_metadata::ID, //program_id
            (*ctx.accounts.master_edition_metadata).key(), //metadata_account
            ctx.accounts.data_set.key(), //owner
            ctx.accounts.master_edition_mint.key(), //mint
            (*ctx.accounts.master_edition_vault).key(), //token
            ctx.accounts.master_edition_account.key(), //edition
            ctx.accounts.token_program.key(), // spl-token program
            None,
        ),
        //accounts context:
        &[
            ctx.accounts.master_edition_metadata.to_account_info().clone(), //metadata
            ctx.accounts.data_set.to_account_info().clone(), //mint_authority
            ctx.accounts.master_edition_mint.to_account_info().clone(), //mint
            ctx.accounts.master_edition_vault.to_account_info().clone(), //token account
            ctx.accounts.master_edition_account.to_account_info().clone(), //master edition account
            ctx.accounts.token_program.to_account_info().clone(), //spl token program
        ],
        signer,
    )?;
*/ 
