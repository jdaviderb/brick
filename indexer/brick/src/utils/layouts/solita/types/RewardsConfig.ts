/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as web3 from '@solana/web3.js'
import * as beetSolana from '@metaplex-foundation/beet-solana'
import * as beet from '@metaplex-foundation/beet'
export type RewardsConfig = {
  rewardMint: web3.PublicKey
  bountyVaults: web3.PublicKey[]
  sellerReward: number
  buyerReward: number
  rewardsEnabled: boolean
}

/**
 * @category userTypes
 * @category generated
 */
export const rewardsConfigBeet = new beet.FixableBeetArgsStruct<RewardsConfig>(
  [
    ['rewardMint', beetSolana.publicKey],
    ['bountyVaults', beet.array(beetSolana.publicKey)],
    ['sellerReward', beet.u16],
    ['buyerReward', beet.u16],
    ['rewardsEnabled', beet.bool],
  ],
  'RewardsConfig',
)
