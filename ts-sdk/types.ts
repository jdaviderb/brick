import BN from 'bn.js'

export type Access = {
  authority: string
  marketplace: string
  bump: number
}

export type TokenConfig = {
    useCnfts: boolean
    deliverToken: boolean
    transferable: boolean
    chainCounter: boolean
}

export type PermissionConfig = {
    accessMint: string
    permissionless: boolean
}

export enum PaymentFeePayer {
  Buyer,
  Seller,
}

export type FeesConfig = {
    discountMint: string
    fee: number
    feeReduction: number
    feePayer: PaymentFeePayer
}

export type RewardsConfig = {
    rewardMint: string
    bountyVaults: string
    sellerReward: number
    buyerReward: number
    rewardsEnabled: boolean
}

export type MarketplaceBumps = {
    bump: number
    vaultBumps: Uint8Array
    accessMintBump: number
}

export type Marketplace = {
  authority: string
  tokenConfig: TokenConfig
  permissionConfig: PermissionConfig
  feesConfig: FeesConfig
  rewardsConfig: RewardsConfig
  bumps: MarketplaceBumps
}

export type SellerConfig = {
    paymentMint: string;
    productPrice: BN;
}

export type ProductBumps = {
    paymentMint: string;
    productPrice: string;
}

export type Product = {
  authority: string
  firstId: number[]
  secondId: number[]
  marketplace: string
  productMint: string
  merkleTree: string
  sellerConfig: SellerConfig
  bumps: ProductBumps
}

export type RewardBumps = {
    bump: number
    vaultBumps: Uint8Array
}

export type Reward = {
  authority: string
  marketplace: string
  rewardVaults: string[]
  bumps: RewardBumps
}

export type Payment = {
  units: number
  bump: number
}

export type ParsedAccountsData =
  | Marketplace
  | Product
  | Reward
  | Access
  | Payment

export enum AccountType {
  Marketplace = 'Marketplace',
  Product = 'Product',
  Reward = 'Reward',
  Access = 'Access',
  Payment = 'Payment',
}

export type BrickAccountInfo = {
    name: string
    programId: string
    address: string
    type: AccountType
    data: ParsedAccountsData
} 

export enum InstructionType {
  AcceptAccess = 'AcceptAccess',
  AirdropAccess = 'AirdropAccess',
  EditProduct = 'EditProduct',
  EditMarketplace = 'EditMarketplace',
  InitBounty = 'InitBounty',
  InitMarketplace = 'InitMarketplace',
  InitProductTree = 'InitProductTree',
  InitProduct = 'InitProduct',
  InitRewardVault = 'InitRewardVault',
  InitReward = 'InitReward',
  RegisterBuyCnft = 'RegisterBuyCnft',
  RegisterBuyCounter = 'RegisterBuyCounter',
  RegisterBuyToken = 'RegisterBuyToken',
  RegisterBuy = 'RegisterBuy',
  RequestAccess = 'RequestAccess',
  UpdateTree = 'UpdateTree',
  WithdrawReward = 'WithdrawReward',
}

// These *Info types are used to fetch events from the indexer api
export type AcceptAccessInfo = {
  systemProgram: string
  tokenProgram2022: string
  associatedTokenProgram: string
  rent: string
  signer: string
  receiver: string
  marketplace: string
  request: string
  accessMint: string
  accessVault: string
}

export type AirdropAccessInfo = {
  systemProgram: string
  tokenProgram2022: string
  associatedTokenProgram: string
  rent: string
  signer: string
  receiver: string
  marketplace: string
  accessMint: string
  accessVault: string
}

export type EditProductAccountsInstruction = {
  signer: string
  product: string
  paymentMint: string
}

export type EditProductInstructionArgs = {
    productPrice: BN
}

export type EditProductInfo = EditProductInstructionArgs &
  EditProductAccountsInstruction

export type EditMarketplaceAccountsInstruction = {
  signer: string
  marketplace: string
  rewardMint: string
  discountMint: string
}

export type EditMarketplaceInstructionArgs = {
  params: {
    fee: number
    feeReduction: number
    sellerReward: number
    buyerReward: number
    useCnfts: boolean
    deliverToken: boolean
    transferable: boolean
    chainCounter: boolean
    permissionless: boolean
    rewardsEnabled: boolean
    feePayer: PaymentFeePayer
  }
}

export type EditMarketplaceInfo = EditMarketplaceInstructionArgs &
  EditMarketplaceAccountsInstruction

export type InitBountyInfo = {
  systemProgram: string
  tokenProgramV0: string
  associatedTokenProgram: string
  rent: string
  signer: string
  marketplace: string
  rewardMint: string
  bountyVault: string
}

export type InitMarketplaceAccountsInstruction = {
  systemProgram: string
  tokenProgram2022: string
  tokenProgramV0: string
  rent: string
  signer: string
  marketplace: string
  accessMint: string
  rewardMint: string
  discountMint: string
  bountyVault: string
}

export type InitMarketplaceInstructionArgs = {
  params: {
    fee: number
    feeReduction: number
    sellerReward: number
    buyerReward: number
    useCnfts: boolean
    deliverToken: boolean
    transferable: boolean
    chainCounter: boolean
    permissionless: boolean
    rewardsEnabled: boolean
    accessMintBump: number
    feePayer: PaymentFeePayer
  }
}

export type InitMarketplaceInfo = InitMarketplaceInstructionArgs &
  InitMarketplaceAccountsInstruction

export type InitProductTreeAccountsInstruction = {
  tokenMetadataProgram: string
  logWrapper: string
  systemProgram: string
  bubblegumProgram: string
  compressionProgram: string
  tokenProgramV0: string
  associatedTokenProgram: string
  rent: string
  signer: string
  marketplace: string
  product: string
  productMint: string
  paymentMint: string
  accessMint: string
  productMintVault: string
  accessVault: string
  masterEdition: string
  metadata: string
  merkleTree: string
  treeAuthority: string
}

export type InitProductTreeInstructionArgs = {
  params: {
      firstId: number[] /* size: 32 */
      secondId: number[] /* size: 32 */
      productPrice: BN
      maxDepth: number
      maxBufferSize: number
      name: string
      metadataUrl: string
      feeBasisPoints: number
  }
}

export type InitProductTreeInfo = InitProductTreeInstructionArgs &
  InitProductTreeAccountsInstruction

export type InitProductAccountsInstruction = {
  systemProgram: string
  tokenProgram2022: string
  rent: string
  signer: string
  marketplace: string
  product: string
  productMint: string
  paymentMint: string
  accessMint: string
  accessVault: string
}

export type InitProductInstructionArgs = {
    params: {
        firstId: number[] /* size: 32 */
        secondId: number[] /* size: 32 */
        productPrice: BN
        productMintBump: number
    }
}

export type InitProductInfo = InitProductInstructionArgs &
  InitProductAccountsInstruction

export type InitRewardVaultInfo = {
  systemProgram: string
  tokenProgramV0: string
  associatedTokenProgram: string
  rent: string
  signer: string
  marketplace: string
  reward: string
  rewardMint: string
  rewardVault: string
}

export type InitRewardInfo = {
  systemProgram: string
  tokenProgramV0: string
  rent: string
  signer: string
  marketplace: string
  reward: string
  rewardMint: string
  rewardVault: string
}

export type RegisterBuyCnftAccountsInstruction = {
  systemProgram: string
  tokenProgramV0: string
  rent: string
  logWrapper: string
  bubblegumProgram: string
  compressionProgram: string
  tokenMetadataProgram: string
  signer: string
  seller: string
  marketplaceAuth: string
  marketplace: string
  product: string
  paymentMint: string
  productMint: string
  buyerTransferVault: string
  sellerTransferVault: string
  marketplaceTransferVault: string
  bountyVault: string
  sellerReward: string
  sellerRewardVault: string
  buyerReward: string
  buyerRewardVault: string
  metadata: string
  masterEdition: string
  treeAuthority: string
  bubblegumSigner: string
  merkleTree: string
}

export type RegisterBuyCnftInstructionArgs = {
  params: {
    amount: number
    name: string
    symbol: string
    uri: string
  }
}

export type RegisterBuyCnftInfo = RegisterBuyCnftInstructionArgs &
  RegisterBuyCnftAccountsInstruction

export type RegisterBuyCounterAccountsInstruction = {
  systemProgram: string
  tokenProgramV0: string
  rent: string
  signer: string
  seller: string
  marketplaceAuth: string
  marketplace: string
  product: string
  payment: string
  paymentMint: string
  buyerTransferVault: string
  sellerTransferVault: string
  marketplaceTransferVault: string
  bountyVault: string
  sellerReward: string
  sellerRewardVault: string
  buyerReward: string
  buyerRewardVault: string
}

export type RegisterBuyInstructionArgs = {
  amount: number
}

export type RegisterBuyCounterInfo = RegisterBuyInstructionArgs &
  RegisterBuyCounterAccountsInstruction

export type RegisterBuyTokenAccountsInstruction = {
  systemProgram: string
  tokenProgramV0: string
  tokenProgram2022: string
  signer: string
  seller: string
  marketplaceAuth: string
  marketplace: string
  product: string
  productMint: string
  paymentMint: string
  buyerTokenVault: string
  buyerTransferVault: string
  sellerTransferVault: string
  marketplaceTransferVault: string
  bountyVault: string
  sellerReward: string
  sellerRewardVault: string
  buyerReward: string
  buyerRewardVault: string
}

export type RegisterBuyTokenInfo = RegisterBuyInstructionArgs &
  RegisterBuyTokenAccountsInstruction

export type RegisterBuyAccountsInstruction = {
  systemProgram: string
  tokenProgramV0: string
  rent: string
  signer: string
  seller: string
  marketplaceAuth: string
  marketplace: string
  product: string
  payment: string
  paymentMint: string
  buyerTransferVault: string
  sellerTransferVault: string
  marketplaceTransferVault: string
  bountyVault: string
  sellerReward: string
  sellerRewardVault: string
  buyerReward: string
  buyerRewardVault: string
}

export type RegisterBuyInfo = RegisterBuyInstructionArgs&
  RegisterBuyAccountsInstruction

export type RequestAccessInfo = {
  systemProgram: string
  rent: string
  signer: string
  marketplace: string
  request: string
}

export type UpdateTreeAccountsInstruction = {
  payer: string
  signer: string
  marketplace: string
  product: string
  treeAuthority: string
  merkleTree: string
  logWrapper: string
  systemProgram: string
  bubblegumProgram: string
  compressionProgram: string
}

export type UpdateTreeInstructionArgs = {
  params: {
    maxDepth: number
    maxBufferSize: number
  }
}

export type UpdateTreeInfo = UpdateTreeInstructionArgs &
  UpdateTreeAccountsInstruction

export type WithdrawRewardInfo = {
  tokenProgramV0: string
  signer: string
  marketplace: string
  reward: string
  rewardMint: string
  receiverVault: string
  rewardVault: string
}

export type EventInfo =
  | AcceptAccessInfo
  | AirdropAccessInfo
  | EditProductInfo
  | EditMarketplaceInfo
  | InitBountyInfo
  | InitMarketplaceInfo
  | InitProductTreeInfo
  | InitProductInfo
  | InitRewardVaultInfo
  | InitRewardInfo
  | RegisterBuyCnftInfo
  | RegisterBuyCounterInfo
  | RegisterBuyTokenInfo
  | RegisterBuyInfo
  | RequestAccessInfo
  | UpdateTreeInfo
  | WithdrawRewardInfo

type EventBase<EventType> = {
    id: string;
    timestamp: number;
    type: EventType;
    account: string;
}

export type AcceptAccessEvent = EventBase<InstructionType> & {
  info: AcceptAccessInfo
  signer: string
  account: string
}

export type AirdropAccessEvent = EventBase<InstructionType> & {
  info: AirdropAccessInfo
  signer: string
  account: string
}

export type EditProductEvent = EventBase<InstructionType> & {
  info: EditProductInfo
  signer: string
  account: string
}

export type EditMarketplaceEvent = EventBase<InstructionType> & {
  info: EditMarketplaceInfo
  signer: string
  account: string
}

export type InitBountyEvent = EventBase<InstructionType> & {
  info: InitBountyInfo
  signer: string
  account: string
}

export type InitMarketplaceEvent = EventBase<InstructionType> & {
  info: InitMarketplaceInfo
  signer: string
  account: string
}

export type InitProductTreeEvent = EventBase<InstructionType> & {
  info: InitProductTreeInfo
  signer: string
  account: string
}

export type InitProductEvent = EventBase<InstructionType> & {
  info: InitProductInfo
  signer: string
  account: string
}

export type InitRewardVaultEvent = EventBase<InstructionType> & {
  info: InitRewardVaultInfo
  signer: string
  account: string
}

export type InitRewardEvent = EventBase<InstructionType> & {
  info: InitRewardInfo
  signer: string
  account: string
}

export type RegisterBuyCnftEvent = EventBase<InstructionType> & {
  info: RegisterBuyCnftInfo
  signer: string
  account: string
}

export type RegisterBuyCounterEvent = EventBase<InstructionType> & {
  info: RegisterBuyCounterInfo
  signer: string
  account: string
}

export type RegisterBuyTokenEvent = EventBase<InstructionType> & {
  info: RegisterBuyTokenInfo
  signer: string
  account: string
}

export type RegisterBuyEvent = EventBase<InstructionType> & {
  info: RegisterBuyInfo
  signer: string
  account: string
}

export type RequestAccessEvent = EventBase<InstructionType> & {
  info: RequestAccessInfo
  signer: string
  account: string
}

export type UpdateTreeEvent = EventBase<InstructionType> & {
  info: UpdateTreeInfo
  signer: string
  account: string
}

export type WithdrawRewardEvent = EventBase<InstructionType> & {
  info: WithdrawRewardInfo
  signer: string
  account: string
}

export type BrickEvent =
  | AcceptAccessEvent
  | AirdropAccessEvent
  | EditProductEvent
  | EditMarketplaceEvent
  | InitBountyEvent
  | InitMarketplaceEvent
  | InitProductTreeEvent
  | InitProductEvent
  | InitRewardVaultEvent
  | InitRewardEvent
  | RegisterBuyCnftEvent
  | RegisterBuyCounterEvent
  | RegisterBuyTokenEvent
  | RegisterBuyEvent
  | RequestAccessEvent
  | UpdateTreeEvent
  | WithdrawRewardEvent

