import { Product, createInitProductTreeTransaction, createRegisterBuyCnftTransaction, queryAccounts, queryPurchases } from 'brick-protocol';
import express, { Express, Request, Response } from 'express';
import { ImportAccountFromPrivateKey } from 'aleph-sdk-ts/dist/accounts/solana.js';
import dotenv from 'dotenv';
import { Connection, PublicKey } from '@solana/web3.js';
import { generateAlephMessage } from './aleph.js';

dotenv.config();

const app: Express = express();
const port = process.env.PORT;
const rpc = process.env.RPC;
const messagesKey = process.env.MESSAGES_KEY;
const indexerApi = process.env.INDEXER_API;

app.use(express.json());

app.get('/initProductTree', async (req: Request, res: Response) => {
    try {
        if (!rpc) throw new Error('Error: Server rpc not configured');
        const connection = new Connection(rpc);
        const { signer, marketplace, paymentMint, params } = req.query;
        if (!signer || !marketplace || !paymentMint) throw new Error('Error: Missing account');
        
        const accounts = {
            signer: new PublicKey(signer),
            marketplace: new PublicKey(marketplace),
            paymentMint: new PublicKey(paymentMint)
        };

        const transaction = await createInitProductTreeTransaction(connection, accounts, params);
        res.status(200).send({ transaction: Buffer.from(transaction.serialize()).toString('base64') });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

app.get('/registerBuy', async (req: Request, res: Response) => {
    try {
        if (!rpc) throw new Error('Error: Server rpc not configured');
        const connection = new Connection(rpc);

        const { signer, marketplace, product, paymentMint, seller, marketplaceAuth, params } = req.query;
        if (!signer || !marketplace || !paymentMint || !product || !seller || !marketplaceAuth || !params) {
          throw new Error('Error: Missing required information');
        }        

        if (!messagesKey) throw new Error('Error: MessagesKey not configured');
        const messagesSigner = ImportAccountFromPrivateKey(Uint8Array.from(JSON.parse(messagesKey)));

        if (!indexerApi) throw new Error('Error: Indexer server not configured');
        const productResponse = await queryAccounts(indexerApi, { accounts: [product] });
        const productInfo = productResponse[0].data as Product;
        const itemHash = await generateAlephMessage({ seller, signer, units: Number(params.amount), paymentMint, totalAmount: Number(productInfo.sellerConfig.productPrice) * params.amount }, messagesSigner);
        console.log('merkle', productInfo)
        const accounts = {
            signer: new PublicKey(signer),
            marketplace: new PublicKey(marketplace),
            product: new PublicKey(product),
            paymentMint: new PublicKey(paymentMint),
            seller: new PublicKey(seller),
            marketplaceAuth: new PublicKey(marketplaceAuth),
            merkleTree: new PublicKey(productInfo.merkleTree),
        };
        const parsedParams = {
            rewardsActive: params.rewardsActive === 'true' ? true : false,
            amount: Number(params.amount),
            name: params.name,
            uri: `https://api1.aleph.im/api/v0/messages.json?hashes=${itemHash}`,
        }
        const transaction = await createRegisterBuyCnftTransaction(connection, accounts, parsedParams);     

        res.status(200).send({ transaction: Buffer.from(transaction.serialize()).toString('base64') });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

app.get('/queryPurchases', async (req: Request, res: Response) => {
    try {
        if (!rpc) throw new Error('Error: Server rpc not configured');

        const { ownerAddress, productMint } = req.query;
        if (!ownerAddress || !productMint) throw new Error('Error: Missing account');
        const purchases = await queryPurchases(rpc, ownerAddress, productMint);        
        res.status(200).send({ purchases });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
