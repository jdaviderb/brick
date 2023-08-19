import { StorageStream } from '@aleph-indexer/core'
import { EventDALIndex, EventStorage } from '../dal/event.js'
import { BrickEvent } from '../utils/layouts/index.js'

export class UserDomain {
  constructor(
    public address: string,
    protected eventDAL: EventStorage,
  ) {}

  async getEventsByTime(
    startDate: number,
    endDate: number,
    opts: any,
  ): Promise<StorageStream<string, BrickEvent>> {
    return await this.eventDAL
      .useIndex(EventDALIndex.UserTimestamp)
      .getAllFromTo(
        [this.address, startDate],
        [this.address, endDate],
        opts,
      )
  }
}
