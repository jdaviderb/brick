/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as beet from '@metaplex-foundation/beet'
export type MarketplaceBumps = {
  bump: number
  vaultBumps: Uint8Array
  accessMintBump: number
}

/**
 * @category userTypes
 * @category generated
 */
export const marketplaceBumpsBeet =
  new beet.FixableBeetArgsStruct<MarketplaceBumps>(
    [
      ['bump', beet.u8],
      ['vaultBumps', beet.bytes],
      ['accessMintBump', beet.u8],
    ],
    'MarketplaceBumps',
  )
