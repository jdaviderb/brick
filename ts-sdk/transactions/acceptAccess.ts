import { Connection, PublicKey, SYSVAR_RENT_PUBKEY, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { BRICK_PROGRAM_ID_PK, AcceptAccessInstructionAccounts, createAcceptAccessInstruction } from "../utils";

export async function createAcceptAccessTransaction(connection: Connection, signer: PublicKey, receiver: PublicKey): Promise<VersionedTransaction> {
  const [marketplace] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("marketplace", "utf-8"),
        signer.toBuffer()
      ],
      BRICK_PROGRAM_ID_PK
  );
  const [accessMint] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("access_mint", "utf-8"),
        marketplace.toBuffer(),
      ],
      BRICK_PROGRAM_ID_PK
  );
  const [request] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("request", "utf-8"),
        receiver.toBuffer(),
        marketplace.toBuffer()
      ],
      BRICK_PROGRAM_ID_PK
  );
  const accounts: AcceptAccessInstructionAccounts = {
      systemProgram: SystemProgram.programId,
      tokenProgram2022: TOKEN_2022_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
      signer,
      receiver,
      marketplace,
      request,
      accessMint,
      accessVault: getAssociatedTokenAddressSync(accessMint, receiver, false, TOKEN_2022_PROGRAM_ID),
  };
  const ix = createAcceptAccessInstruction(accounts);
  let blockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
  const messageV0 = new TransactionMessage({
    payerKey: accounts.signer,
    recentBlockhash: blockhash,
    instructions: [ix],
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
}