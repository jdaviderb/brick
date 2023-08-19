import { StorageStream, Utils } from '@aleph-indexer/core'
import {
  IndexerDomainContext,
  AccountIndexerConfigWithMeta,
  IndexerWorkerDomain,
  IndexerWorkerDomainWithStats,
  createStatsStateDAL,
  createStatsTimeSeriesDAL,
  AccountTimeSeriesStats,
  AccountStatsFilters,
  AccountStats,
  ParserContext,
} from '@aleph-indexer/framework'
import {
  isParsedIx,
  SolanaIndexerWorkerDomainI,
  SolanaParsedInstructionContext,
  RawMessageAccount,
} from '@aleph-indexer/solana'
import { createEventDAL } from '../dal/event.js'
import { BrickEvent, InstructionType, RawInstruction } from '../utils/layouts/index.js'
import { BrickAccountStats, BrickAccountInfo } from '../types.js'
import { AccountDomain } from './account.js'
import { createAccountStats } from './stats/timeSeries.js'
import { BRICK_PROGRAM_ID } from '../constants.js'
import { UserDomain } from './user.js'

type Context = {
  account: string
  startDate: number
  endDate: number
}
export default class WorkerDomain
  extends IndexerWorkerDomain
  implements SolanaIndexerWorkerDomainI, IndexerWorkerDomainWithStats
{
  protected accounts: Record<string, AccountDomain> = {}
  protected users: Record<string, UserDomain> = {}
  protected registerBuySet = new Set([
    InstructionType.RegisterBuy, 
    InstructionType.RegisterBuyCnft, 
    InstructionType.RegisterBuyCounter, 
    InstructionType.RegisterBuyToken
  ])

  constructor(
    protected context: IndexerDomainContext,
    protected eventDAL = createEventDAL(context.dataPath),
    protected statsStateDAL = createStatsStateDAL(context.dataPath),
    protected statsTimeSeriesDAL = createStatsTimeSeriesDAL(context.dataPath),
    protected programId = BRICK_PROGRAM_ID,
  ) {
    super(context)
  }

  async onNewAccount(
    config: AccountIndexerConfigWithMeta<BrickAccountInfo>,
  ): Promise<void> {
    const { blockchainId, account, meta } = config
    const { apiClient } = this.context

    const accountTimeSeries = await createAccountStats(
      blockchainId,
      account,
      apiClient,
      this.eventDAL,
      this.statsStateDAL,
      this.statsTimeSeriesDAL,
    )

    this.accounts[account] = new AccountDomain(
      meta,
      this.eventDAL,
      accountTimeSeries,
    )

    console.log('Account indexing', this.context.instanceName, account)
  }

  onNewUser(address: string,) {
    this.users[address] = new UserDomain(
      address,
      this.eventDAL,
    )

    console.log('User indexing', this.context.instanceName, address)
  }

  async updateStats(account: string, now: number): Promise<void> {
    const actual = this.getAccount(account) as AccountDomain
    await actual.updateStats(now)
  }

  async getTimeSeriesStats(
    account: string,
    type: string,
    filters: AccountStatsFilters,
  ): Promise<AccountTimeSeriesStats> {
    const actual = this.getAccount(account) as AccountDomain
    return actual.getTimeSeriesStats(type, filters)
  }

  async getStats(account: string): Promise<AccountStats<BrickAccountStats>> {
    return this.getAccountStats(account)
  }

  async solanaFilterInstruction(
    context: ParserContext,
    entity: SolanaParsedInstructionContext,
  ): Promise<boolean> {
    return (
      isParsedIx(entity.instruction) &&
      entity.instruction.programId === BRICK_PROGRAM_ID
    )
  }

  async solanaIndexInstructions(
    context: ParserContext,
    ixsContext: SolanaParsedInstructionContext[],
  ): Promise<void> {
    if ('account' in context) {
      const parsedIxs = this.parse(ixsContext, context)

      console.log(`indexing ${ixsContext.length} parsed ixs`)
      await this.eventDAL.save(parsedIxs)
    }
  }

  parse(
    ixCtxs: SolanaParsedInstructionContext[], 
    context: Context, 
  ): BrickEvent[] {
    const events: BrickEvent[] = []
    for (const ixCtx of ixCtxs) {
      const { instruction, parentInstruction, parentTransaction } = ixCtx
      const parsed = (instruction as RawInstruction).parsed

      const id = `${parentTransaction.signature}${
        parentInstruction
          ? ` :${parentInstruction.index.toString().padStart(2, '0')}`
          : ''
      }:${instruction.index.toString().padStart(2, '0')}`
  
      const timestamp = parentTransaction.blockTime
        ? parentTransaction.blockTime * 1000
        : parentTransaction.slot
  
      const signer = parentTransaction.parsed.message.accountKeys.find(
        (acc: RawMessageAccount) => acc.signer,
      )?.pubkey
  
      const { type, info } = parsed;
      const commonEventData = {
        id,
        timestamp,
        type,
        signer,
        info,
      }
      if (this.registerBuySet.has(type) && 'product' in info && 'seller' in info) {
        const buyerInstance = this.users[info.signer]
        if (!buyerInstance) {
          this.onNewUser(info.signer)
          console.log('NEW USER!', this.users[info.signer])
        }
        const sellerInstance = this.users[info.seller]
        if (!sellerInstance) {
          this.onNewUser(info.seller)
          console.log('NEW USER!', this.users[info.seller])
        }
        events.push({...commonEventData, account: info.product} as BrickEvent)
      } else {
        events.push({...commonEventData, account: context.account} as BrickEvent)
      }
    }
    return events
  }

  // ------------- Custom impl methods -------------------

  async getAccountInfo(actual: string): Promise<BrickAccountInfo> {
    const res = this.getAccount(actual) as AccountDomain
    return res.info
  }

  async getAccountStats(
    actual: string,
  ): Promise<AccountStats<BrickAccountStats>> {
    const res = this.getAccount(actual) as AccountDomain
    return res.getStats()
  }

  async getAccountEventsByTime(
    account: string,
    startDate: number,
    endDate: number,
    opts: any,
  ): Promise<StorageStream<string, BrickEvent>> {
    const res = this.getAccount(account)
    return await res.getEventsByTime(startDate, endDate, opts)
  }

  private getAccount(account: string): UserDomain | AccountDomain {
    const accountInstance = this.accounts[account];
    const userInstance = this.users[account];

    if (!accountInstance && !userInstance) throw new Error(`Account ${account} does not exist`);
    
    return accountInstance || userInstance;
  }

}
