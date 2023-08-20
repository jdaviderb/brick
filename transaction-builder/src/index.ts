import { createInitProductTreeTransaction, createRegisterBuyCnftTransaction, queryPurchases } from 'brick-protocol';
import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import { Connection, PublicKey } from '@solana/web3.js';

dotenv.config();

const app: Express = express();
const port = process.env.PORT;
const rpc = process.env.RPC;

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
        const { signer, marketplace,  product, paymentMint, seller, marketplaceAuth, merkleTree, params } = req.query;
        if (!signer || !marketplace || !paymentMint) throw new Error('Error: Missing account');
        
        const accounts = {
            signer: new PublicKey(signer),
            marketplace: new PublicKey(marketplace),
            product: new PublicKey(product),
            paymentMint: new PublicKey(paymentMint),
            seller: new PublicKey(seller),
            marketplaceAuth: new PublicKey(marketplaceAuth),
            merkleTree: new PublicKey(merkleTree),
        };

        const transaction = await createRegisterBuyCnftTransaction(connection, accounts, params);        
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
