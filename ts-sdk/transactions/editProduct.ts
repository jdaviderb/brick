import { EditProductInstructionArgs } from "../types";
import { EditProductInstructionAccounts, createEditProductInstruction } from "../utils/solita"
import { Connection, TransactionMessage, VersionedTransaction } from "@solana/web3.js";

// to-do: Multiple edits in the same transaction (applicable to other instructions)
export async function createEditProducTransaction(
    connection: Connection, 
    accounts: EditProductInstructionAccounts, 
    params: EditProductInstructionArgs
): Promise<VersionedTransaction> {
    const ix = createEditProductInstruction(accounts, params);
    let blockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
    const messageV0 = new TransactionMessage({
        payerKey: accounts.signer,
        recentBlockhash: blockhash,
        instructions: [ix],
    }).compileToV0Message();
    
    return new VersionedTransaction(messageV0);
}