import { InitMarketplaceInstructionAccounts, PaymentFeePayer, createInitMarketplaceInstruction, InitMarketplaceParams as InitMarketplaceParamsBump } from "../utils";
import { Connection, PublicKey, SYSVAR_RENT_PUBKEY, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { BRICK_PROGRAM_ID_PK } from "../constants";

type InitMarketplaceAccounts = {
    signer: PublicKey
    rewardMint: PublicKey
    discountMint: PublicKey
}

type InitMarketplaceParams = {
    fee: number
    feeReduction: number
    sellerReward: number
    buyerReward: number
    useCnfts: boolean
    deliverToken: boolean
    transferable: boolean
    chainCounter: boolean
    permissionless: boolean
    rewardsEnabled: boolean
    feePayer: PaymentFeePayer
}

export async function createInitMarketplaceTransaction(
    connection: Connection, 
    accounts: InitMarketplaceAccounts, 
    params: InitMarketplaceParams
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
    const [accessMint, accessMintBump] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("access_mint", "utf-8"),
          marketplace.toBuffer(),
        ],
        BRICK_PROGRAM_ID_PK
    );

    const ixAccounts: InitMarketplaceInstructionAccounts = {
        ...accounts,
        systemProgram: SystemProgram.programId,
        tokenProgram2022: TOKEN_2022_PROGRAM_ID,
        tokenProgramV0: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        marketplace,
        accessMint,
        bountyVault,
    };
    const paramsBump: InitMarketplaceParamsBump = {
        ...params,
        accessMintBump,
    };
    const ix = createInitMarketplaceInstruction(ixAccounts, { params: paramsBump });
    let blockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
    const messageV0 = new TransactionMessage({
        payerKey: accounts.signer,
        recentBlockhash: blockhash,
        instructions: [ix],
    }).compileToV0Message();

    return new VersionedTransaction(messageV0);
}