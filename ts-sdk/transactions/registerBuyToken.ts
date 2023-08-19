import { BRICK_PROGRAM_ID_PK } from "../constants";
import { RegisterBuyTokenInstructionAccounts, createRegisterBuyTokenInstruction } from "../utils/solita"
import { Connection, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { NATIVE_MINT, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";

type RegisterBuyTokenAccounts = {
    signer: PublicKey
    marketplace: PublicKey
    product: PublicKey
    seller: PublicKey
    marketplaceAuth: PublicKey
    paymentMint: PublicKey
}

type RegisterBuyTokenParams = {
    rewardsActive: boolean
    transferable: boolean
    amount: number
}

export async function createRegisterBuyCounterTransaction(
    connection: Connection, 
    accounts: RegisterBuyTokenAccounts, 
    params: RegisterBuyTokenParams
): Promise<VersionedTransaction> {
    const [productMint] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("product_mint", "utf-8"), 
          accounts.product.toBuffer()
        ],
        BRICK_PROGRAM_ID_PK
    );
    const [sellerReward] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("reward", "utf-8"), 
          accounts.seller.toBuffer(),
          accounts.marketplace.toBuffer()
        ],
        BRICK_PROGRAM_ID_PK
    );
    const [sellerRewardVault] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("reward_vault", "utf-8"), 
          accounts.seller.toBuffer(),
          accounts.marketplace.toBuffer(),
          accounts.paymentMint.toBuffer(),
        ],
        BRICK_PROGRAM_ID_PK
    );
    const [buyerReward] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("reward", "utf-8"), 
          accounts.signer.toBuffer(),
          accounts.marketplace.toBuffer()
        ],
        BRICK_PROGRAM_ID_PK
    );
    const [buyerRewardVault] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("reward_vault", "utf-8"), 
          accounts.seller.toBuffer(),
          accounts.marketplace.toBuffer(),
          accounts.paymentMint.toBuffer(),
        ],
        BRICK_PROGRAM_ID_PK
    );
    const [bountyVault] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("bounty_vault", "utf-8"),
          accounts.marketplace.toBuffer(),
          accounts.paymentMint.toBuffer()
        ],
        BRICK_PROGRAM_ID_PK
    );
    const ixAccounts: RegisterBuyTokenInstructionAccounts = {
        ...accounts,
        systemProgram: SystemProgram.programId,
        tokenProgramV0: TOKEN_PROGRAM_ID,
        tokenProgram2022: TOKEN_2022_PROGRAM_ID,
        productMint,
        buyerTokenVault: params.transferable ? getAssociatedTokenAddressSync(productMint, accounts.signer, false, TOKEN_PROGRAM_ID) : getAssociatedTokenAddressSync(productMint, accounts.signer, false, TOKEN_2022_PROGRAM_ID),
        buyerTransferVault: accounts.paymentMint !== NATIVE_MINT ? getAssociatedTokenAddressSync(accounts.paymentMint, accounts.signer, false, TOKEN_PROGRAM_ID) : null,
        sellerTransferVault: accounts.paymentMint !== NATIVE_MINT ? getAssociatedTokenAddressSync(accounts.paymentMint, accounts.seller, false, TOKEN_PROGRAM_ID) : null,
        marketplaceTransferVault: accounts.paymentMint !== NATIVE_MINT ? getAssociatedTokenAddressSync(accounts.paymentMint, accounts.marketplaceAuth, false, TOKEN_PROGRAM_ID) : null,
        bountyVault: params.rewardsActive ? bountyVault : null,
        sellerReward: params.rewardsActive ? sellerReward : null,
        sellerRewardVault: params.rewardsActive ? sellerRewardVault : null,
        buyerReward: params.rewardsActive ? buyerReward : null,
        buyerRewardVault: params.rewardsActive ? buyerRewardVault : null,
    };
    const ix = createRegisterBuyTokenInstruction(ixAccounts, {amount: params.amount});
    let blockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
    const messageV0 = new TransactionMessage({
        payerKey: accounts.signer,
        recentBlockhash: blockhash,
        instructions: [ix],
    }).compileToV0Message();

    return new VersionedTransaction(messageV0);
}