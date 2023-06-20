import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { assert } from "chai";
import {
  getMint,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
  Account,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { createFundedAssociatedTokenAccount, createFundedWallet, createMint, delay, getSplitId } from "./utils";
import { ConfirmOptions, SYSVAR_RENT_PUBKEY, SystemProgram } from "@solana/web3.js";
import { Fishnet } from "../../target/types/fishnet";
import BN from "bn.js";
import { v4 as uuid } from "uuid";

describe("fishnet", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Fishnet as Program<Fishnet>;
  const confirmOptions: ConfirmOptions = { commitment: "confirmed" };

  let governanceAuthorityKeypair: anchor.web3.Keypair;
  let governanceBalance: number;
  let productAuthorityKeypair: anchor.web3.Keypair;
  let productAuthorityBalance: number;
  let buyerKeypair: anchor.web3.Keypair;
  let buyerBalance: number;
  let exploiterKeypair: anchor.web3.Keypair;
  let exploiterBalance: number;

  let governancePubkey: anchor.web3.PublicKey;
  let governanceMint: anchor.web3.PublicKey;
  let governanceName: Buffer;
  let fee: number;
  let feeReduction: number;
  let sellerPromo: number;
  let buyerPromo: number;

  let productMintPubkey: anchor.web3.PublicKey;
  let productPubkey: anchor.web3.PublicKey;
  let paymentMintPubkey: anchor.web3.PublicKey;
  let mintBump: number;
  let productPrice: BN;
  let firstId: Buffer;
  let secondId: Buffer;

  let governanceTokenVault: anchor.web3.PublicKey;
  let buyerTokenVault:anchor.web3.PublicKey;
  let governanceTransferVault: anchor.web3.PublicKey;
  let productAuthorityTransferVault: anchor.web3.PublicKey
  let buyerTransferVault: anchor.web3.PublicKey;

  it("Should create the fishnet governance account and check potential exploits", async () => {
    governanceBalance = 1000;
    governanceAuthorityKeypair = await createFundedWallet(provider, governanceBalance);
    governanceName = Buffer.from("Fishnet",  "utf-8");
    governanceMint = await createMint(provider);
    [governancePubkey] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("governance", "utf-8"), governanceName],
      program.programId
    );
    [governanceTokenVault] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("governance_token_vault", "utf-8"), governancePubkey.toBuffer()],
      program.programId
    );

    [fee, feeReduction, sellerPromo, buyerPromo] = [0, 0, 0, 0];
    const createGovernanceParams = {
      governanceName: [...governanceName],
      fee,
      feeReduction,
      sellerPromo,
      buyerPromo
    };

    await program.methods
      .createGovernance(createGovernanceParams)
      .accounts({
        tokenProgramV0: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
        governanceAuthority: governanceAuthorityKeypair.publicKey,
        governance: governancePubkey,
        governanceMint: governanceMint,
        governanceTokenVault: governanceTokenVault,
      })
      .signers(
        governanceAuthorityKeypair instanceof (anchor.Wallet as any)
          ? []
          : [governanceAuthorityKeypair]
      )
      .rpc(confirmOptions)
      .catch(console.error);

    const governanceAccount = await program.account.governance.fetch(governancePubkey);
    assert.isDefined(governanceAccount);
    assert.equal(governanceAccount.governanceName.toString(), [...governanceName].toString());
    assert.equal(governanceAccount.governanceAuthority.toString(), governanceAuthorityKeypair.publicKey.toString());
    assert.equal(governanceAccount.governanceMint.toString(), governanceMint.toString());
    assert.equal(governanceAccount.governanceTokenVault.toString(), governanceTokenVault.toString());
    assert.equal(governanceAccount.fee, fee);
    assert.equal(governanceAccount.feeReduction, feeReduction);
    assert.equal(governanceAccount.sellerPromo, sellerPromo);
    assert.equal(governanceAccount.buyerPromo, buyerPromo);

    // try to create the already created governance account
    try {
      await program.methods
        .createGovernance(createGovernanceParams)
        .accounts({
          tokenProgramV0: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
          governanceAuthority: governanceAuthorityKeypair.publicKey,
          governance: governancePubkey,
          governanceMint: governanceMint,
          governanceTokenVault: governanceTokenVault,
        })
        .signers(
          governanceAuthorityKeypair instanceof (anchor.Wallet as any)
            ? []
            : [governanceAuthorityKeypair]
        )
        .rpc(confirmOptions);
    } catch (e) {
      const logsWithError = e.logs;
      const isAlreadyInUse = logsWithError.some(log => log.includes("already in use"));
      assert.isTrue(isAlreadyInUse);   
    }

    // try to create a governance account with a different name (only possible to create "Fishnet" governance account)
    const errorGovernanceName = Buffer.alloc(7);
    Buffer.from("Brick", "utf-8").copy(errorGovernanceName);
    const [errorGovernancePubkey] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("governance", "utf-8"), errorGovernanceName],
      program.programId
    );
    const errorCreateGovernanceParams = {
      governanceName: [...errorGovernanceName],
      fee,
      feeReduction,
      sellerPromo,
      buyerPromo
    };
    const [errorGovernanceTokenVault] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("governance_token_vault", "utf-8"), errorGovernancePubkey.toBuffer()],
      program.programId
    );
    
    exploiterBalance = 1000;
    exploiterKeypair = await createFundedWallet(provider, exploiterBalance);
    try {
      await program.methods
        .createGovernance(errorCreateGovernanceParams)
        .accounts({
          tokenProgramV0: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
          governanceAuthority: exploiterKeypair.publicKey,
          governance: errorGovernancePubkey,
          governanceMint: governanceMint,
          governanceTokenVault: errorGovernanceTokenVault,
        })
        .signers(
          exploiterKeypair instanceof anchor.Wallet ? [] : [exploiterKeypair]
        )
        .rpc(confirmOptions);
    } catch (e) {
      if (e as anchor.AnchorError)
        assert.equal(e.error.errorCode.code, "IncorrectGovernanceName");
    }
  });    

  it("Should edit governance data and check possible exploits", async () => {
    const [newFee, newFeeReduction, newSellerPromo, newBuyerPromo] = [100, 100, 100, 100];
    const newEditPointParams = {
      fee: newFee,
      feeReduction: newFeeReduction,
      sellerPromo: newSellerPromo,
      buyerPromo: newBuyerPromo,
    };

    await program.methods
      .editPoints(newEditPointParams)
      .accounts({
        governanceAuthority: governanceAuthorityKeypair.publicKey,
        governance: governancePubkey,
      })
      .signers(
        governanceAuthorityKeypair instanceof (anchor.Wallet as any)
          ? []
          : [governanceAuthorityKeypair]
      )
      .rpc(confirmOptions)
      .catch(console.error);

    const changedGovernanceAccount = await program.account.governance.fetch(governancePubkey);
    assert.isDefined(changedGovernanceAccount);
    assert.equal(changedGovernanceAccount.fee, newFee);
    assert.equal(changedGovernanceAccount.feeReduction, newFeeReduction);
    assert.equal(changedGovernanceAccount.sellerPromo, newSellerPromo);
    assert.equal(changedGovernanceAccount.buyerPromo, newBuyerPromo);

    // to be able to re-use this account and its data, the account data will be the same that was before this unit test
    const originalEditPointParams = {
      fee,
      feeReduction,
      sellerPromo,
      buyerPromo
    };

    await program.methods
      .editPoints(originalEditPointParams)
      .accounts({
        governanceAuthority: governanceAuthorityKeypair.publicKey,
        governance: governancePubkey,
      })
      .signers(
        governanceAuthorityKeypair instanceof (anchor.Wallet as any)
          ? []
          : [governanceAuthorityKeypair]
      )
      .rpc(confirmOptions)
      .catch(console.error);

    // another wallet tries to change product data
    try {
      await program.methods
      .editPoints(originalEditPointParams)
      .accounts({
        governanceAuthority: exploiterKeypair.publicKey,
        governance: governancePubkey,
      })
        .signers(
          exploiterKeypair instanceof (anchor.Wallet as any)
            ? []
            : [exploiterKeypair]
        )
        .rpc(confirmOptions);
    } catch (e) {
      if (e as anchor.AnchorError)
        assert.equal(e.error.errorCode.code, "IncorrectAuthority");
    }

    const governanceAccount = await program.account.governance.fetch(governancePubkey);
    assert.isDefined(governanceAccount);
    assert.equal(governanceAccount.fee, fee);
    assert.equal(governanceAccount.feeReduction, feeReduction);
    assert.equal(governanceAccount.sellerPromo, sellerPromo);
    assert.equal(governanceAccount.buyerPromo, buyerPromo);
  });

  it("Should create a product", async () => {
    [firstId, secondId] = getSplitId(uuid());
    productAuthorityBalance = 1000;
    productAuthorityKeypair = await createFundedWallet(provider, productAuthorityBalance);
    [productMintPubkey, mintBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("product_mint", "utf-8"), firstId, secondId],
      program.programId
    );
    paymentMintPubkey = await createMint(provider);
    [productPubkey] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("product", "utf-8"), productMintPubkey.toBuffer()],
      program.programId
    );
    productPrice = new BN(200);

    const createProductParams = {
      firstId: [...firstId],
      secondId: [...secondId],
      productPrice,
      mintBump
    };

    await program.methods
      .createProduct(createProductParams)
      .accounts({
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        productAuthority: productAuthorityKeypair.publicKey,
        governance: governancePubkey,
        product: productPubkey,
        productMint: productMintPubkey,
        paymentMint: paymentMintPubkey
      })
      .signers(
        productAuthorityKeypair instanceof (anchor.Wallet as any)
          ? []
          : [productAuthorityKeypair]
      )
      .rpc(confirmOptions)
      .catch(console.error);

    const productAccount = await program.account.product.fetch(productPubkey);
    assert.isDefined(productAccount);
    assert.equal(productAccount.firstId.toString(), [...firstId].toString());
    assert.equal(productAccount.secondId.toString(), [...secondId].toString());
    assert.equal(productAccount.governance.toString(), governancePubkey.toString());
    assert.equal(productAccount.productMint.toString(), productMintPubkey.toString());
    assert.equal(productAccount.productAuthority.toString(), productAuthorityKeypair.publicKey.toString());
    assert.equal(productAccount.sellerConfig.paymentMint.toString(), paymentMintPubkey.toString());
    assert.equal(Number(productAccount.sellerConfig.productPrice), Number(productPrice));
  });

  it("Should create another product and delete it", async () => {
    const [firstId, secondId] = getSplitId(uuid());
    const productAuthorityKeypair = await createFundedWallet(provider, 1000);
    const [productMintPubkey, mintBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("product_mint", "utf-8"), firstId, secondId],
      program.programId
    );
    const [productPubkey] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("product", "utf-8"), productMintPubkey.toBuffer()],
      program.programId
    );
    const paymentMintPubkey = await createMint(provider);
    const productPrice = new BN(200000);

    const createProductParams = {
      firstId: [...firstId],
      secondId: [...secondId],
      productPrice,
      mintBump
    };

    await program.methods
      .createProduct(createProductParams)
      .accounts({
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        productAuthority: productAuthorityKeypair.publicKey,
        governance: governancePubkey,
        product: productPubkey,
        productMint: productMintPubkey,
        paymentMint: paymentMintPubkey
      })
      .signers(
        productAuthorityKeypair instanceof (anchor.Wallet as any)
          ? []
          : [productAuthorityKeypair]
      )
      .rpc(confirmOptions)
      .catch(console.error);

    await program.methods
      .deleteProduct()
      .accounts({
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        productAuthority: productAuthorityKeypair.publicKey,
        productMint: productMintPubkey,
        product: productPubkey,
      })
      .signers(
        productAuthorityKeypair instanceof (anchor.Wallet as any)
          ? []
          : [productAuthorityKeypair]
      )
      .rpc(confirmOptions)
      .catch(console.error);

    try {
      await program.account.product.fetch(productPubkey);
    } catch (e) {
      assert.isTrue(e.toString().includes("Account does not exist or has no data"))
    }
    try {
      await getMint(provider.connection, productMintPubkey, null, TOKEN_2022_PROGRAM_ID);
    } catch (e) {
      assert.isTrue(e.toString().includes("TokenAccountNotFoundError"))
    }
  });

  it("Should edit product data and check possible exploits", async () => {
    const newPaymentMintPubkey = await createMint(provider);
    const newPrice = new BN(88);

    await program.methods
      .editPaymentMint()
      .accounts({
        productAuthority: productAuthorityKeypair.publicKey,
        product: productPubkey,
        paymentMint: newPaymentMintPubkey
      })
      .signers(
        productAuthorityKeypair instanceof (anchor.Wallet as any)
          ? []
          : [productAuthorityKeypair]
      )
      .rpc()
      .catch(console.error);

    await program.methods
      .editPrice(newPrice)
      .accounts({
        productAuthority: productAuthorityKeypair.publicKey,
        product: productPubkey,
      })
      .signers(
        productAuthorityKeypair instanceof (anchor.Wallet as any)
          ? []
          : [productAuthorityKeypair]
      )
      .rpc()
      .catch(console.error);

    const changedProductAccount = await program.account.product.fetch(productPubkey);
    assert.isDefined(changedProductAccount);
    assert.equal(changedProductAccount.sellerConfig.paymentMint.toString(), newPaymentMintPubkey.toString());
    assert.equal(Number(changedProductAccount.sellerConfig.productPrice), Number(newPrice));

    // to be able to re-use this account and its data, the account data will be the same that was before this unit test
    await program.methods
      .editPaymentMint()
      .accounts({
        productAuthority: productAuthorityKeypair.publicKey,
        product: productPubkey,
        paymentMint: paymentMintPubkey
      })
      .signers(
        productAuthorityKeypair instanceof (anchor.Wallet as any)
          ? []
          : [productAuthorityKeypair]
      )
      .rpc()
      .catch(console.error);

    await program.methods
      .editPrice(productPrice)
      .accounts({
        productAuthority: productAuthorityKeypair.publicKey,
        product: productPubkey,
      })
      .signers(
        productAuthorityKeypair instanceof (anchor.Wallet as any)
          ? []
          : [productAuthorityKeypair]
      )
      .rpc()
      .catch(console.error);

    // another wallet tries to change product data
    try {
      await program.methods
        .editPaymentMint()
        .accounts({
          productAuthority: exploiterKeypair.publicKey,
          product: productPubkey,
          paymentMint: newPaymentMintPubkey
        })
        .signers(
          exploiterKeypair instanceof (anchor.Wallet as any)
            ? []
            : [exploiterKeypair]
        )
        .rpc();
    } catch (e) {
      if (e as anchor.AnchorError)
        assert.equal(e.error.errorCode.code, "IncorrectAuthority");
    }

    try {
      await program.methods
        .editPrice(newPrice)
        .accounts({
          productAuthority: exploiterKeypair.publicKey,
          product: productPubkey,
        })
        .signers(
          exploiterKeypair instanceof (anchor.Wallet as any)
            ? []
            : [exploiterKeypair]
        )
        .rpc();
    } catch (e) {
      if (e as anchor.AnchorError)
        assert.equal(e.error.errorCode.code, "IncorrectAuthority");
    }

    const productAccount = await program.account.product.fetch(productPubkey);
    assert.isDefined(productAccount);
    assert.equal(productAccount.sellerConfig.paymentMint.toString(), paymentMintPubkey.toString());
    assert.equal(Number(productAccount.sellerConfig.productPrice), Number(productPrice));
  });

  it("Should register a buy (no fees)", async () => {
    buyerBalance = 1000;
    buyerKeypair = await createFundedWallet(provider, buyerBalance);
    buyerTokenVault = await getAssociatedTokenAddress(
      productMintPubkey,
      buyerKeypair.publicKey,
      true,
      TOKEN_2022_PROGRAM_ID
    );
    governanceTransferVault =  await createFundedAssociatedTokenAccount(
      provider,
      paymentMintPubkey,
      governanceBalance,
      governanceAuthorityKeypair
    );
    buyerTransferVault = await createFundedAssociatedTokenAccount(
      provider,
      paymentMintPubkey,
      buyerBalance,
      buyerKeypair
    );
    productAuthorityTransferVault = await createFundedAssociatedTokenAccount(
      provider,
      paymentMintPubkey,
      productAuthorityBalance,
      productAuthorityKeypair
    );

    await program.methods
      .registerBuy()
      .accounts({
        systemProgram: SystemProgram.programId,
        tokenProgramV0: TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        governanceAuthority: governanceAuthorityKeypair.publicKey,
        productAuthority: productAuthorityKeypair.publicKey,
        signer: buyerKeypair.publicKey,
        governance: governancePubkey,
        product: productPubkey,
        productMint: productMintPubkey,
        paymentMint: paymentMintPubkey,
        buyerTokenVault: buyerTokenVault,
        buyerTransferVault: buyerTransferVault,
        productAuthorityTransferVault: productAuthorityTransferVault,
        governanceTransferVault: governanceTransferVault,
        governanceTokenVault: governanceTokenVault,
      })
      .signers(
        buyerKeypair instanceof (anchor.Wallet as any)
          ? []
          : [buyerKeypair]
      )
      .rpc(confirmOptions)
      .catch(console.error);
    
    const buyerTransferVaultAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      buyerKeypair as anchor.web3.Signer,
      paymentMintPubkey,
      buyerKeypair.publicKey,
      false,
      "confirmed",
      confirmOptions,
      TOKEN_PROGRAM_ID,
    );
    buyerBalance = buyerBalance - Number(productPrice);
    assert.equal(Number(buyerTransferVaultAccount.amount), buyerBalance);
    
    const productAuthorityTransferVaultAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      productAuthorityKeypair as anchor.web3.Signer,
      paymentMintPubkey,
      productAuthorityKeypair.publicKey,
      false,
      "confirmed",
      confirmOptions,
      TOKEN_PROGRAM_ID,
    );
    productAuthorityBalance = productAuthorityBalance + Number(productPrice);
    assert.equal(Number(productAuthorityTransferVaultAccount.amount), productAuthorityBalance);
  });

  it("Should register a buy (with fees)", async () => {
    [fee, feeReduction, sellerPromo, buyerPromo] = [100, 0, 0, 0];
    
    await program.methods
      .editPoints({
        fee,
        feeReduction,
        sellerPromo,
        buyerPromo,
      })
      .accounts({
        governanceAuthority: governanceAuthorityKeypair.publicKey,
        governance: governancePubkey,
      })
      .signers(
        governanceAuthorityKeypair instanceof (anchor.Wallet as any)
          ? []
          : [governanceAuthorityKeypair]
      )
      .rpc(confirmOptions)
      .catch(console.error);

    await program.methods
      .registerBuy()
      .accounts({
        systemProgram: SystemProgram.programId,
        tokenProgramV0: TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        governanceAuthority: governanceAuthorityKeypair.publicKey,
        productAuthority: productAuthorityKeypair.publicKey,
        signer: buyerKeypair.publicKey,
        governance: governancePubkey,
        product: productPubkey,
        productMint: productMintPubkey,
        paymentMint: paymentMintPubkey,
        buyerTokenVault: buyerTokenVault,
        buyerTransferVault: buyerTransferVault,
        productAuthorityTransferVault: productAuthorityTransferVault,
        governanceTransferVault: governanceTransferVault,
        governanceTokenVault: governanceTokenVault,
      })
      .signers(
        buyerKeypair instanceof (anchor.Wallet as any)
          ? []
          : [buyerKeypair]
      )
      .rpc(confirmOptions)
      .catch(console.error);
    
    const buyerTransferVaultAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      buyerKeypair as anchor.web3.Signer,
      paymentMintPubkey,
      buyerKeypair.publicKey,
      false,
      "confirmed",
      confirmOptions,
      TOKEN_PROGRAM_ID,
    );
    buyerBalance = buyerBalance - Number(productPrice);
    assert.equal(Number(buyerTransferVaultAccount.amount), buyerBalance);
    
    const productAuthorityTransferVaultAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      productAuthorityKeypair as anchor.web3.Signer,
      paymentMintPubkey,
      productAuthorityKeypair.publicKey,
      false,
      "confirmed",
      confirmOptions,
      TOKEN_PROGRAM_ID,
    );
    const governanceFee = (Number(productPrice) * fee) / 10000;
    productAuthorityBalance = productAuthorityBalance + Number(productPrice) - governanceFee;
    assert.equal(Number(productAuthorityTransferVaultAccount.amount), productAuthorityBalance);

    const governanceAuthorityTransferVaultAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      governanceAuthorityKeypair as anchor.web3.Signer,
      paymentMintPubkey,
      governanceAuthorityKeypair.publicKey,
      false,
      "confirmed",
      confirmOptions,
      TOKEN_PROGRAM_ID,
    );
    governanceBalance = governanceBalance + governanceFee;
    assert.equal(Number(governanceAuthorityTransferVaultAccount.amount), governanceBalance);
  });

  it("Should register a buy (with fees and governance mint as a payment, ie: fee reduction)", async () => {
    [fee, feeReduction, sellerPromo, buyerPromo] = [100, 0, 0, 0];
    
    await program.methods
      .editPoints({
        fee,
        feeReduction,
        sellerPromo,
        buyerPromo,
      })
      .accounts({
        governanceAuthority: governanceAuthorityKeypair.publicKey,
        governance: governancePubkey,
      })
      .signers(
        governanceAuthorityKeypair instanceof (anchor.Wallet as any)
          ? []
          : [governanceAuthorityKeypair]
      )
      .rpc(confirmOptions)
      .catch(console.error);

    await program.methods
      .registerBuy()
      .accounts({
        systemProgram: SystemProgram.programId,
        tokenProgramV0: TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        governanceAuthority: governanceAuthorityKeypair.publicKey,
        productAuthority: productAuthorityKeypair.publicKey,
        signer: buyerKeypair.publicKey,
        governance: governancePubkey,
        product: productPubkey,
        productMint: productMintPubkey,
        paymentMint: paymentMintPubkey,
        buyerTokenVault: buyerTokenVault,
        buyerTransferVault: buyerTransferVault,
        productAuthorityTransferVault: productAuthorityTransferVault,
        governanceTransferVault: governanceTransferVault,
        governanceTokenVault: governanceTokenVault,
      })
      .signers(
        buyerKeypair instanceof (anchor.Wallet as any)
          ? []
          : [buyerKeypair]
      )
      .rpc(confirmOptions)
      .catch(console.error);
    
    const buyerTransferVaultAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      buyerKeypair as anchor.web3.Signer,
      paymentMintPubkey,
      buyerKeypair.publicKey,
      false,
      "confirmed",
      confirmOptions,
      TOKEN_PROGRAM_ID,
    );
    buyerBalance = buyerBalance - Number(productPrice);
    assert.equal(Number(buyerTransferVaultAccount.amount), buyerBalance);
    
    const productAuthorityTransferVaultAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      productAuthorityKeypair as anchor.web3.Signer,
      paymentMintPubkey,
      productAuthorityKeypair.publicKey,
      false,
      "confirmed",
      confirmOptions,
      TOKEN_PROGRAM_ID,
    );
    const governanceFee = (Number(productPrice) * fee) / 10000;
    productAuthorityBalance = productAuthorityBalance + Number(productPrice) - governanceFee;
    assert.equal(Number(productAuthorityTransferVaultAccount.amount), productAuthorityBalance);

    const governanceAuthorityTransferVaultAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      governanceAuthorityKeypair as anchor.web3.Signer,
      paymentMintPubkey,
      governanceAuthorityKeypair.publicKey,
      false,
      "confirmed",
      confirmOptions,
      TOKEN_PROGRAM_ID,
    );
    governanceBalance = governanceBalance + governanceFee;
    assert.equal(Number(governanceAuthorityTransferVaultAccount.amount), governanceBalance);
  });
})