import { BRICK_PROGRAM_ID_PK } from "../constants";
import { RegisterBuyCounterInstructionAccounts, createRegisterBuyCounterInstruction } from "../utils/solita"
import { Connection, PublicKey, SYSVAR_RENT_PUBKEY, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { NATIVE_MINT, TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";

type RegisterBuyCounterAccounts = {
    signer: PublicKey
    marketplace: PublicKey
    product: PublicKey
    seller: PublicKey
    marketplaceAuth: PublicKey
    paymentMint: PublicKey
}

type RegisterBuyCounterParams = {
    rewardsActive: boolean
    amount: number
}

export async function createRegisterBuyCounterTransaction(
    connection: Connection, 
    accounts: RegisterBuyCounterAccounts, 
    params: RegisterBuyCounterParams
): Promise<VersionedTransaction> {
    const [payment] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("payment", "utf-8"), 
            accounts.signer.toBuffer(), 
            accounts.product.toBuffer(),
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
    const ixAccounts: RegisterBuyCounterInstructionAccounts = {
        ...accounts,
        systemProgram: SystemProgram.programId,
        tokenProgramV0: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        payment,
        buyerTransferVault: accounts.paymentMint !== NATIVE_MINT ? getAssociatedTokenAddressSync(accounts.paymentMint, accounts.signer, false, TOKEN_PROGRAM_ID) : null,
        sellerTransferVault: accounts.paymentMint !== NATIVE_MINT ? getAssociatedTokenAddressSync(accounts.paymentMint, accounts.seller, false, TOKEN_PROGRAM_ID) : null,
        marketplaceTransferVault: accounts.paymentMint !== NATIVE_MINT ? getAssociatedTokenAddressSync(accounts.paymentMint, accounts.marketplaceAuth, false, TOKEN_PROGRAM_ID) : null,
        bountyVault: params.rewardsActive ? bountyVault : null,
        sellerReward: params.rewardsActive ? sellerReward : null,
        sellerRewardVault: params.rewardsActive ? sellerRewardVault : null,
        buyerReward: params.rewardsActive ? buyerReward : null,
        buyerRewardVault: params.rewardsActive ? buyerRewardVault : null,
    };
    const ix = createRegisterBuyCounterInstruction(ixAccounts, {amount: params.amount});
    let blockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
    const messageV0 = new TransactionMessage({
        payerKey: accounts.signer,
        recentBlockhash: blockhash,
        instructions: [ix],
    }).compileToV0Message();

    return new VersionedTransaction(messageV0);
}