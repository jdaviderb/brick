// Thanks @redacted_noah and helium foundation to open source their code

use anchor_lang::{prelude::*, solana_program};
use mpl_token_metadata::{
  ID,
  state::{DataV2, CollectionDetails}
};

#[derive(Accounts)]
pub struct CreateMetadataAccountsV3<'info> {
  /// CHECK:
  pub metadata: AccountInfo<'info>,
  /// CHECK:
  pub mint: AccountInfo<'info>,
  /// CHECK:
  pub mint_authority: AccountInfo<'info>,
  /// CHECK:
  pub payer: AccountInfo<'info>,
  /// CHECK:
  pub update_authority: AccountInfo<'info>,
  /// CHECK:
  pub system_program: AccountInfo<'info>,
  /// CHECK:
  pub rent: AccountInfo<'info>,
}

pub fn create_metadata_accounts_v3<'info>(
  ctx: CpiContext<'_, '_, '_, 'info, CreateMetadataAccountsV3<'info>>,
  data: DataV2,
  is_mutable: bool,
  update_authority_is_signer: bool,
  details: Option<CollectionDetails>,
) -> Result<()> {
  let DataV2 {
    name,
    symbol,
    uri,
    creators,
    seller_fee_basis_points,
    collection,
    uses,
  } = data;
  let ix = mpl_token_metadata::instruction::create_metadata_accounts_v3(
    ID,
    *ctx.accounts.metadata.key,
    *ctx.accounts.mint.key,
    *ctx.accounts.mint_authority.key,
    *ctx.accounts.payer.key,
    *ctx.accounts.update_authority.key,
    name,
    symbol,
    uri,
    creators,
    seller_fee_basis_points,
    update_authority_is_signer,
    is_mutable,
    collection,
    uses,
    details,
  );
  solana_program::program::invoke_signed(
    &ix,
    &ToAccountInfos::to_account_infos(&ctx),
    ctx.signer_seeds,
  )
  .map_err(Into::into)
}

#[derive(Clone)]
pub struct Metadata;

impl anchor_lang::Id for Metadata {
  fn id() -> Pubkey {
    ID
  }
}

#[derive(Accounts)]
pub struct CreateMasterEditionV3<'info> {
  /// CHECK:
  pub edition: AccountInfo<'info>,
  /// CHECK:
  pub mint: AccountInfo<'info>,
  /// CHECK:
  pub update_authority: AccountInfo<'info>,
  /// CHECK:
  pub mint_authority: AccountInfo<'info>,
  /// CHECK:
  pub payer: AccountInfo<'info>,
  /// CHECK:
  pub metadata: AccountInfo<'info>,
  /// CHECK:
  pub token_program: AccountInfo<'info>,
  /// CHECK:
  pub system_program: AccountInfo<'info>,
  /// CHECK:
  pub rent: AccountInfo<'info>,
}

pub fn create_master_edition_v3<'info>(
  ctx: CpiContext<'_, '_, '_, 'info, CreateMasterEditionV3<'info>>,
  max_supply: Option<u64>,
) -> Result<()> {
  let ix = mpl_token_metadata::instruction::create_master_edition_v3(
    ID,
    *ctx.accounts.edition.key,
    *ctx.accounts.mint.key,
    *ctx.accounts.update_authority.key,
    *ctx.accounts.mint_authority.key,
    *ctx.accounts.metadata.key,
    *ctx.accounts.payer.key,
    max_supply,
  );
  solana_program::program::invoke_signed(
    &ix,
    &ToAccountInfos::to_account_infos(&ctx),
    ctx.signer_seeds,
  )
  .map_err(Into::into)
}