import { Program, AnchorProvider } from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";
import { TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import {
  createFundedWallet,
  createMint,
  createFundedAssociatedTokenAccount,
} from ".";
import { v4 as uuid } from "uuid";
import { Connection } from "@solana/web3.js";
import { Fishnet } from "../../../target/types/fishnet";
import { Buffer } from 'buffer';

export async function initNewAccounts(
  provider: AnchorProvider,
  program: Program<Fishnet>,
  governanceAuthorityKeypair: anchor.web3.Keypair,
  buyerBalance?: number,
  sellerBalance?: number,
  creatorBalance?: number
) {
  const sellerKeypair = await createFundedWallet(provider, 20);
  const buyerKeypair = await createFundedWallet(provider, 20);

  const acceptedMintPublicKey = await createMint(provider);
  const [firstId, secondId] = getSplitId(uuid())


  const [productMintPubkey, mintBump] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("product_mint", "utf-8"), firstId, secondId],
    program.programId
  );
  const [productPubkey] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("token_config", "utf-8"), productMintPubkey.toBuffer()],
    program.programId
  );

  const buyerTokenVault = await getAssociatedTokenAddress(
    productMintPubkey,
    buyerKeypair.publicKey,
    true,
    TOKEN_2022_PROGRAM_ID
  );

  let buyerTransferVault = undefined;
  let sellerTransferVault = undefined;
  let creatorTransferVault = undefined;
  if (buyerBalance && sellerBalance) {
    buyerTransferVault = await createFundedAssociatedTokenAccount(
      provider,
      acceptedMintPublicKey,
      buyerBalance,
      buyerKeypair
    );
    sellerTransferVault = await createFundedAssociatedTokenAccount(
      provider,
      acceptedMintPublicKey,
      sellerBalance,
      sellerKeypair
    );
  }
  if (creatorBalance) {
    creatorTransferVault = await createFundedAssociatedTokenAccount(
      provider,
      acceptedMintPublicKey,
      creatorBalance,
      governanceAuthorityKeypair
    );
  }

  return {
    creatorTransferVault,
    sellerKeypair,
    acceptedMintPublicKey,
    firstId,
    secondId,
    productPubkey,
    productMintPubkey,
    mintBump,
    buyerKeypair,
    buyerTokenVault,
    buyerTransferVault,
    sellerTransferVault,
  };
}

function getSplitId(str: string): [Buffer, Buffer]{
  const bytes = new TextEncoder().encode(str);

  const data = new Uint8Array(64);
  data.fill(32);
  data.set(bytes);

  const firstId = Buffer.from(data.slice(0, 32));
  const secondId = Buffer.from(data.slice(32));

  return [firstId, secondId];
}
