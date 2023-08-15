/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as beet from '@metaplex-foundation/beet'
import * as web3 from '@solana/web3.js'
import {
  InitProductTreeParams,
  initProductTreeParamsBeet,
} from '../types/InitProductTreeParams'

/**
 * @category Instructions
 * @category InitProductTree
 * @category generated
 */
export type InitProductTreeInstructionArgs = {
  params: InitProductTreeParams
}
/**
 * @category Instructions
 * @category InitProductTree
 * @category generated
 */
export const initProductTreeStruct = new beet.FixableBeetArgsStruct<
  InitProductTreeInstructionArgs & {
    instructionDiscriminator: number[] /* size: 8 */
  }
>(
  [
    ['instructionDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)],
    ['params', initProductTreeParamsBeet],
  ],
  'InitProductTreeInstructionArgs',
)
/**
 * Accounts required by the _initProductTree_ instruction
 *
 * @property [] tokenMetadataProgram
 * @property [] logWrapper
 * @property [] bubblegumProgram
 * @property [] compressionProgram
 * @property [] tokenProgramV0
 * @property [] associatedTokenProgram
 * @property [_writable_, **signer**] signer
 * @property [_writable_] marketplace
 * @property [_writable_] product
 * @property [_writable_] productMint
 * @property [] paymentMint
 * @property [_writable_] accessMint (optional)
 * @property [_writable_] productMintVault
 * @property [_writable_] accessVault (optional)
 * @property [_writable_] masterEdition
 * @property [_writable_] metadata
 * @property [_writable_] merkleTree
 * @property [_writable_] treeAuthority
 * @category Instructions
 * @category InitProductTree
 * @category generated
 */
export type InitProductTreeInstructionAccounts = {
  tokenMetadataProgram: web3.PublicKey
  logWrapper: web3.PublicKey
  systemProgram?: web3.PublicKey
  bubblegumProgram: web3.PublicKey
  compressionProgram: web3.PublicKey
  tokenProgramV0: web3.PublicKey
  associatedTokenProgram: web3.PublicKey
  rent?: web3.PublicKey
  signer: web3.PublicKey
  marketplace: web3.PublicKey
  product: web3.PublicKey
  productMint: web3.PublicKey
  paymentMint: web3.PublicKey
  accessMint?: web3.PublicKey
  productMintVault: web3.PublicKey
  accessVault?: web3.PublicKey
  masterEdition: web3.PublicKey
  metadata: web3.PublicKey
  merkleTree: web3.PublicKey
  treeAuthority: web3.PublicKey
  anchorRemainingAccounts?: web3.AccountMeta[]
}

export const initProductTreeInstructionDiscriminator = [
  81, 249, 167, 74, 211, 240, 225, 5,
]

/**
 * Creates a _InitProductTree_ instruction.
 *
 * Optional accounts that are not provided will be omitted from the accounts
 * array passed with the instruction.
 * An optional account that is set cannot follow an optional account that is unset.
 * Otherwise an Error is raised.
 *
 * @param accounts that will be accessed while the instruction is processed
 * @param args to provide as instruction data to the program
 *
 * @category Instructions
 * @category InitProductTree
 * @category generated
 */
export function createInitProductTreeInstruction(
  accounts: InitProductTreeInstructionAccounts,
  args: InitProductTreeInstructionArgs,
  programId = new web3.PublicKey('brick5uEiJqSkfuAvMtKmq7kiuEVmbjVMiigyV51GRF'),
) {
  const [data] = initProductTreeStruct.serialize({
    instructionDiscriminator: initProductTreeInstructionDiscriminator,
    ...args,
  })
  const keys: web3.AccountMeta[] = [
    {
      pubkey: accounts.tokenMetadataProgram,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.logWrapper,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.systemProgram ?? web3.SystemProgram.programId,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.bubblegumProgram,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.compressionProgram,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.tokenProgramV0,
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
      pubkey: accounts.signer,
      isWritable: true,
      isSigner: true,
    },
    {
      pubkey: accounts.marketplace,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.product,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.productMint,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.paymentMint,
      isWritable: false,
      isSigner: false,
    },
  ]

  if (accounts.accessMint != null) {
    keys.push({
      pubkey: accounts.accessMint,
      isWritable: true,
      isSigner: false,
    })
  }
  keys.push({
    pubkey: accounts.productMintVault,
    isWritable: true,
    isSigner: false,
  })
  if (accounts.accessVault != null) {
    if (accounts.accessMint == null) {
      throw new Error(
        "When providing 'accessVault' then 'accounts.accessMint' need(s) to be provided as well.",
      )
    }
    keys.push({
      pubkey: accounts.accessVault,
      isWritable: true,
      isSigner: false,
    })
  }
  keys.push({
    pubkey: accounts.masterEdition,
    isWritable: true,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.metadata,
    isWritable: true,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.merkleTree,
    isWritable: true,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.treeAuthority,
    isWritable: true,
    isSigner: false,
  })

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
