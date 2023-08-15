export * from './EditMarketplaceParams.js'
export * from './FeesConfig.js'
export * from './InitMarketplaceParams.js'
export * from './InitProductParams.js'
export * from './InitProductTreeParams.js'
export * from './MarketplaceBumps.js'
export * from './PaymentFeePayer.js'
export * from './PermissionConfig.js'
export * from './ProductBumps.js'
export * from './RegisterBuyCnftParams.js'
export * from './RewardBumps.js'
export * from './RewardsConfig.js'
export * from './SellerConfig.js'
export * from './TokenConfig.js'
export * from './UpdateProductTreeParams.js'

import { EditMarketplaceParams } from './EditMarketplaceParams.js'
import { FeesConfig } from './FeesConfig.js'
import { InitMarketplaceParams } from './InitMarketplaceParams.js'
import { InitProductParams } from './InitProductParams.js'
import { InitProductTreeParams } from './InitProductTreeParams.js'
import { MarketplaceBumps } from './MarketplaceBumps.js'
import { PaymentFeePayer } from './PaymentFeePayer.js'
import { PermissionConfig } from './PermissionConfig.js'
import { ProductBumps } from './ProductBumps.js'
import { RegisterBuyCnftParams } from './RegisterBuyCnftParams.js'
import { RewardBumps } from './RewardBumps.js'
import { RewardsConfig } from './RewardsConfig.js'
import { SellerConfig } from './SellerConfig.js'
import { TokenConfig } from './TokenConfig.js'
import { UpdateProductTreeParams } from './UpdateProductTreeParams.js'

export type ParsedTypes =
  | PaymentFeePayer
  | EditMarketplaceParams
  | InitMarketplaceParams
  | InitProductTreeParams
  | InitProductParams
  | RegisterBuyCnftParams
  | UpdateProductTreeParams
  | TokenConfig
  | PermissionConfig
  | FeesConfig
  | RewardsConfig
  | MarketplaceBumps
  | SellerConfig
  | ProductBumps
  | RewardBumps