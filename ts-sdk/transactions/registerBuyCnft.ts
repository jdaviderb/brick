import { BRICK_PROGRAM_ID_PK, BUBBLEGUM_PROGRAM_ID_PK, COMPRESSION_PROGRAM_ID_PK, METADATA_PROGRAM_ID_PK, NOOP_PROGRAM_ID_PK } from "../constants";
import { RegisterBuyCnftInstructionAccounts, RegisterBuyCnftInstructionArgs, createRegisterBuyCnftInstruction } from "../utils/solita"
import { ComputeBudgetProgram, Connection, PublicKey, SYSVAR_RENT_PUBKEY, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { NATIVE_MINT, TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";

type RegisterBuyCnftAccounts = {
    signer: PublicKey
    marketplace: PublicKey
    product: PublicKey
    seller: PublicKey
    marketplaceAuth: PublicKey
    paymentMint: PublicKey
    merkleTree: PublicKey
}

type RegisterBuyCnftParams = {
    rewardsActive: boolean
    amount: number
    name: string
    uri: string
}

export async function createRegisterBuyCnftTransaction(
    connection: Connection, 
    accounts: RegisterBuyCnftAccounts, 
    params: RegisterBuyCnftParams
): Promise<VersionedTransaction> {
    const [productMint] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("product_mint", "utf-8"), 
          accounts.product.toBuffer()
        ],
        BRICK_PROGRAM_ID_PK
    );
    const [masterEdition] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("metadata", "utf-8"),
            METADATA_PROGRAM_ID_PK.toBuffer(),
            productMint.toBuffer(),
            Buffer.from("edition", "utf-8"),
        ],
        METADATA_PROGRAM_ID_PK
    );
    const [metadata] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("metadata", "utf-8"),
            METADATA_PROGRAM_ID_PK.toBuffer(),
            productMint.toBuffer(),
        ],
        METADATA_PROGRAM_ID_PK
    );
    const [treeAuthority] = PublicKey.findProgramAddressSync(
        [accounts.merkleTree.toBuffer()], BUBBLEGUM_PROGRAM_ID_PK
    );
    const [bubblegumSigner] = PublicKey.findProgramAddressSync(
        [Buffer.from("collection_cpi", "utf-8")], BUBBLEGUM_PROGRAM_ID_PK
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
    const ixAccounts: RegisterBuyCnftInstructionAccounts = {
        ...accounts,
        systemProgram: SystemProgram.programId,
        tokenProgramV0: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        logWrapper: NOOP_PROGRAM_ID_PK,
        bubblegumProgram: BUBBLEGUM_PROGRAM_ID_PK,
        compressionProgram: COMPRESSION_PROGRAM_ID_PK,
        tokenMetadataProgram:  METADATA_PROGRAM_ID_PK,
        productMint,
        buyerTransferVault: accounts.paymentMint !== NATIVE_MINT ? getAssociatedTokenAddressSync(accounts.paymentMint, accounts.signer, false, TOKEN_PROGRAM_ID) : null,
        sellerTransferVault: accounts.paymentMint !== NATIVE_MINT ? getAssociatedTokenAddressSync(accounts.paymentMint, accounts.seller, false, TOKEN_PROGRAM_ID) : null,
        marketplaceTransferVault: accounts.paymentMint !== NATIVE_MINT ? getAssociatedTokenAddressSync(accounts.paymentMint, accounts.marketplaceAuth, false, TOKEN_PROGRAM_ID) : null,
        bountyVault: params.rewardsActive ? bountyVault : null,
        sellerReward: params.rewardsActive ? sellerReward : null,
        sellerRewardVault: params.rewardsActive ? sellerRewardVault : null,
        buyerReward: params.rewardsActive ? buyerReward : null,
        buyerRewardVault: params.rewardsActive ? buyerRewardVault : null,
        metadata: metadata,
        masterEdition: masterEdition,
        treeAuthority: treeAuthority,
        bubblegumSigner: bubblegumSigner,
    };
    const args: RegisterBuyCnftInstructionArgs = {
        params: {
            amount: params.amount,
            name: params.name,
            symbol: "BRICK",
            uri: params.uri,
        }
    };
    const increaseLimitIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 350000 });
    const registerBuyIx = createRegisterBuyCnftInstruction(ixAccounts, args);
    let blockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
    const messageV0 = new TransactionMessage({
        payerKey: accounts.signer,
        recentBlockhash: blockhash,
        instructions: [increaseLimitIx, registerBuyIx],
    }).compileToV0Message();

    return new VersionedTransaction(messageV0);
}