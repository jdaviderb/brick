/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as splToken from '@solana/spl-token'
import * as beet from '@metaplex-foundation/beet'
import * as web3 from '@solana/web3.js'

/**
 * @category Instructions
 * @category CreateAsset
 * @category generated
 */
export type CreateAssetInstructionArgs = {
  hashId: string
  appName: string
  itemHash: string
  tokenPrice: number
  exemplars: number
  quantityPerExemplars: number
  tokenName: string
  tokenSymbol: string
  tokenUri: string
}
/**
 * @category Instructions
 * @category CreateAsset
 * @category generated
 */
export const createAssetStruct = new beet.FixableBeetArgsStruct<
  CreateAssetInstructionArgs & {
    instructionDiscriminator: number[] /* size: 8 */
  }
>(
  [
    ['instructionDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)],
    ['hashId', beet.utf8String],
    ['appName', beet.utf8String],
    ['itemHash', beet.utf8String],
    ['tokenPrice', beet.u32],
    ['exemplars', beet.i32],
    ['quantityPerExemplars', beet.u32],
    ['tokenName', beet.utf8String],
    ['tokenSymbol', beet.utf8String],
    ['tokenUri', beet.utf8String],
  ],
  'CreateAssetInstructionArgs',
)
/**
 * Accounts required by the _createAsset_ instruction
 *
 * @property [] metadataProgram
 * @property [_writable_, **signer**] authority
 * @property [_writable_] assetMint
 * @property [_writable_] asset
 * @property [] acceptedMint
 * @property [_writable_] tokenMetadata
 * @category Instructions
 * @category CreateAsset
 * @category generated
 */
export type CreateAssetInstructionAccounts = {
  metadataProgram: web3.PublicKey
  systemProgram?: web3.PublicKey
  tokenProgram?: web3.PublicKey
  rent?: web3.PublicKey
  authority: web3.PublicKey
  assetMint: web3.PublicKey
  asset: web3.PublicKey
  acceptedMint: web3.PublicKey
  tokenMetadata: web3.PublicKey
  anchorRemainingAccounts?: web3.AccountMeta[]
}

export const createAssetInstructionDiscriminator = [
  28, 42, 120, 51, 7, 38, 156, 136,
]

/**
 * Creates a _CreateAsset_ instruction.
 *
 * @param accounts that will be accessed while the instruction is processed
 * @param args to provide as instruction data to the program
 *
 * @category Instructions
 * @category CreateAsset
 * @category generated
 */
export function createCreateAssetInstruction(
  accounts: CreateAssetInstructionAccounts,
  args: CreateAssetInstructionArgs,
  programId = new web3.PublicKey(
    'FiShPdUdNuvhF9qETghrDWXiiAR8X2ujeGfGwSC84d4P',
  ),
) {
  const [data] = createAssetStruct.serialize({
    instructionDiscriminator: createAssetInstructionDiscriminator,
    ...args,
  })
  const keys: web3.AccountMeta[] = [
    {
      pubkey: accounts.metadataProgram,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.systemProgram ?? web3.SystemProgram.programId,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.tokenProgram ?? splToken.TOKEN_PROGRAM_ID,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.rent ?? web3.SYSVAR_RENT_PUBKEY,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.authority,
      isWritable: true,
      isSigner: true,
    },
    {
      pubkey: accounts.assetMint,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.asset,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.acceptedMint,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.tokenMetadata,
      isWritable: true,
      isSigner: false,
    },
  ]

  if (accounts.anchorRemainingAccounts != null) {
    for (const acc of accounts.anchorRemainingAccounts) {
      keys.push(acc)
    }
  }

  const ix = new web3.TransactionInstruction({
    programId,
    keys,
    data,
  })
  return ix
}
