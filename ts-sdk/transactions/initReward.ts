import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { InitRewardInstructionAccounts, createInitRewardInstruction } from "../utils/solita"
import { Connection, PublicKey, SYSVAR_RENT_PUBKEY, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { BRICK_PROGRAM_ID_PK } from "../utils";

type InitRewardAccounts = {
    signer: PublicKey
    rewardMint: PublicKey
}

export async function createInitRewardTransaction(
    connection: Connection, 
    accounts: InitRewardAccounts, 
): Promise<VersionedTransaction> {
    const [marketplace] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("marketplace", "utf-8"),
          accounts.signer.toBuffer()
        ],
        BRICK_PROGRAM_ID_PK
    );
    const [reward] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("reward", "utf-8"), 
          accounts.signer.toBuffer(),
          marketplace.toBuffer()
        ],
        BRICK_PROGRAM_ID_PK
    );
    const [rewardVault] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("reward_vault", "utf-8"), 
          accounts.signer.toBuffer(),
          marketplace.toBuffer(),
          accounts.rewardMint.toBuffer(),
        ],
        BRICK_PROGRAM_ID_PK
    );
    const ixAccounts: InitRewardInstructionAccounts = {
        ...accounts,
        systemProgram: SystemProgram.programId,
        tokenProgramV0: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        marketplace,
        reward,
        rewardVault,
    };
    const ix = createInitRewardInstruction(ixAccounts);
    let blockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
    const messageV0 = new TransactionMessage({
        payerKey: accounts.signer,
        recentBlockhash: blockhash,
        instructions: [ix],
    }).compileToV0Message();
    
    return new VersionedTransaction(messageV0);
}