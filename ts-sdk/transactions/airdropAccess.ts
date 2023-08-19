import { Connection, PublicKey, SYSVAR_RENT_PUBKEY, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { AirdropAccessInstructionAccounts, createAirdropAccessInstruction } from "../utils";
import { BRICK_PROGRAM_ID_PK } from "../constants";

export async function createAirdropAccessTransaction(connection: Connection, signer: PublicKey, receiver: PublicKey) {
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
  const accounts: AirdropAccessInstructionAccounts = {
      systemProgram: SystemProgram.programId,
      tokenProgram2022: TOKEN_2022_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
      signer,
      receiver,
      marketplace,
      accessMint,
      accessVault: getAssociatedTokenAddressSync(accessMint, receiver, false, TOKEN_2022_PROGRAM_ID),
  };
  const ix = createAirdropAccessInstruction(accounts);
  let blockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
  const messageV0 = new TransactionMessage({
    payerKey: accounts.signer,
    recentBlockhash: blockhash,
    instructions: [ix],
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
}