import { SOLAccount } from 'aleph-sdk-ts/dist/accounts/solana.js';
import { Publish as publishPost } from 'aleph-sdk-ts/dist/messages/post/index.js';
import { ItemType } from 'aleph-sdk-ts/dist/messages/types/base.js';

type MessageContent = {
    product: string;
    seller: string;
    signer: string;
    units: number;
    paymentMint: string;
    totalAmount: number;
}

export async function generateAlephMessage(content: MessageContent, messagesSigner: SOLAccount): Promise<string> {
    try {
        const resp = await publishPost({
            account: messagesSigner,
            postType: 'Purchase',
            content,
            channel: 'BRICK_V1',
            APIServer: 'https://api2.aleph.im',
            inlineRequested: true,
            storageEngine: ItemType.inline
        });

        return resp.item_hash;
    } catch(e) {
      console.log(`Error posting aleph message: ${e}`)
    }
}