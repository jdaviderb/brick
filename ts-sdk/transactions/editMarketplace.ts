import { EditMarketplaceInstructionAccounts, EditMarketplaceParams, createEditMarketplaceInstruction } from "../utils/solita"
import { Connection, PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { BRICK_PROGRAM_ID_PK } from "../constants";

type EditMarketplaceAccounts = {
    signer: PublicKey,
    rewardMint: PublicKey,
    discountMint: PublicKey,
};

export async function createEditMarketplaceTransaction(
    connection: Connection, 
    accounts: EditMarketplaceAccounts, 
    params: EditMarketplaceParams
): Promise<VersionedTransaction> {
    const [marketplace] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("marketplace", "utf-8"),
          accounts.signer.toBuffer()
        ],
        BRICK_PROGRAM_ID_PK
    );

    const ixAccounts: EditMarketplaceInstructionAccounts = {
        ...accounts,
        marketplace,
    };
    const ix = createEditMarketplaceInstruction(ixAccounts, { params });
    let blockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
    const messageV0 = new TransactionMessage({
        payerKey: accounts.signer,
        recentBlockhash: blockhash,
        instructions: [ix],
    }).compileToV0Message();

    return new VersionedTransaction(messageV0);
}