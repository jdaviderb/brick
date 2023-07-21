import { ImportAccountFromPrivateKey } from 'aleph-sdk-ts/dist/accounts/solana.js'
import { Publish, Get } from 'aleph-sdk-ts/dist/messages/post/index.js'
import { SolanaParsedInstructionContext } from '@aleph-indexer/solana'
import { ItemType } from 'aleph-sdk-ts/dist/messages/types/base.js'
import { SOLAccount } from 'aleph-sdk-ts/dist/accounts/solana.js'
import { BrickAccountInfo, DataSetContent } from '../types.js'
import { EventBase } from '@aleph-indexer/framework'
import { config } from '../utils/envs.js'
import {
  BrickEvent,
  RawInstruction,
  InstructionType,
  IX_KEY_ACCOUNTS,
  RawInstructionInfo,
  Product,
} from '../utils/layouts/index.js'

export class EventParser {
  protected messagesSigner: SOLAccount = ImportAccountFromPrivateKey(Uint8Array.from(JSON.parse(config.MESSAGES_KEY || '')))

  async parse(ixCtx: SolanaParsedInstructionContext, accountInfo?: BrickAccountInfo): Promise<BrickEvent> {
    const { instruction, parentTransaction, parentInstruction } = ixCtx
    const parsed = (instruction as RawInstruction).parsed

    if (!Object.values(InstructionType).includes(parsed.type)) 
      throw new Error(`Invalid instruction type: ${parsed.type}`)
    
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
    }
    
    if (parsed.type === InstructionType.RegisterBuy || parsed.type === InstructionType.RegisterPromoBuy) 
      await this.grantPermission(accountInfo?.data as Product, parsed.info.signer)

    return this.buildEvent(baseEvent, parsed.info)
  }
  
  async grantPermission(product: Product, signer: string) {
    try {
      await Publish({
        account: this.messagesSigner,
        postType: 'Permission',
        content: {
          autorizer: product.productAuthority,
          status: "GRANTED",
          executionCount: 0,
          maxExecutionCount: -1,
          requestor: signer,
        },
        channel: 'FISHNET_TEST_V1.1',
        APIServer: 'https://api2.aleph.im',
        inlineRequested: true,
        storageEngine: ItemType.inline
      })
    } catch (e) {
      throw new Error(`Error granting permission`)
    }
  }

  buildEvent<T extends RawInstructionInfo>(baseEvent: EventBase<InstructionType>, info: T): BrickEvent {
    const [account, signer] = IX_KEY_ACCOUNTS[baseEvent.type]
    return {
      ...baseEvent,
      info,
      account,
      signer,
    } as BrickEvent;
  }
  
  getIdFromBuffer(array: number[]): string {
    const buffer = Buffer.from(array);
    const decoder = new TextDecoder();
    return decoder.decode(buffer);
  }
}

export const eventParser = new EventParser()
export default eventParser
