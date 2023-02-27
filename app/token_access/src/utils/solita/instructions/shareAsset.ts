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
 * @category ShareAsset
 * @category generated
 */
export type ShareAssetInstructionArgs = {
  exemplars: number
}
/**
 * @category Instructions
 * @category ShareAsset
 * @category generated
 */
export const shareAssetStruct = new beet.BeetArgsStruct<
  ShareAssetInstructionArgs & {
    instructionDiscriminator: number[] /* size: 8 */
  }
>(
  [
    ['instructionDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)],
    ['exemplars', beet.u32],
  ],
  'ShareAssetInstructionArgs',
)
/**
 * Accounts required by the _shareAsset_ instruction
 *
 * @property [] associatedTokenProgram
 * @property [_writable_, **signer**] authority
 * @property [_writable_] asset
 * @property [_writable_] assetMint
 * @property [_writable_] receiverMintedTokenVault
 * @category Instructions
 * @category ShareAsset
 * @category generated
 */
export type ShareAssetInstructionAccounts = {
  systemProgram?: web3.PublicKey
  tokenProgram?: web3.PublicKey
  associatedTokenProgram: web3.PublicKey
  rent?: web3.PublicKey
  authority: web3.PublicKey
  asset: web3.PublicKey
  assetMint: web3.PublicKey
  receiverMintedTokenVault: web3.PublicKey
  anchorRemainingAccounts?: web3.AccountMeta[]
}

export const shareAssetInstructionDiscriminator = [
  135, 143, 194, 55, 137, 51, 31, 224,
]

/**
 * Creates a _ShareAsset_ instruction.
 *
 * @param accounts that will be accessed while the instruction is processed
 * @param args to provide as instruction data to the program
 *
 * @category Instructions
 * @category ShareAsset
 * @category generated
 */
export function createShareAssetInstruction(
  accounts: ShareAssetInstructionAccounts,
  args: ShareAssetInstructionArgs,
  programId = new web3.PublicKey(
    'FiShPdUdNuvhF9qETghrDWXiiAR8X2ujeGfGwSC84d4P',
  ),
) {
  const [data] = shareAssetStruct.serialize({
    instructionDiscriminator: shareAssetInstructionDiscriminator,
    ...args,
  })
  const keys: web3.AccountMeta[] = [
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
      pubkey: accounts.associatedTokenProgram,
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
      pubkey: accounts.asset,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.assetMint,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.receiverMintedTokenVault,
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
