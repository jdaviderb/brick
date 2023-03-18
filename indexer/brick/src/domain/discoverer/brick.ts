import { BRICK_PROGRAM_ID, BRICK_PROGRAM_ID_PK } from '../../constants.js'
import { AccountType, TokenMetadataArgs } from '../../utils/layouts/index.js'
import { BrickAccountInfo } from '../../types.js'
import {
  ACCOUNT_DISCRIMINATOR,
  ACCOUNTS_DATA_LAYOUT,
} from '../../utils/layouts/accounts.js'
import { solanaPrivateRPC } from '@aleph-indexer/solana'
import bs58 from 'bs58'
import { AccountInfo, PublicKey } from '@solana/web3.js'

export default class BrickDiscoverer {
  constructor(
    public accountTypes: Set<AccountType> = new Set(Object.values(AccountType)),
    protected cache: Record<string, BrickAccountInfo> = {},
  ) {}

  async loadAccounts(): Promise<BrickAccountInfo[]> {
    const newAccounts: BrickAccountInfo[] = []
    const accounts = await this.getAllAccounts()

    for (const accountInfo of accounts) {
      if (this.cache[accountInfo.address]) continue

      this.cache[accountInfo.address] = accountInfo
      newAccounts.push(this.cache[accountInfo.address])
    }

    return newAccounts
  }

  getAccountType(address: string): AccountType {
    return this.cache[address].type
  }

  /**
   * Fetches all accounts from the program. Useful to filter which accounts should be indexed.
   */
  async getAllAccounts(): Promise<BrickAccountInfo[]> {
    const connection = solanaPrivateRPC.getConnection()
    const accountsInfo: BrickAccountInfo[] = []
    for (const type of this.accountTypes) {
      const accounts = await connection.getProgramAccounts(
        BRICK_PROGRAM_ID_PK,
        {
          filters: [
            {
              memcmp: {
                bytes: bs58.encode(ACCOUNT_DISCRIMINATOR[type]),
                offset: 0,
              },
            },
          ],
        },
      )
      accounts.map(
        (value: { pubkey: PublicKey; account: AccountInfo<Buffer> }) =>
          accountsInfo.push(this.deserializeAccountResponse(value, type)),
      )
    }
    return accountsInfo
  }

  deserializeAccountResponse(
    resp: { pubkey: PublicKey; account: AccountInfo<Buffer> },
    type: AccountType,
  ): BrickAccountInfo {
    const address = resp.pubkey.toBase58()

    try {
      let data = ACCOUNTS_DATA_LAYOUT[type].deserialize(resp.account.data)[0]

      let name: string = address
      if (Object.hasOwn(data, 'name')) {
        if ((data as any).name instanceof Uint8Array)
          name = ((data as any).name as Uint8Array).toString()
        if ((data as any).name instanceof String) name = (data as any).name
      }

      if (type === AccountType.TokenMetadata) {
        const offChainId2 = Buffer.from((data as TokenMetadataArgs).offChainId2)
        data["offChainId2"] = offChainId2.toString('utf-8').trim()
        const offChainMetadata = Buffer.from((data as TokenMetadataArgs).offChainMetadata)
        data["offChainMetadata"] = offChainMetadata.toString('utf-8').trim()
      }
      return {
        name,
        programId: BRICK_PROGRAM_ID,
        type,
        address: address,
        data: data,
      }
    } catch(e) {
      return {
        address,
        programId: BRICK_PROGRAM_ID,
        type,
        name: address,
        data: {
          authority: BRICK_PROGRAM_ID_PK,
          feeBasisPoints: 0,
          bump: 0,
          appName: "old payment account with a different schema"
        },
      }
    }
  }
}
