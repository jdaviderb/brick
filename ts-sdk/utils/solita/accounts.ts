import { FeesConfig } from './types/FeesConfig'
import { MarketplaceBumps } from './types/MarketplaceBumps'
import { PermissionConfig } from './types/PermissionConfig'
import { ProductBumps } from './types/ProductBumps'
import { RewardBumps } from './types/RewardBumps'
import { RewardsConfig } from './types/RewardsConfig'
import { SellerConfig } from './types/SellerConfig'
import { TokenConfig } from './types/TokenConfig'

// These account types are used on indexer api fetchs
export type Access = {
  authority: string
  marketplace: string
  bump: number
}

export type Marketplace = {
  authority: string
  tokenConfig: TokenConfig
  permissionConfig: PermissionConfig
  feesConfig: FeesConfig
  rewardsConfig: RewardsConfig
  bumps: MarketplaceBumps
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