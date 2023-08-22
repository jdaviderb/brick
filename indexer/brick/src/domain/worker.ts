import { StorageStream } from '@aleph-indexer/core'
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
import { BrickEvent, InstructionType, Product, RawInstruction, RawInstructionsInfo, RegisterBuyCnftInfo } from '../utils/layouts/index.js'
import { BrickAccountStats, BrickAccountInfo, AlephPostContent } from '../types.js'
import { AccountDomain } from './account.js'
import { createAccountStats } from './stats/timeSeries.js'
import { BRICK_PROGRAM_ID } from '../constants.js'
import { UserDomain } from './user.js'
import { ImportAccountFromPrivateKey } from "aleph-sdk-ts/dist/accounts/solana.js";
import { Publish as publishPost, Get as getPost } from 'aleph-sdk-ts/dist/messages/post/index.js';
import { ItemType } from 'aleph-sdk-ts/dist/messages/types/base.js'

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
    InstructionType.RegisterBuyCnft, 
    InstructionType.RegisterBuyToken
  ])
  protected messagesSigner = ImportAccountFromPrivateKey(Uint8Array.from(JSON.parse(process.env.MESSAGES_KEY || '')))

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
      const parsedIxs = await this.parse(ixsContext, context)

      console.log(`indexing ${ixsContext.length} parsed ixs`)
      await this.eventDAL.save(parsedIxs)
    }
  }

  async parse(
    ixCtxs: SolanaParsedInstructionContext[], 
    context: Context, 
  ): Promise<BrickEvent[]> {
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
      if (this.isBuyEvent(info)) {
        await this.processBuyEvent(info)
        events.push({...commonEventData, account: info.product} as BrickEvent)
      } else {
        events.push({...commonEventData, account: context.account} as BrickEvent)
      }
    }
    return events
  }

  isBuyEvent(info: RawInstructionsInfo): info is RegisterBuyCnftInfo {
    return (
        'paymentMint' in info &&
        'params' in info &&
        'amount' in info.params
    );
  }

  async processBuyEvent(info: RegisterBuyCnftInfo) {
    console.log('TIMESTAMPPP', Date.now())
    await this.generateAlephMessage(info)
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
  }

  async generateAlephMessage(info: RegisterBuyCnftInfo) {
    try {
      const productInfo: BrickAccountInfo = this.accounts[info.product].info;
      const data = productInfo.data as Product
      const combinedArray = [...data.firstId, ...data.secondId];
      const byteArray = new Uint8Array(combinedArray);
      const datasetID = String.fromCharCode(...byteArray);
      const purchaseResponse = await getPost<AlephPostContent>({
          types: 'Permission',
          pagination: 1,
          page: 1,
          refs: [],
          addresses: [this.messagesSigner.address],
          tags: [info.product, info.signer],
          hashes: [],
          APIServer: "https://api2.aleph.im"
      });
      if (purchaseResponse.posts.length === 0) {
        await publishPost({
          account: this.messagesSigner,
          postType: 'Permission',
          content: {
            datasetID,
            authorizer: info.seller,
            status: "GRANTED",
            executionCount: info.params.amount,
            maxExecutionCount: -1,
            requestor: info.signer,
            tags: [info.product, info.signer],
          },
          channel: 'FISHNET_TEST_V1.8',
          APIServer: 'https://api2.aleph.im',
          inlineRequested: true,
          storageEngine: ItemType.inline
        })
      } else {
        const executionCount = purchaseResponse.posts[0].content.executionCount + info.params.amount;
        await publishPost({
          account: this.messagesSigner,
          postType: 'amend',
          ref: purchaseResponse.posts[0].hash,
          content: {
              datasetID,
              authorizer: info.seller,
              status: "GRANTED",
              executionCount,
              maxExecutionCount: -1,
              requestor: info.signer,
              tags: [info.product, info.signer],
          },
          channel: 'FISHNET_TEST_V1.1',
          APIServer: 'https://api2.aleph.im',
          inlineRequested: true,
          storageEngine: ItemType.inline
        })
      }
    } catch(e) {
      throw new Error(`Error granting permission: ${e}`)
    }
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
