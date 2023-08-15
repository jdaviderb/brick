import { Connection, PublicKey, SYSVAR_RENT_PUBKEY, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { RequestAccessInstructionAccounts, createRequestAccessInstruction } from "../utils/solita";
import { BRICK_PROGRAM_ID_PK } from "../utils/constants";

type RequestAccessAccounts = {
  signer: PublicKey
  marketplace: PublicKey
}

export async function createRequestAccessTransaction(
  connection: Connection, 
  accounts: RequestAccessAccounts, 
): Promise<VersionedTransaction> {
  const [request] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("request", "utf-8"),
        accounts.signer.toBuffer(),
        accounts.marketplace.toBuffer()
      ],
      BRICK_PROGRAM_ID_PK
  );
  const ixAccounts: RequestAccessInstructionAccounts = {
      ...accounts,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
      request,
  };
  const ix = createRequestAccessInstruction(ixAccounts);
  let blockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
  const messageV0 = new TransactionMessage({
    payerKey: accounts.signer,
    recentBlockhash: blockhash,
    instructions: [ix],
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
}