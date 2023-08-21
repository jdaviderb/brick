import { InitProductInstructionAccounts, createInitProductInstruction, splitId } from "../utils";
import { Connection, PublicKey, SYSVAR_RENT_PUBKEY, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { BRICK_PROGRAM_ID_PK } from "../constants";
import { InitProductInstructionArgs } from "../types";
import BN from "bn.js";
import { normalizePrice } from "../utils/normalizePrice";

type InitProductAccounts = {
    signer: PublicKey
    marketplace: PublicKey
    paymentMint: PublicKey
}

 type InitProductParams = {
    id: string
    productPrice: number
}

export async function createInitProductTransaction(
    connection: Connection, 
    accounts: InitProductAccounts, 
    params: InitProductParams
): Promise<VersionedTransaction> {
    const [firstId, secondId] = splitId(params.id);
    const [accessMint] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("access_mint", "utf-8"),
          accounts.marketplace.toBuffer(),
        ],
        BRICK_PROGRAM_ID_PK
    );
    const [product] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("product", "utf-8"), 
          firstId, 
          secondId,
          accounts.marketplace.toBuffer()
        ],
        BRICK_PROGRAM_ID_PK
    );
    const [productMint, productMintBump] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("product_mint", "utf-8"), 
            product.toBuffer()
        ],
        BRICK_PROGRAM_ID_PK
    );
    const ixAccounts: InitProductInstructionAccounts = {
        ...accounts,
        systemProgram: SystemProgram.programId,
        tokenProgram2022: TOKEN_2022_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        product,
        productMint,
        accessMint,
        accessVault: getAssociatedTokenAddressSync(accessMint, accounts.signer, false, TOKEN_2022_PROGRAM_ID),
    };
    const args: InitProductInstructionArgs = {
        params: {
            firstId: [...firstId],
            secondId: [...secondId],
            productPrice: normalizePrice(params.productPrice, accounts.paymentMint.toString()),
            productMintBump,
        }
    };
    const ix = createInitProductInstruction(ixAccounts, args);
    let blockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
    const messageV0 = new TransactionMessage({
        payerKey: accounts.signer,
        recentBlockhash: blockhash,
        instructions: [ix],
    }).compileToV0Message();
    
    return new VersionedTransaction(messageV0);
}