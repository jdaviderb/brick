import {
  SolanaParsedInstructionContext,
} from '@aleph-indexer/solana'
import { SOLAccount } from 'aleph-sdk-ts/dist/accounts/solana.js'
import { ItemType } from 'aleph-sdk-ts/dist/messages/message.js'
import { Publish, Get } from "aleph-sdk-ts/dist/messages/post/index.js"
import { AccountDomain } from '../domain/account.js'
import { AlephDataSetContent } from '../types.js'
import {
  BrickCreateAppEvent,
  BrickEvent,
  InstructionType,
  ParsedTokenMetadata,
  RawInstruction,
} from '../utils/layouts/index.js'

export class EventParser {
  async parse(ixCtx: SolanaParsedInstructionContext, accounts: Record<string, AccountDomain>, account: SOLAccount): Promise<BrickEvent> {
    const { instruction, parentTransaction, parentInstruction } = ixCtx
    const parsed = (instruction as RawInstruction).parsed

    const id = `${parentTransaction.signature}${
      parentInstruction ? ` :${parentInstruction.index.toString().padStart(2, '0')}` : ''
    }:${instruction.index.toString().padStart(2, '0')}`

    const timestamp = parentTransaction.blockTime
      ? parentTransaction.blockTime * 1000
      : parentTransaction.slot

    const baseEvent = {
      id,
      timestamp,
      type: parsed.type,
      signer: parsed.info.authority,
      info: parsed.info
    }

    if (parsed.type === InstructionType.CreateApp) {
      return {
        account: parsed.info.app, 
        ...baseEvent,
      } as BrickCreateAppEvent
    }
    else {
      const tokenAccount = parsed.info.token
      if (!accounts[tokenAccount]) return {
        account: "DeletedAccount",
        ...baseEvent,
      } as BrickEvent
      const appAddress = (accounts[tokenAccount].info.data as ParsedTokenMetadata).app.toString()
      const seller = (accounts[tokenAccount].info.data as ParsedTokenMetadata).authority.toString()
      if (parsed.type === InstructionType.UseToken && appAddress === '3zDf4PEpshwWuv5EL9NVwZ6wE5tKSqT6Erbr46zpeVuz') {
        const hash1 = (accounts[tokenAccount].info.data as ParsedTokenMetadata).offChainId.toString()
        const hash2 = (accounts[tokenAccount].info.data as ParsedTokenMetadata).offChainId2.toString()
        try {
          const dataSet = await Get<AlephDataSetContent>({
            types: 'Dataset',
            pagination: 1,
            page: 1,
            hashes: [hash1 + hash2],
            APIServer: "https://api2.aleph.im",
          })
          const timeseriesIds = dataSet.posts[0].content.timeseriesIDs
          for (const id of timeseriesIds) {
            await Publish({
              account: account,
              postType: 'Permission',
              content: {
                timeseriesID: id,
                autorizer: seller, // solana account that lists the token
                status: "GRANTED",
                executionCount: 0,
                maxExecutionCount: -1,
                requestor: parsed.info.authority, // solana address that burns the token
              },
              channel: 'FISHNET_TEST_V1.1', // need the gud channel
              APIServer: 'https://api2.aleph.im',
              inlineRequested: true,
              storageEngine: ItemType.inline
            })
          }
        } catch (e) {
          console.log(e)
        }
      }
      return {
        account: parsed.info.token,
        ...baseEvent,
      } as BrickEvent
    }
  }
}

export const eventParser = new EventParser()
export default eventParser

