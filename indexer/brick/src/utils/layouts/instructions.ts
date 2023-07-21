import { EventBase } from '@aleph-indexer/framework'
import * as solita from './solita/index.js'

export enum InstructionType {
  CreateGovernance = 'CreateGovernanceEvent',
  CreateProduct = 'CreateProductEvent',
  DeleteProduct = 'DeleteProductEvent',
  EditPoints = 'EditPointsEvent',
  EditPaymentMint = 'EditPaymentMintEvent',
  EditPrice = 'EditPriceEvent',
  InitBonus = 'InitBonusEvent',
  RegisterBuy = 'RegisterBuyEvent',
  RegisterPromoBuy = 'RegisterPromoBuyEvent',
  WithdrawBonus = 'WithdrawBonusEvent',
}

export type RawInstructionBase = {
  parsed: unknown
  program: string
  programId: string
}

export type InstructionBase = EventBase<InstructionType> & {
  programId: string
  signer: string
  account: string
}

/*-----------------------* CUSTOM EVENTS TYPES *-----------------------*/

export type CreateGovernanceInfo = solita.CreateGovernanceInstructionArgs & {
  systemProgram?: string
  tokenProgram?: string
  rent?: string
  governanceAuthority: string
  governance: string
  governanceMint: string
  governanceBonusVault: string
}

export type CreateGovernanceRaw = RawInstructionBase & {
  parsed: {
    info: CreateGovernanceInfo
    type: InstructionType.CreateGovernance
  }
}

/*----------------------------------------------------------------------*/

export type CreateProductInfo = solita.CreateProductInstructionArgs & {
  systemProgram?: string
  rent?: string
  productAuthority: string
  governance: string
  product: string
  paymentMint: string
}

export type CreateProductRaw = RawInstructionBase & {
  parsed: {
    info: CreateProductInfo
    type: InstructionType.CreateProduct
  }
}

/*----------------------------------------------------------------------*/

export type DeleteProductInfo = {
  productAuthority: string
  product: string
}

export type DeleteProductRaw = RawInstructionBase & {
  parsed: {
    info: DeleteProductInfo
    type: InstructionType.DeleteProduct
  }
}

/*----------------------------------------------------------------------*/

export type EditPointsInfo = solita.CreateProductInstructionArgs & {
  governanceAuthority: string
  governance: string
}

export type EditPointsRaw = RawInstructionBase & {
  parsed: {
    info: EditPointsInfo
    type: InstructionType.EditPoints
  }
}

/*----------------------------------------------------------------------*/

export type EditPaymentMintInfo = solita.CreateProductInstructionArgs & {
  productAuthority: string
  product: string
  paymentMint: string
}

export type EditPaymentMintRaw = RawInstructionBase & {
  parsed: {
    info: EditPaymentMintInfo
    type: InstructionType.EditPaymentMint
  }
}

/*----------------------------------------------------------------------*/

export type EditPriceInfo = solita.CreateProductInstructionArgs & {
  productAuthority: string
  product: string
}

export type EditPriceRaw = RawInstructionBase & {
  parsed: {
    info: EditPriceInfo
    type: InstructionType.EditPrice
  }
}

/*----------------------------------------------------------------------*/

export type InitBonusInfo = solita.CreateProductInstructionArgs & {
  systemProgram?: string
  tokenProgram?: string
  associatedTokenProgram: string
  rent?: string
  signer: string
  governance: string
  bonus: string
  bonusVault: string
  governanceMint: string
}

export type InitBonusRaw = RawInstructionBase & {
  parsed: {
    info: InitBonusInfo
    type: InstructionType.InitBonus
  }
}

/*----------------------------------------------------------------------*/

export type RegisterBuyInfo = solita.CreateProductInstructionArgs & {
  systemProgram?: string
  messagesProgram: string
  tokenProgram?: string
  rent?: string
  governanceAuthority: string
  signer: string
  governance: string
  product: string
  paymentMint: string
  governanceMint: string
  buyerTransferVault: string
  productAuthorityTransferVault: string
  governanceTransferVault: string
}

export type RegisterBuyRaw = RawInstructionBase & {
  parsed: {
    info: RegisterBuyInfo
    type: InstructionType.RegisterBuy
  }
}

/*----------------------------------------------------------------------*/

export type RegisterPromoBuyInfo = solita.CreateProductInstructionArgs & {
  systemProgram?: string
  messagesProgram: string
  tokenProgram?: string
  rent?: string
  governanceAuthority: string
  signer: string
  governance: string
  product: string
  governanceMint: string
  buyerTransferVault: string
  productAuthorityTransferVault: string
  governanceTransferVault :string
  governanceBonusVault: string
  productAuthorityBonus: string
  productAuthorityBonusVault: string
  buyerBonus: string
  buyerBonusVault: string
}

export type RegisterPromoBuyRaw = RawInstructionBase & {
  parsed: {
    info: RegisterPromoBuyInfo
    type: InstructionType.RegisterPromoBuy
  }
}

/*----------------------------------------------------------------------*/

export type WithdrawBonusInfo = solita.CreateProductInstructionArgs & {
  tokenProgram?: string
  signer: string
  governance: string
  bonus: string
  governanceMint: string
  governanceBonusVault: string
  receiverVault: string
  bonusVault: string
}

export type WithdrawBonusRaw = RawInstructionBase & {
  parsed: {
    info: WithdrawBonusInfo
    type: InstructionType.WithdrawBonus
  }
}

/*----------------------------------------------------------------------*/

export function getInstructionType(data: Buffer): InstructionType | undefined {
  const discriminator = data.slice(0, 8)
  return IX_METHOD_CODE.get(discriminator.toString('ascii'))
}

export const IX_METHOD_CODE: Map<string, InstructionType | undefined> = new Map<
  string,
  InstructionType | undefined
>([
  [
    Buffer.from(solita.createGovernanceInstructionDiscriminator).toString(
      'ascii',
    ),
    InstructionType.CreateGovernance,
  ],
  [
    Buffer.from(solita.createProductInstructionDiscriminator).toString('ascii'),
    InstructionType.CreateProduct,
  ],
  [
    Buffer.from(solita.deleteProductInstructionDiscriminator).toString('ascii'),
    InstructionType.DeleteProduct,
  ],
  [
    Buffer.from(solita.editPointsInstructionDiscriminator).toString('ascii'),
    InstructionType.EditPoints,
  ],
  [
    Buffer.from(solita.editPaymentMintInstructionDiscriminator).toString(
      'ascii',
    ),
    InstructionType.EditPaymentMint,
  ],
  [
    Buffer.from(solita.editPriceInstructionDiscriminator).toString('ascii'),
    InstructionType.EditPrice,
  ],
  [
    Buffer.from(solita.initBonusInstructionDiscriminator).toString('ascii'),
    InstructionType.InitBonus,
  ],
  [
    Buffer.from(solita.registerBuyInstructionDiscriminator).toString('ascii'),
    InstructionType.RegisterBuy,
  ],
  [
    Buffer.from(solita.registerPromoBuyInstructionDiscriminator).toString(
      'ascii',
    ),
    InstructionType.RegisterPromoBuy,
  ],
  [
    Buffer.from(solita.withdrawBonusInstructionDiscriminator).toString('ascii'),
    InstructionType.WithdrawBonus,
  ],
])

export const IX_DATA_LAYOUT: Partial<Record<InstructionType, any>> = {
  [InstructionType.CreateGovernance]: solita.createGovernanceStruct,
  [InstructionType.CreateProduct]: solita.createProductStruct,
  [InstructionType.DeleteProduct]: solita.deleteProductStruct,
  [InstructionType.EditPoints]: solita.editPointsStruct,
  [InstructionType.EditPaymentMint]: solita.editPaymentMintStruct,
  [InstructionType.EditPrice]: solita.editPriceStruct,
  [InstructionType.InitBonus]: solita.initBonusStruct,
  [InstructionType.RegisterBuy]: solita.registerBuyStruct,
  [InstructionType.RegisterPromoBuy]: solita.registerPromoBuyStruct,
  [InstructionType.WithdrawBonus]: solita.withdrawBonusStruct,
}

export const IX_ACCOUNTS_LAYOUT: Partial<Record<InstructionType, any>> = {
  [InstructionType.CreateGovernance]: solita.CreateGovernanceAccounts,
  [InstructionType.CreateProduct]: solita.CreateProductAccounts,
  [InstructionType.DeleteProduct]: solita.DeleteProductAccounts,
  [InstructionType.EditPoints]: solita.EditPointsAccounts,
  [InstructionType.EditPaymentMint]: solita.EditPaymentMintAccounts,
  [InstructionType.EditPrice]: solita.EditPriceAccounts,
  [InstructionType.InitBonus]: solita.InitBonusAccounts,
  [InstructionType.RegisterBuy]: solita.RegisterBuyAccounts,
  [InstructionType.RegisterPromoBuy]: solita.RegisterPromoBuyAccounts,
  [InstructionType.WithdrawBonus]: solita.WithdrawBonusAccounts,
}

export const IX_KEY_ACCOUNTS: Record<InstructionType, string[]> = {
  [InstructionType.CreateGovernance]: ['governance', 'governanceAuthority'],
  [InstructionType.CreateProduct]: ['product', 'productAuthority'],
  [InstructionType.DeleteProduct]: ['product', 'productAuthority'],
  [InstructionType.EditPoints]: ['governance', 'governanceAuthority'],
  [InstructionType.EditPaymentMint]: ['product', 'productAuthority'],
  [InstructionType.EditPrice]: ['product', 'productAuthority'],
  [InstructionType.InitBonus]: ['bonus', 'signer'],
  [InstructionType.RegisterBuy]: ['product', 'signer'],
  [InstructionType.RegisterPromoBuy]: ['product', 'signer'],
  [InstructionType.WithdrawBonus]: ['bonus', 'signer'],
}

export type RawInstructionInfo =
  | CreateGovernanceInfo
  | CreateProductInfo
  | DeleteProductInfo
  | EditPointsInfo
  | EditPaymentMintInfo
  | EditPriceInfo
  | InitBonusInfo
  | RegisterBuyInfo
  | RegisterPromoBuyInfo
  | WithdrawBonusInfo

export type RawInstruction =
  | CreateGovernanceRaw
  | CreateProductRaw
  | DeleteProductRaw
  | EditPointsRaw
  | EditPaymentMintRaw
  | EditPriceRaw
  | InitBonusRaw
  | RegisterBuyRaw
  | RegisterPromoBuyRaw
  | WithdrawBonusRaw

export enum InstructionInfo {
  CreateGovernanceInfo = 'CreateGovernanceInfo',
  CreateProductInfo = 'CreateProductInfo',
  DeleteProductInfo = 'DeleteProductInfo',
  EditPointsInfo = 'EditPointsInfo',
  EditPaymentMintInfo = 'EditPaymentMintInfo',
  EditPriceInfo = 'EditPriceInfo',
  InitBonusInfo = 'InitBonusInfo',
  RegisterBuyInfo = 'RegisterBuyInfo',
  RegisterPromoBuyInfo = 'RegisterPromoBuyInfo',
  WithdrawBonusInfo = 'WithdrawBonusInfo',
}

export interface EventInfo<InstructionInfo> {
  info: InstructionInfo
  signer: string
  account: string
}

export type CreateGovernanceEvent = EventBase<InstructionType> & EventInfo<CreateGovernanceInfo>
export type CreateProductEvent = EventBase<InstructionType> & EventInfo<CreateProductInfo>
export type DeleteProductEvent = EventBase<InstructionType> & EventInfo<DeleteProductInfo>
export type EditPointsEvent = EventBase<InstructionType> & EventInfo<EditPointsInfo>
export type EditPaymentMintEvent = EventBase<InstructionType> & EventInfo<EditPaymentMintInfo>
export type EditPriceEvent = EventBase<InstructionType> & EventInfo<EditPriceInfo>
export type InitBonusEvent = EventBase<InstructionType> & EventInfo<InitBonusInfo>
export type RegisterBuyEvent = EventBase<InstructionType> & EventInfo<RegisterBuyInfo>
export type RegisterPromoBuyEvent = EventBase<InstructionType> & EventInfo<RegisterPromoBuyInfo>
export type WithdrawBonusEvent = EventBase<InstructionType> & EventInfo<WithdrawBonusInfo>

export type BrickEvent = 
  | CreateGovernanceEvent
  | CreateProductEvent
  | DeleteProductEvent
  | EditPointsEvent
  | EditPaymentMintEvent
  | EditPriceEvent
  | InitBonusEvent
  | RegisterBuyEvent
  | RegisterPromoBuyEvent
  | WithdrawBonusEvent
