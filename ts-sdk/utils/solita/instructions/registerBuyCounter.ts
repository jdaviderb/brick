/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as beet from '@metaplex-foundation/beet'
import * as web3 from '@solana/web3.js'
import { BRICK_PROGRAM_ID_PK } from '../../../constants'

/**
 * @category Instructions
 * @category RegisterBuyCounter
 * @category generated
 */
export type RegisterBuyCounterInstructionArgs = {
  amount: number
}
/**
 * @category Instructions
 * @category RegisterBuyCounter
 * @category generated
 */
export const registerBuyCounterStruct = new beet.BeetArgsStruct<
  RegisterBuyCounterInstructionArgs & {
    instructionDiscriminator: number[] /* size: 8 */
  }
>(
  [
    ['instructionDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)],
    ['amount', beet.u32],
  ],
  'RegisterBuyCounterInstructionArgs',
)
/**
 * Accounts required by the _registerBuyCounter_ instruction
 *
 * @property [] tokenProgramV0
 * @property [_writable_, **signer**] signer
 * @property [_writable_] seller (optional)
 * @property [_writable_] marketplaceAuth (optional)
 * @property [_writable_] marketplace
 * @property [_writable_] product
 * @property [_writable_] payment
 * @property [] paymentMint
 * @property [_writable_] buyerTransferVault (optional)
 * @property [_writable_] sellerTransferVault (optional)
 * @property [_writable_] marketplaceTransferVault (optional)
 * @property [_writable_] bountyVault (optional)
 * @property [_writable_] sellerReward (optional)
 * @property [_writable_] sellerRewardVault (optional)
 * @property [_writable_] buyerReward (optional)
 * @property [_writable_] buyerRewardVault (optional)
 * @category Instructions
 * @category RegisterBuyCounter
 * @category generated
 */
export type RegisterBuyCounterInstructionAccounts = {
  systemProgram?: web3.PublicKey
  tokenProgramV0: web3.PublicKey
  rent?: web3.PublicKey
  signer: web3.PublicKey
  seller?: web3.PublicKey | null
  marketplaceAuth?: web3.PublicKey | null
  marketplace: web3.PublicKey
  product: web3.PublicKey
  payment: web3.PublicKey
  paymentMint: web3.PublicKey
  buyerTransferVault?: web3.PublicKey | null
  sellerTransferVault?: web3.PublicKey | null
  marketplaceTransferVault?: web3.PublicKey | null
  bountyVault?: web3.PublicKey | null
  sellerReward?: web3.PublicKey | null
  sellerRewardVault?: web3.PublicKey | null
  buyerReward?: web3.PublicKey | null
  buyerRewardVault?: web3.PublicKey | null
  anchorRemainingAccounts?: web3.AccountMeta[]
}

export const registerBuyCounterInstructionDiscriminator = [
  83, 206, 165, 4, 213, 174, 182, 27,
]

/**
 * Creates a _RegisterBuyCounter_ instruction.
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
 * @category RegisterBuyCounter
 * @category generated
 */
export function createRegisterBuyCounterInstruction(
  accounts: RegisterBuyCounterInstructionAccounts,
  args: RegisterBuyCounterInstructionArgs,
  programId = new web3.PublicKey('brick5uEiJqSkfuAvMtKmq7kiuEVmbjVMiigyV51GRF'),
) {
  const [data] = registerBuyCounterStruct.serialize({
    instructionDiscriminator: registerBuyCounterInstructionDiscriminator,
    ...args,
  })
  const keys: web3.AccountMeta[] = [
    {
      pubkey: accounts.systemProgram ?? web3.SystemProgram.programId,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.tokenProgramV0,
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
  ]

  if (accounts.seller != null) {
    keys.push({
      pubkey: accounts.seller,
      isWritable: true,
      isSigner: false,
    })
  }
  if (accounts.marketplaceAuth != null) {
    if (accounts.seller == null) {
      throw new Error(
        "When providing 'marketplaceAuth' then 'accounts.seller' need(s) to be provided as well.",
      )
    }
    keys.push({
      pubkey: accounts.marketplaceAuth,
      isWritable: true,
      isSigner: false,
    })
  }
  keys.push({
    pubkey: accounts.marketplace,
    isWritable: true,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.product,
    isWritable: true,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.payment,
    isWritable: true,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.paymentMint,
    isWritable: false,
    isSigner: false,
  })
  if (accounts.buyerTransferVault != null) {
    keys.push({
      pubkey: accounts.buyerTransferVault,
      isWritable: true,
      isSigner: false,
    })
  } else {
    keys.push({
      pubkey: BRICK_PROGRAM_ID_PK,
      isWritable: false,
      isSigner: false,
    })
  }
  if (accounts.sellerTransferVault != null) {
    keys.push({
      pubkey: accounts.sellerTransferVault,
      isWritable: true,
      isSigner: false,
    })
  } else {
    keys.push({
      pubkey: BRICK_PROGRAM_ID_PK,
      isWritable: false,
      isSigner: false,
    })
  }
  if (accounts.marketplaceTransferVault != null) {
    keys.push({
      pubkey: accounts.marketplaceTransferVault,
      isWritable: true,
      isSigner: false,
    })
  } else {
    keys.push({
      pubkey: BRICK_PROGRAM_ID_PK,
      isWritable: false,
      isSigner: false,
    })
  }
  if (accounts.bountyVault != null) {
    keys.push({
      pubkey: accounts.bountyVault,
      isWritable: true,
      isSigner: false,
    })
  } else {
    keys.push({
      pubkey: BRICK_PROGRAM_ID_PK,
      isWritable: false,
      isSigner: false,
    })
  }
  if (accounts.sellerReward != null) {
    keys.push({
      pubkey: accounts.sellerReward,
      isWritable: true,
      isSigner: false,
    })
  } else {
    keys.push({
      pubkey: BRICK_PROGRAM_ID_PK,
      isWritable: false,
      isSigner: false,
    })
  }
  if (accounts.sellerRewardVault != null) {
    keys.push({
      pubkey: accounts.sellerRewardVault,
      isWritable: true,
      isSigner: false,
    })
  } else {
    keys.push({
      pubkey: BRICK_PROGRAM_ID_PK,
      isWritable: false,
      isSigner: false,
    })
  }
  if (accounts.buyerReward != null) {
    keys.push({
      pubkey: accounts.buyerReward,
      isWritable: true,
      isSigner: false,
    })
  } else {
    keys.push({
      pubkey: BRICK_PROGRAM_ID_PK,
      isWritable: false,
      isSigner: false,
    })
  }
  if (accounts.buyerRewardVault != null) {
    keys.push({
      pubkey: accounts.buyerRewardVault,
      isWritable: true,
      isSigner: false,
    })
  } else {
    keys.push({
      pubkey: BRICK_PROGRAM_ID_PK,
      isWritable: false,
      isSigner: false,
    })
  }

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
