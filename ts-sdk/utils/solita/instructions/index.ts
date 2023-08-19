export * from './acceptAccess'
export * from './airdropAccess'
export * from './editMarketplace'
export * from './editProduct'
export * from './initBounty'
export * from './initMarketplace'
export * from './initProduct'
export * from './initProductTree'
export * from './initReward'
export * from './initRewardVault'
export * from './registerBuy'
export * from './registerBuyCnft'
export * from './registerBuyCounter'
export * from './registerBuyToken'
export * from './requestAccess'
export * from './updateTree'
export * from './withdrawReward'

import { InstructionType } from '../../../types'
import * as solita from './'

export const IX_DATA_LAYOUT: Partial<Record<InstructionType, any>> = {
  [InstructionType.AcceptAccess]: solita.acceptAccessStruct,
  [InstructionType.AirdropAccess]: solita.airdropAccessStruct,
  [InstructionType.EditProduct]: solita.editProductStruct,
  [InstructionType.EditMarketplace]: solita.editMarketplaceStruct,
  [InstructionType.InitBounty]: solita.initBountyStruct,
  [InstructionType.InitMarketplace]: solita.initMarketplaceStruct,
  [InstructionType.InitProductTree]: solita.initProductTreeStruct,
  [InstructionType.InitProduct]: solita.initProductStruct,
  [InstructionType.InitRewardVault]: solita.initRewardVaultStruct,
  [InstructionType.InitReward]: solita.initRewardStruct,
  [InstructionType.RegisterBuyCnft]: solita.registerBuyCnftStruct,
  [InstructionType.RegisterBuyCounter]: solita.registerBuyCounterStruct,
  [InstructionType.RegisterBuyToken]: solita.registerBuyTokenStruct,
  [InstructionType.RegisterBuy]: solita.registerBuyStruct,
  [InstructionType.RequestAccess]: solita.requestAccessStruct,
  [InstructionType.UpdateTree]: solita.updateTreeStruct,
  [InstructionType.WithdrawReward]: solita.withdrawRewardStruct,
}