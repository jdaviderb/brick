import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { InitBountyInstructionAccounts, createInitBountyInstruction } from "../utils/solita"
import { Connection, PublicKey, SYSVAR_RENT_PUBKEY, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { BRICK_PROGRAM_ID_PK } from "../constants";

type InitBountyAccounts = {
    signer: PublicKey
    rewardMint: PublicKey
}

export async function createInitBountyTransaction(
    connection: Connection, 
    accounts: InitBountyAccounts, 
): Promise<VersionedTransaction> {
    const [marketplace] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("marketplace", "utf-8"),
          accounts.signer.toBuffer()
        ],
        BRICK_PROGRAM_ID_PK
    );
    const [bountyVault] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("bounty_vault", "utf-8"),
          marketplace.toBuffer(),
          accounts.rewardMint.toBuffer()
        ],
        BRICK_PROGRAM_ID_PK
    );
    const ixAccounts: InitBountyInstructionAccounts = {
        ...accounts,
        systemProgram: SystemProgram.programId,
        tokenProgramV0: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        marketplace,
        bountyVault,
    };
    const ix = createInitBountyInstruction(ixAccounts);
    let blockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
    const messageV0 = new TransactionMessage({
        payerKey: accounts.signer,
        recentBlockhash: blockhash,
        instructions: [ix],
    }).compileToV0Message();
    
    return new VersionedTransaction(messageV0);
}