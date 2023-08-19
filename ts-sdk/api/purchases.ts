import { InstructionType } from '../types';
import { IX_DATA_LAYOUT } from '../utils/solita/instructions';
import { Connection } from '@solana/web3.js';

export async function queryPurchases(url: string, owner: string, productMint: string): Promise<number> {
    const requestOwnerData = {
        jsonrpc: '2.0',
        id: 'brick',
        method: 'searchAssets',
        params: {
            ownerAddress: owner,
            compressed: true,
            grouping: ["collection", productMint],
            page: 1,
            limit: 1000
        },
    };
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(requestOwnerData),
    });

    if (!response.ok) throw new Error(`searchAssets method with status ${response.status}`);
    
    const responseBody = await response.json();
    
    // Fetch signatures for each asset and process the transaction unique transaction it will have
    let unitsPurchased = 0;
    for (const asset of responseBody.result.items) {
        const requestSignaturesData = {
            jsonrpc: '2.0',
            id: 'brick',
            method: 'getSignaturesForAsset',
            params: {
                id: asset.id,
                page: 1,
                limit: 1000
            },
        };
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(requestSignaturesData),
        });
    
        if (!response.ok) throw new Error(`getSignaturesForAsset method with status ${response.status}`);

        const responseBody = await response.json();
        const connection: Connection = new Connection(url);    
        const tx = await connection.getTransaction(responseBody.result.items[0][0], {commitment: 'confirmed', maxSupportedTransactionVersion: 1});
        const [context] = IX_DATA_LAYOUT[InstructionType.RegisterBuyCnft].deserialize(tx?.transaction.message.compiledInstructions[1].data);
        const { ...result } = context;
        unitsPurchased += result.params.amount; 
    }
    return unitsPurchased;
}