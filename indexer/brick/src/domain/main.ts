import { StorageStream } from '@aleph-indexer/core'
import {
  IndexerMainDomain,
  IndexerMainDomainWithDiscovery,
  IndexerMainDomainWithStats,
  AccountIndexerConfigWithMeta,
  IndexerMainDomainContext,
  AccountStats,
  Blockchain,
} from '@aleph-indexer/framework'
import { AccountType, BrickEvent } from '../utils/layouts/index.js'
import {
  GlobalBrickStats,
  BrickAccountStats,
  BrickAccountData,
  BrickAccountInfo,
} from '../types.js'
import BrickDiscoverer from './discoverer/brick.js'

export default class MainDomain
  extends IndexerMainDomain
  implements IndexerMainDomainWithDiscovery, IndexerMainDomainWithStats
{
  protected stats!: GlobalBrickStats

  constructor(
    protected context: IndexerMainDomainContext,
    protected discoverer: BrickDiscoverer = new BrickDiscoverer(),
  ) {
    super(context, {
      discoveryInterval: 1000 * 60 * 60 * 1,
      stats: 1000 * 60 * 1,
    })
  }

  async discoverAccounts(): Promise<
    AccountIndexerConfigWithMeta<BrickAccountInfo>[]
  > {
    const accounts = await this.discoverer.loadAccounts()

    return accounts.map((meta) => {
      return {
        blockchainId: Blockchain.Solana,
        account: meta.address,
        meta,
        index: {
          transactions: {
            chunkDelay: 0,
            chunkTimeframe: 1000 * 60 * 60 * 24,
          },
          content: false,
        },
      }
    })
  }

  async getAccounts(
    includeStats?: boolean,
  ): Promise<Record<string, BrickAccountData>> {
    const accounts: Record<string, BrickAccountData> = {}

    await Promise.all(
      Array.from(this.accounts.solana || []).map(async (account) => {
        const actual = await this.getAccount(account, includeStats)
        accounts[account] = actual as BrickAccountData
      }),
    )

    return accounts
  }

  async getAccount(
    account: string,
    includeStats?: boolean,
  ): Promise<BrickAccountData> {
    const info = (await this.context.apiClient
      .useBlockchain(Blockchain.Solana)
      .invokeDomainMethod({
        account,
        method: 'getAccountInfo',
      })) as BrickAccountInfo

    if (!includeStats) return { info }

    const { stats } = (await this.context.apiClient
      .useBlockchain(Blockchain.Solana)
      .invokeDomainMethod({
        account,
        method: 'getBrickStats',
      })) as AccountStats<BrickAccountStats>

    return { info, stats }
  }

  async getAccountEventsByTime(
    account: string,
    startDate: number,
    endDate: number,
    opts: any,
  ): Promise<StorageStream<string, BrickEvent>> {
    const stream = await this.context.apiClient
      .useBlockchain(Blockchain.Solana)
      .invokeDomainMethod({
        account,
        method: 'getAccountEventsByTime',
        args: [startDate, endDate, opts],
      })

    return stream as StorageStream<string, BrickEvent>
  }

  async updateStats(now: number): Promise<void> {
    this.stats = await this.computeGlobalStats()
  }

  async getGlobalStats(addresses?: string[]): Promise<GlobalBrickStats> {
    if (!addresses || addresses.length === 0) {
      if (!this.stats) {
        await this.updateStats(Date.now())
      }

      return this.stats
    }

    return this.computeGlobalStats(addresses)
  }

  async computeGlobalStats(
    accountAddresses?: string[],
  ): Promise<GlobalBrickStats> {
    console.log(
      `📊 computing global stats for ${accountAddresses?.length} accounts`,
    )
    const accountsStats = await this.getAccountStats<BrickAccountStats>(
      Blockchain.Solana,
      accountAddresses,
    )
    const globalStats: GlobalBrickStats = this.getNewGlobalStats()

    for (const accountStats of accountsStats) {
      if (!accountStats.stats) continue

      const { accesses, accessesByProgramId, startTimestamp, endTimestamp } =
        accountStats.stats.total

      console.log(
        `📊 computing global stats for ${accountStats.account} with ${accesses} accesses`,
      )

      const type = this.discoverer.getAccountType(accountStats.account)

      globalStats.totalAccounts[type]++
      globalStats.totalAccesses += accesses || 0
      if (accessesByProgramId) {
        Object.entries(accessesByProgramId).forEach(([programId, accesses]) => {
          globalStats.totalAccessesByProgramId[programId] =
            (globalStats.totalAccessesByProgramId[programId] || 0) + accesses
        })
      }
      globalStats.startTimestamp = Math.min(
        globalStats.startTimestamp || Number.MAX_SAFE_INTEGER,
        startTimestamp || Number.MAX_SAFE_INTEGER,
      )
      globalStats.endTimestamp = Math.max(
        globalStats.endTimestamp || 0,
        endTimestamp || 0,
      )
    }
    return globalStats
  }

  getNewGlobalStats(): GlobalBrickStats {
    return {
      totalAccesses: 0,
      totalAccounts: {
        [AccountType.Marketplace]: 0,
        [AccountType.Product]: 0,
        [AccountType.Reward]: 0,
        [AccountType.Access]: 0,
        [AccountType.Payment]: 0,
      },
      totalAccessesByProgramId: {},
      startTimestamp: undefined,
      endTimestamp: undefined,
    }
  }
}
