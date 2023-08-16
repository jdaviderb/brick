import {
  SolanaParsedInstructionContext,
  RawMessageAccount,
} from '@aleph-indexer/solana'
import {
  BrickEvent,
  InstructionType,
  RawInstruction,
  RawInstructionsInfo,
} from '../utils/layouts/index.js'

export class EventParser {
  protected registerBuySet = new Set([
    InstructionType.RegisterBuy, 
    InstructionType.RegisterBuyCnft, 
    InstructionType.RegisterBuyCounter, 
    InstructionType.RegisterBuyToken
  ])
  parse(ixCtx: SolanaParsedInstructionContext, account: string): BrickEvent {
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

    if (this.registerBuySet.has(type) && 'product' in info) {
      return {
          ...commonEventData,
          account: info.product,
      } as BrickEvent
    } else {
      return {
          ...commonEventData,
          account,
      } as BrickEvent
    }
  }
}

export const eventParser = new EventParser()
export default eventParser
