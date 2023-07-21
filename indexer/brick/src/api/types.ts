import { GraphQLBoolean, GraphQLInt } from 'graphql'
import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLEnumType,
  GraphQLNonNull,
  GraphQLList,
  GraphQLInterfaceType,
  GraphQLUnionType,
} from 'graphql'
import { GraphQLBigNumber, GraphQLLong, GraphQLJSON } from '@aleph-indexer/core'
import { InstructionType } from '../utils/layouts/index.js'

// ------------------- TYPES ---------------------------

export const CreateGovernanceParams = new GraphQLObjectType({
  name: 'CreateGovernanceParams',
  fields: {
    fee: { type: new GraphQLNonNull(GraphQLInt) },
    feeReduction: { type: new GraphQLNonNull(GraphQLInt) },
    sellerPromo: { type: new GraphQLNonNull(GraphQLInt) },
    buyerPromo: { type: new GraphQLNonNull(GraphQLInt) },
  },
})

export const CreateProductParams = new GraphQLObjectType({
  name: 'CreateProductParams',
  fields: {
    firstId: { type: new GraphQLNonNull(GraphQLString) },
    secondId: { type: new GraphQLNonNull(GraphQLString) },
    productPrice: { type: new GraphQLNonNull(GraphQLBigNumber) },
  },
})

export const EditPointsParams = new GraphQLObjectType({
  name: 'EditPointsParams',
  fields: {
    fee: { type: new GraphQLNonNull(GraphQLInt) },
    feeReduction: { type: new GraphQLNonNull(GraphQLInt) },
    sellerPromo: { type: new GraphQLNonNull(GraphQLInt) },
    buyerPromo: { type: new GraphQLNonNull(GraphQLInt) },
  },
})

export const SellerConfig = new GraphQLObjectType({
  name: 'SellerConfig',
  fields: {
    paymentMint: { type: new GraphQLNonNull(GraphQLString) },
    productPrice: { type: new GraphQLNonNull(GraphQLBigNumber) },
  },
})

// ------------------- STATS ---------------------------

export const AccessTimeStats = new GraphQLObjectType({
  name: 'MarinadeFinanceInfo',
  fields: {
    accesses: { type: new GraphQLNonNull(GraphQLInt) },
    accessesByProgramId: { type: new GraphQLNonNull(GraphQLJSON) },
    startTimestamp: { type: new GraphQLNonNull(GraphQLLong) },
    endTimestamp: { type: new GraphQLNonNull(GraphQLLong) },
  },
})

export const TotalAccounts = new GraphQLObjectType({
  name: 'TotalAccounts',
  fields: {
    Bonus: { type: new GraphQLNonNull(GraphQLInt) },
    Governance: { type: new GraphQLNonNull(GraphQLInt) },
    Product: { type: new GraphQLNonNull(GraphQLInt) },
  },
})

export const GlobalBrickStats = new GraphQLObjectType({
  name: 'GlobalBrickStats',
  fields: {
    totalAccounts: { type: new GraphQLNonNull(TotalAccounts) },
    totalAccesses: { type: new GraphQLNonNull(GraphQLInt) },
    totalAccessesByProgramId: { type: new GraphQLNonNull(GraphQLJSON) },
    startTimestamp: { type: new GraphQLNonNull(GraphQLLong) },
    endTimestamp: { type: new GraphQLNonNull(GraphQLLong) },
  },
})

export const BrickStats = new GraphQLObjectType({
  name: 'BrickStats',
  fields: {
    last1h: { type: AccessTimeStats },
    last24h: { type: AccessTimeStats },
    last7d: { type: AccessTimeStats },
    total: { type: AccessTimeStats },
  },
})

// ------------------- ACCOUNTS ---------------------------

export const AccountsEnum = new GraphQLEnumType({
  name: 'AccountsEnum',
  values: {
    Bonus: { value: 'Bonus' },
    Governance: { value: 'Governance' },
    Product: { value: 'Product' },
  },
})

export const Bonus = new GraphQLObjectType({
  name: 'Bonus',
  fields: {
    authority: { type: new GraphQLNonNull(GraphQLString) },
    bump: { type: new GraphQLNonNull(GraphQLInt) },
    vaultBump: { type: new GraphQLNonNull(GraphQLInt) },
  },
})

export const Governance = new GraphQLObjectType({
  name: 'Governance',
  fields: {
    governanceAuthority: { type: new GraphQLNonNull(GraphQLString) },
    governanceMint: { type: new GraphQLNonNull(GraphQLString) },
    governanceBonusVault: { type: new GraphQLNonNull(GraphQLString) },
    feeReduction: { type: new GraphQLNonNull(GraphQLInt) },
    fee: { type: new GraphQLNonNull(GraphQLInt) },
    sellerPromo: { type: new GraphQLNonNull(GraphQLInt) },
    buyerPromo: { type: new GraphQLNonNull(GraphQLInt) },
    bump: { type: new GraphQLNonNull(GraphQLInt) },
    vaultBump: { type: new GraphQLNonNull(GraphQLInt) },
  },
})

export const Product = new GraphQLObjectType({
  name: 'Product',
  fields: {
    firstId: { type: new GraphQLNonNull(GraphQLString) },
    secondId: { type: new GraphQLNonNull(GraphQLString) },
    productAuthority: { type: new GraphQLNonNull(GraphQLString) },
    sellerConfig: { type: new GraphQLNonNull(SellerConfig) },
    bump: { type: new GraphQLNonNull(GraphQLInt) },
  },
})

export const ParsedAccountsData = new GraphQLUnionType({
  name: 'ParsedAccountsData',
  types: [Bonus, Governance, Product],
  resolveType: (obj) => {
    // here is selected a unique property of each account to discriminate between types
    if (obj.authority) {
      return 'Bonus'
    }
    if (obj.governanceAuthority) {
      return 'Governance'
    }
    if (obj.firstId) {
      return 'Product'
    }
  },
})

const commonAccountInfoFields = {
  name: { type: new GraphQLNonNull(GraphQLString) },
  programId: { type: new GraphQLNonNull(GraphQLString) },
  address: { type: new GraphQLNonNull(GraphQLString) },
  type: { type: new GraphQLNonNull(AccountsEnum) },
}

const Account = new GraphQLInterfaceType({
  name: 'Account',
  fields: {
    ...commonAccountInfoFields,
  },
})

export const BrickAccountsInfo = new GraphQLObjectType({
  name: 'BrickAccountsInfo',
  interfaces: [Account],
  fields: {
    ...commonAccountInfoFields,
    data: { type: new GraphQLNonNull(ParsedAccountsData) },
  },
})

export const AccountsInfo = new GraphQLList(BrickAccountsInfo)

// ------------------- EVENTS --------------------------

export const ParsedEvents = new GraphQLEnumType({
  name: 'ParsedEvents',
  values: {
    CreateGovernanceEvent: { value: 'CreateGovernanceEvent' },
    CreateProductEvent: { value: 'CreateProductEvent' },
    DeleteProductEvent: { value: 'DeleteProductEvent' },
    EditPointsEvent: { value: 'EditPointsEvent' },
    EditPaymentMintEvent: { value: 'EditPaymentMintEvent' },
    EditPriceEvent: { value: 'EditPriceEvent' },
    InitBonusEvent: { value: 'InitBonusEvent' },
    RegisterBuyEvent: { value: 'RegisterBuyEvent' },
    RegisterPromoBuyEvent: { value: 'RegisterPromoBuyEvent' },
    WithdrawBonusEvent: { value: 'WithdrawBonusEvent' },
  },
})

const commonEventFields = {
  id: { type: new GraphQLNonNull(GraphQLString) },
  timestamp: { type: GraphQLLong },
  type: { type: new GraphQLNonNull(ParsedEvents) },
  account: { type: new GraphQLNonNull(GraphQLString) },
  signer: { type: new GraphQLNonNull(GraphQLString) },
}

const Event = new GraphQLInterfaceType({
  name: 'Event',
  fields: {
    ...commonEventFields,
  },
})

/*-----------------------* CUSTOM EVENTS TYPES *-----------------------*/

export const CreateGovernanceEvent = new GraphQLObjectType({
  name: 'CreateGovernanceEvent',
  interfaces: [Event],
  isTypeOf: (item) => item.type === InstructionType.CreateGovernance,
  fields: {
    ...commonEventFields,
    systemProgram: { type: new GraphQLNonNull(GraphQLString) },
    tokenProgram: { type: new GraphQLNonNull(GraphQLString) },
    rent: { type: new GraphQLNonNull(GraphQLString) },
    governanceAuthority: { type: new GraphQLNonNull(GraphQLString) },
    governance: { type: new GraphQLNonNull(GraphQLString) },
    governanceMint: { type: new GraphQLNonNull(GraphQLString) },
    governanceBonusVault: { type: new GraphQLNonNull(GraphQLString) },
  },
})

export const CreateProductEvent = new GraphQLObjectType({
  name: 'CreateProductEvent',
  interfaces: [Event],
  isTypeOf: (item) => item.type === InstructionType.CreateProduct,
  fields: {
    ...commonEventFields,
    systemProgram: { type: new GraphQLNonNull(GraphQLString) },
    rent: { type: new GraphQLNonNull(GraphQLString) },
    productAuthority: { type: new GraphQLNonNull(GraphQLString) },
    governance: { type: new GraphQLNonNull(GraphQLString) },
    product: { type: new GraphQLNonNull(GraphQLString) },
    paymentMint: { type: new GraphQLNonNull(GraphQLString) },
  },
})


export const DeleteProductEvent = new GraphQLObjectType({
  name: 'DeleteProductEvent',
  interfaces: [Event],
  isTypeOf: (item) => item.type === InstructionType.DeleteProduct,
  fields: {
    ...commonEventFields,
    productAuthority: { type: new GraphQLNonNull(GraphQLString) },
    product: { type: new GraphQLNonNull(GraphQLString) },
  },
})


export const EditPointsEvent = new GraphQLObjectType({
  name: 'EditPointsEvent',
  interfaces: [Event],
  isTypeOf: (item) => item.type === InstructionType.EditPoints,
  fields: {
    ...commonEventFields,
    governanceAuthority: { type: new GraphQLNonNull(GraphQLString) },
    governance: { type: new GraphQLNonNull(GraphQLString) },
  },
})

export const EditPaymentMintEvent = new GraphQLObjectType({
  name: 'EditPaymentMintEvent',
  interfaces: [Event],
  isTypeOf: (item) => item.type === InstructionType.EditPaymentMint,
  fields: {
    ...commonEventFields,
    productAuthority: { type: new GraphQLNonNull(GraphQLString) },
    product: { type: new GraphQLNonNull(GraphQLString) },
    paymentMint: { type: new GraphQLNonNull(GraphQLString) },
  },
})

export const EditPriceEvent = new GraphQLObjectType({
  name: 'EditPriceEvent',
  interfaces: [Event],
  isTypeOf: (item) => item.type === InstructionType.EditPrice,
  fields: {
    ...commonEventFields,
    productPrice: { type: new GraphQLNonNull(GraphQLBigNumber) },
    productAuthority: { type: new GraphQLNonNull(GraphQLString) },
    product: { type: new GraphQLNonNull(GraphQLString) },
  },
})

export const InitBonusEvent = new GraphQLObjectType({
  name: 'InitBonusEvent',
  interfaces: [Event],
  isTypeOf: (item) => item.type === InstructionType.InitBonus,
  fields: {
    ...commonEventFields,
    systemProgram: { type: new GraphQLNonNull(GraphQLString) },
    tokenProgram: { type: new GraphQLNonNull(GraphQLString) },
    associatedTokenProgram: { type: new GraphQLNonNull(GraphQLString) },
    rent: { type: new GraphQLNonNull(GraphQLString) },
    signer: { type: new GraphQLNonNull(GraphQLString) },
    governance: { type: new GraphQLNonNull(GraphQLString) },
    bonus: { type: new GraphQLNonNull(GraphQLString) },
    bonusVault: { type: new GraphQLNonNull(GraphQLString) },
    governanceMint: { type: new GraphQLNonNull(GraphQLString) },
  },
})

export const RegisterBuyEvent = new GraphQLObjectType({
  name: 'RegisterBuyEvent',
  interfaces: [Event],
  isTypeOf: (item) => item.type === InstructionType.RegisterBuy,
  fields: {
    ...commonEventFields,
    systemProgram: { type: new GraphQLNonNull(GraphQLString) },
    messagesProgram: { type: new GraphQLNonNull(GraphQLString) },
    tokenProgram: { type: new GraphQLNonNull(GraphQLString) },
    rent: { type: new GraphQLNonNull(GraphQLString) },
    governanceAuthority: { type: new GraphQLNonNull(GraphQLString) },
    signer: { type: new GraphQLNonNull(GraphQLString) },
    governance: { type: new GraphQLNonNull(GraphQLString) },
    product: { type: new GraphQLNonNull(GraphQLString) },
    paymentMint: { type: new GraphQLNonNull(GraphQLString) },
    governanceMint: { type: new GraphQLNonNull(GraphQLString) },
    buyerTransferVault: { type: new GraphQLNonNull(GraphQLString) },
    productAuthorityTransferVault: { type: new GraphQLNonNull(GraphQLString) },
    governanceTransferVault: { type: new GraphQLNonNull(GraphQLString) },
  },
})

export const RegisterPromoBuyEvent = new GraphQLObjectType({
  name: 'RegisterPromoBuyEvent',
  interfaces: [Event],
  isTypeOf: (item) => item.type === InstructionType.RegisterPromoBuy,
  fields: {
    ...commonEventFields,
    systemProgram: { type: new GraphQLNonNull(GraphQLString) },
    messagesProgram: { type: new GraphQLNonNull(GraphQLString) },
    tokenProgram: { type: new GraphQLNonNull(GraphQLString) },
    rent: { type: new GraphQLNonNull(GraphQLString) },
    governanceAuthority: { type: new GraphQLNonNull(GraphQLString) },
    signer: { type: new GraphQLNonNull(GraphQLString) },
    governance: { type: new GraphQLNonNull(GraphQLString) },
    product: { type: new GraphQLNonNull(GraphQLString) },
    governanceMint: { type: new GraphQLNonNull(GraphQLString) },
    buyerTransferVault: { type: new GraphQLNonNull(GraphQLString) },
    productAuthorityTransferVault: { type: new GraphQLNonNull(GraphQLString) },
    governanceTransferVault: { type: new GraphQLNonNull(GraphQLString) },
    governanceBonusVault: { type: new GraphQLNonNull(GraphQLString) },
    productAuthorityBonus: { type: new GraphQLNonNull(GraphQLString) },
    productAuthorityBonusVault: { type: new GraphQLNonNull(GraphQLString) },
    buyerBonus: { type: new GraphQLNonNull(GraphQLString) },
    buyerBonusVault: { type: new GraphQLNonNull(GraphQLString) },
  },
})

export const WithdrawBonusEvent = new GraphQLObjectType({
  name: 'WithdrawBonusEvent',
  interfaces: [Event],
  isTypeOf: (item) => item.type === InstructionType.WithdrawBonus,
  fields: {
    ...commonEventFields,
    tokenProgram: { type: new GraphQLNonNull(GraphQLString) },
    signer: { type: new GraphQLNonNull(GraphQLString) },
    governance: { type: new GraphQLNonNull(GraphQLString) },
    bonus: { type: new GraphQLNonNull(GraphQLString) },
    governanceMint: { type: new GraphQLNonNull(GraphQLString) },
    governanceBonusVault: { type: new GraphQLNonNull(GraphQLString) },
    receiverVault: { type: new GraphQLNonNull(GraphQLString) },
    bonusVault: { type: new GraphQLNonNull(GraphQLString) },
  },
})

/*----------------------------------------------------------------------*/

export const Events = new GraphQLList(Event)

export const types = [
  CreateGovernanceEvent,
  CreateProductEvent,
  DeleteProductEvent,
  EditPointsEvent,
  EditPaymentMintEvent,
  EditPriceEvent,
  InitBonusEvent,
  RegisterBuyEvent,
  RegisterPromoBuyEvent,
  WithdrawBonusEvent,
]
