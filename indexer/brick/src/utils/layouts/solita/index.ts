import { AccountMeta, PublicKey } from '@solana/web3.js'
export * from './accounts/index.js'
export * from './instructions/index.js'
export * from './types/index.js'

import {
  Bonus,
  BonusArgs,
  Governance,
  GovernanceArgs,
  Product,
  ProductArgs,
} from './accounts/index.js'

import {
  CreateGovernanceParams,
  CreateProductParams,
  EditPointsParams,
  SellerConfig,
} from './types/index.js'

export type CreateGovernanceInstruction = {
  programId: PublicKey
  keys: AccountMeta[]
  data: Buffer
}

export const CreateGovernanceAccounts = [
  'systemProgram',
  'tokenProgram',
  'rent',
  'governanceAuthority',
  'governance',
  'governanceMint',
  'governanceBonusVault',
]

export type CreateProductInstruction = {
  programId: PublicKey
  keys: AccountMeta[]
  data: Buffer
}

export const CreateProductAccounts = [
  'systemProgram',
  'rent',
  'productAuthority',
  'governance',
  'product',
  'paymentMint',
]

export type DeleteProductInstruction = {
  programId: PublicKey
  keys: AccountMeta[]
  data: Buffer
}

export const DeleteProductAccounts = ['productAuthority', 'product']

export type EditPointsInstruction = {
  programId: PublicKey
  keys: AccountMeta[]
  data: Buffer
}

export const EditPointsAccounts = ['governanceAuthority', 'governance']

export type EditPaymentMintInstruction = {
  programId: PublicKey
  keys: AccountMeta[]
  data: Buffer
}

export const EditPaymentMintAccounts = [
  'productAuthority',
  'product',
  'paymentMint',
]

export type EditPriceInstruction = {
  programId: PublicKey
  keys: AccountMeta[]
  data: Buffer
}

export const EditPriceAccounts = ['productAuthority', 'product']

export type InitBonusInstruction = {
  programId: PublicKey
  keys: AccountMeta[]
  data: Buffer
}

export const InitBonusAccounts = [
  'systemProgram',
  'tokenProgram',
  'associatedTokenProgram',
  'rent',
  'signer',
  'governance',
  'bonus',
  'bonusVault',
  'governanceMint',
]

export type RegisterBuyInstruction = {
  programId: PublicKey
  keys: AccountMeta[]
  data: Buffer
}

export const RegisterBuyAccounts = [
  'systemProgram',
  'messagesProgram',
  'tokenProgram',
  'rent',
  'governanceAuthority',
  'signer',
  'governance',
  'product',
  'paymentMint',
  'governanceMint',
  'buyerTransferVault',
  'productAuthorityTransferVault',
  'governanceTransferVault',
]

export type RegisterPromoBuyInstruction = {
  programId: PublicKey
  keys: AccountMeta[]
  data: Buffer
}

export const RegisterPromoBuyAccounts = [
  'systemProgram',
  'messagesProgram',
  'tokenProgram',
  'rent',
  'governanceAuthority',
  'signer',
  'governance',
  'product',
  'governanceMint',
  'buyerTransferVault',
  'productAuthorityTransferVault',
  'governanceTransferVault',
  'governanceBonusVault',
  'productAuthorityBonus',
  'productAuthorityBonusVault',
  'buyerBonus',
  'buyerBonusVault',
]

export type WithdrawBonusInstruction = {
  programId: PublicKey
  keys: AccountMeta[]
  data: Buffer
}

export const WithdrawBonusAccounts = [
  'tokenProgram',
  'signer',
  'governance',
  'bonus',
  'governanceMint',
  'governanceBonusVault',
  'receiverVault',
  'bonusVault',
]

export type ParsedInstructions =
  | CreateGovernanceInstruction
  | CreateProductInstruction
  | DeleteProductInstruction
  | EditPointsInstruction
  | EditPaymentMintInstruction
  | EditPriceInstruction
  | InitBonusInstruction
  | RegisterBuyInstruction
  | RegisterPromoBuyInstruction
  | WithdrawBonusInstruction
export type ParsedAccounts = Bonus | Governance | Product

export type ParsedAccountsData = BonusArgs | GovernanceArgs | ProductArgs

export type ParsedTypes =
  | CreateGovernanceParams
  | CreateProductParams
  | EditPointsParams
  | SellerConfig
