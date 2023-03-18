import * as solita from './solita/index.js'
import { EventBase } from '@aleph-indexer/framework';

export enum InstructionType {
  CreateApp = 'CreateApp',
  CreateToken = 'CreateToken',
  EditTokenPrice = 'EditTokenPrice',
  BuyToken = 'BuyToken',
  ShareToken = 'ShareToken',
  WithdrawFunds = 'WithdrawFunds',
  Refund = 'Refund',
  UseToken = 'UseToken',
  DeleteToken = 'DeleteToken',
}

export type RawInstructionBase = {
  parsed: unknown
  program: string
  programId: string
}

/*-----------------------* CUSTOM RAW INSTRUCTION TYPES *-----------------------*/

// cant use solita ix accounts because the framework converts all pubkeys to strings
export type CreateAppInfo = solita.CreateAppInstructionArgs & {
  systemProgram?: string
  rent?: string
  authority: string
  app: string
}

export type RawCreateApp = RawInstructionBase & {
   parsed: {
    info: CreateAppInfo
    type: InstructionType.CreateApp
  }
}

/*----------------------------------------------------------------------*/

export type CreateTokenInfo = solita.CreateTokenInstructionArgs & {
  metadataProgram: string
  systemProgram?: string
  tokenProgram?: string
  rent?: string
  authority: string
  app: string
  tokenMint: string
  token: string
  acceptedMint: string
  tokenMetadata: string
}

export type RawCreateToken = RawInstructionBase & {
  parsed: {
    info: CreateTokenInfo
    type: InstructionType.CreateToken
  }
}

/*----------------------------------------------------------------------*/

export type EditTokenPriceInfo = solita.EditTokenPriceInstructionArgs & {
  authority: string
  token: string
}

export type RawEditTokenPrice = RawInstructionBase & {
  parsed: {
    info: EditTokenPriceInfo
    type: InstructionType.EditTokenPrice
  }
}

/*----------------------------------------------------------------------*/

export type BuyTokenInfo = solita.BuyTokenInstructionArgs & {
  systemProgram?: string
  tokenProgram?: string
  associatedTokenProgram: string
  rent?: string
  clock: string
  authority: string
  token: string
  tokenMint: string
  buyerTransferVault: string
  acceptedMint: string
  payment: string
  paymentVault: string
  buyerTokenVault: string
}

export type RawBuyToken = RawInstructionBase & {
  parsed: {
    info: BuyTokenInfo
    type: InstructionType.BuyToken
  }
}

/*----------------------------------------------------------------------*/

export type ShareTokenInfo = solita.ShareTokenInstructionArgs & {
  systemProgram?: string
  tokenProgram?: string
  associatedTokenProgram: string
  rent?: string
  authority: string
  token: string
  tokenMint: string
  receiverVault: string
}

export type RawShareToken = RawInstructionBase & {
  parsed: {
    info: ShareTokenInfo
    type: InstructionType.ShareToken
  }
}

/*----------------------------------------------------------------------*/

export type WithdrawFundsInfo = {
  tokenProgram?: string
  authority: string
  app: string
  appCreatorVault: string
  token: string
  tokenMint: string
  receiverVault: string
  buyer: string
  payment: string
  paymentVault: string
}

export type RawWithdrawFunds = RawInstructionBase & {
  parsed: {
    info: WithdrawFundsInfo
    type: InstructionType.WithdrawFunds
  }
}

/*----------------------------------------------------------------------*/

export type RefundInfo = {
  tokenProgram?: string
  authority: string
  token: string
  tokenMint: string
  receiverVault: string
  payment: string
  paymentVault: string
  buyerTokenVault: string
}

export type RawRefund = RawInstructionBase & {
  parsed: {
    info: RefundInfo
    type: InstructionType.Refund
  }
}

/*----------------------------------------------------------------------*/

export type UseTokenInfo = {    
  systemProgram?: string
  tokenProgram?: string
  associatedTokenProgram: string
  rent?: string
  authority: string
  token: string
  tokenMint: string
  buyerTokenVault: string
}

export type RawUseToken = RawInstructionBase & {
  parsed: {
    info: UseTokenInfo
    type: InstructionType.UseToken
  }
}

/*----------------------------------------------------------------------*/

export type DeleteTokenInfo = {
  authority: string
  token: string
}

export type RawDeletetoken = RawInstructionBase & {
  parsed: {
    info: DeleteTokenInfo
    type: InstructionType.DeleteToken
  }
}

/*----------------------------------------------------------------------*/

export type RawInstructionsInfo =
  | CreateAppInfo
  | CreateTokenInfo
  | EditTokenPriceInfo
  | BuyTokenInfo
  | ShareTokenInfo
  | WithdrawFundsInfo
  | RefundInfo
  | UseTokenInfo
  | DeleteTokenInfo

export type RawInstruction =
  | RawCreateApp
  | RawCreateToken
  | RawEditTokenPrice
  | RawBuyToken
  | RawShareToken
  | RawWithdrawFunds
  | RawRefund
  | RawUseToken
  | RawDeletetoken

export type BrickCreateAppEvent = EventBase<InstructionType> & {
  info: CreateAppInfo
  signer: string
  account: string
}

export type BrickCreateTokenEvent = EventBase<InstructionType> & {
  info: CreateTokenInfo
  signer: string
  account: string
}
export type BrickEditTokenPriceEvent = EventBase<InstructionType> & {
  info: EditTokenPriceInfo
  signer: string
  account: string
}

export type BrickBuyTokenEvent = EventBase<InstructionType> & {
  info: BuyTokenInfo
  signer: string
  account: string
}

export type BrickShareTokenEvent = EventBase<InstructionType> & {
  info: ShareTokenInfo
  signer: string
  account: string
}

export type BrickWithdrawFundsEvent = EventBase<InstructionType> & {
  info: WithdrawFundsInfo
  signer: string
  account: string
}

export type BrickRefundEvent = EventBase<InstructionType> & {
  info: RefundInfo
  signer: string
  account: string
}

export type BrickUseTokenEvent = EventBase<InstructionType> & {
  info: UseTokenInfo
  signer: string
  account: string
}

export type BrickDeleteTokenEvent = EventBase<InstructionType> & {
  info: DeleteTokenInfo
  signer: string
  account: string
}

export type BrickEvent = 
  | BrickCreateAppEvent 
  | BrickCreateTokenEvent 
  | BrickEditTokenPriceEvent 
  | BrickBuyTokenEvent 
  | BrickShareTokenEvent 
  | BrickRefundEvent
  | BrickWithdrawFundsEvent 
  | BrickUseTokenEvent 
  | BrickDeleteTokenEvent

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
    Buffer.from(solita.createAppInstructionDiscriminator).toString('ascii'),
    InstructionType.CreateApp,
  ],
  [
    Buffer.from(solita.createTokenInstructionDiscriminator).toString('ascii'),
    InstructionType.CreateToken,
  ],
  [
    Buffer.from(solita.editTokenPriceInstructionDiscriminator).toString(
      'ascii',
    ),
    InstructionType.EditTokenPrice,
  ],
  [
    Buffer.from(solita.buyTokenInstructionDiscriminator).toString('ascii'),
    InstructionType.BuyToken,
  ],
  [
    Buffer.from(solita.shareTokenInstructionDiscriminator).toString('ascii'),
    InstructionType.ShareToken,
  ],
  [
    Buffer.from(solita.withdrawFundsInstructionDiscriminator).toString('ascii'),
    InstructionType.WithdrawFunds,
  ],
  [
    Buffer.from(solita.refundInstructionDiscriminator).toString('ascii'),
    InstructionType.Refund,
  ],
  [
    Buffer.from(solita.useTokenInstructionDiscriminator).toString('ascii'),
    InstructionType.UseToken,
  ],
  [
    Buffer.from(solita.deletetokenInstructionDiscriminator).toString('ascii'),
    InstructionType.DeleteToken,
  ],
])

export const IX_DATA_LAYOUT: Partial<Record<InstructionType, any>> = {
  [InstructionType.CreateApp]: solita.createAppStruct,
  [InstructionType.CreateToken]: solita.createTokenStruct,
  [InstructionType.EditTokenPrice]: solita.editTokenPriceStruct,
  [InstructionType.BuyToken]: solita.buyTokenStruct,
  [InstructionType.ShareToken]: solita.shareTokenStruct,
  [InstructionType.WithdrawFunds]: solita.withdrawFundsStruct,
  [InstructionType.Refund]: solita.refundStruct,
  [InstructionType.UseToken]: solita.useTokenStruct,
  [InstructionType.DeleteToken]: solita.deletetokenStruct,
}

export const IX_ACCOUNTS_LAYOUT: Partial<Record<InstructionType, any>> = {
  [InstructionType.CreateApp]: solita.CreateAppAccounts,
  [InstructionType.CreateToken]: solita.CreateTokenAccounts,
  [InstructionType.EditTokenPrice]: solita.EditTokenPriceAccounts,
  [InstructionType.BuyToken]: solita.BuyTokenAccounts,
  [InstructionType.ShareToken]: solita.ShareTokenAccounts,
  [InstructionType.WithdrawFunds]: solita.WithdrawFundsAccounts,
  [InstructionType.Refund]: solita.RefundAccounts,
  [InstructionType.UseToken]: solita.UseTokenAccounts,
  [InstructionType.DeleteToken]: solita.DeletetokenAccounts,
}
