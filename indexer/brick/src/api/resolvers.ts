import MainDomain from '../domain/main.js'
import {
  AccountType,
  BrickEvent,
  InstructionType,
} from '../utils/layouts/index.js'
import {
  GlobalBrickStats,
  BrickAccountInfo,
  BrickAccountData,
} from '../types.js'

export type AccountsFilters = {
  types?: AccountType[]
  accounts?: string[]
  authorities?: string[]
  includeStats?: boolean
}

export type EventsFilters = {
  account: string
  types?: InstructionType[]
  signer?: string
  startDate?: number
  endDate?: number
  limit?: number
  skip?: number
  reverse?: boolean
}

export type GlobalStatsFilters = AccountsFilters

export class APIResolvers {
  constructor(protected domain: MainDomain) {}

  async getAccounts(args: AccountsFilters): Promise<BrickAccountInfo[]> {
    const acountsData = await this.filterAccounts(args)
    return acountsData.map(({ info, stats }) => ({ ...info, stats }))
  }

  async getEvents({
    account,
    types,
    signer,
    startDate = 0,
    endDate = Date.now(),
    limit = 1000,
    skip = 0,
    reverse = true,
  }: EventsFilters): Promise<BrickEvent[]> {
    if (limit < 1 || limit > 1000)
      throw new Error('400 Bad Request: 1 <= limit <= 1000')

    const typesMap = types ? new Set(types) : undefined

    const events: BrickEvent[] = []

    const accountEvents = await this.domain.getAccountEventsByTime(
      account,
      startDate,
      endDate,
      {
        reverse,
        limit: !typesMap ? limit + skip : undefined,
      },
    )

    for await (const { value } of accountEvents) {
      // @note: Filter by type
      if (typesMap && !typesMap.has(value.type)) continue

      // @note: Check signer
      if (signer && value.signer !== signer) continue;

      // @note: Skip first N events
      if (--skip >= 0) continue

      events.push(value)

      // @note: Stop when after reaching the limit
      if (limit > 0 && events.length >= limit) return events
    }

    return events
  }

  public async getGlobalStats(
    args: GlobalStatsFilters,
  ): Promise<GlobalBrickStats> {
    const acountsData = await this.filterAccounts(args)
    const addresses = acountsData.map(({ info }) => info.address)

    return this.domain.getGlobalStats(addresses)
  }

  // -------------------------------- PROTECTED --------------------------------
  /*protected async getAccountByAddress(address: string): Promise<AccountStats> {
    const add: string[] = [address]
    const account = await this.domain.getAccountStats(add)
    if (!account) throw new Error(`Account ${address} does not exist`)
    return account[0]
  }*/

  protected async filterAccounts({
    types,
    accounts,
    authorities,
    includeStats,
  }: AccountsFilters): Promise<BrickAccountData[]> {
    const accountMap = await this.domain.getAccounts(includeStats)

    accounts =
      accounts ||
      Object.values(accountMap).map((account) => account.info.address)

    let accountsData = accounts
      .map((address) => accountMap[address])
      .filter((account) => !!account)

    if (types !== undefined) {
      accountsData = accountsData.filter(({ info }) =>
        types!.includes(info.type),
      )
    }

    if (authorities !== undefined) {
      accountsData = accountsData.filter(({ info }) => {
        if ('authority' in info.data) {
          const accountAuthority = info.data.authority.toString();
          return authorities.includes(accountAuthority); 
        }
      });
    }

    return accountsData
  }
}
