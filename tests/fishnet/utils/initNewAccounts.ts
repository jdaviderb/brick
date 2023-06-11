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
  appName: string,
  buyerBalance?: number,
  sellerBalance?: number,
  creatorBalance?: number
) {
  const connection = new Connection(
    "https://api.testnet.solana.com",
    "processed"
  );
  const slot = await connection.getSlot();

  const appCreatorKeypair = await createFundedWallet(provider, 20);
  const sellerKeypair = await createFundedWallet(provider, 20);
  const buyerKeypair = await createFundedWallet(provider, 20);

  const acceptedMintPublicKey = await createMint(provider);

  const [firstId, secondId] = getSplitId(uuid())
  const buyTimestamp = new anchor.BN(await connection.getBlockTime(slot));
  const secondBuyTimestamp = new anchor.BN(
    (await connection.getBlockTime(slot)) + 1
  );
  const [appPublicKey] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("app", "utf-8"), Buffer.from(appName, "utf-8")],
    program.programId
  );
  const [tokenMint] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("token_mint", "utf-8"), firstId, secondId],
    program.programId
  );
  const [tokenConfig] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("token_config", "utf-8"), tokenMint.toBuffer()],
    program.programId
  );
  const [paymentPublicKey] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("payment_account", "utf-8"),
      tokenMint.toBuffer(),
      buyerKeypair.publicKey.toBuffer(),
      Buffer.from(buyTimestamp.toArray('le', 8)),
    ],
    program.programId
  );
  const [paymentVaultPublicKey] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("payment_vault", "utf-8"), paymentPublicKey.toBuffer()],
    program.programId
  );
  const [secondPaymentPublicKey] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("payment_account", "utf-8"),
      tokenMint.toBuffer(),
      buyerKeypair.publicKey.toBuffer(),
      secondBuyTimestamp.toBuffer("le", 8),
    ],
    program.programId
  );
  const [secondPaymentVaultPublicKey] =
    anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("payment_vault", "utf-8"),
        secondPaymentPublicKey.toBuffer(),
      ],
      program.programId
    );

  const buyerTokenVault = await getAssociatedTokenAddress(
    tokenMint,
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
      appCreatorKeypair
    );
  }

  return {
    appPublicKey,
    appCreatorKeypair,
    creatorTransferVault,
    sellerKeypair,
    acceptedMintPublicKey,
    firstId,
    secondId,
    tokenConfig,
    tokenMint,
    buyerKeypair,
    buyerTokenVault,
    buyerTransferVault,
    sellerTransferVault,
    buyTimestamp,
    paymentPublicKey,
    paymentVaultPublicKey,
    secondBuyTimestamp,
    secondPaymentPublicKey,
    secondPaymentVaultPublicKey,
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
