import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { assert } from "chai";
import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
  getAccount,
  createTransferInstruction,
} from "@solana/spl-token";
import { createFundedAssociatedTokenAccount, createFundedWallet, createMint, getSplitId } from "./utils";
import { ConfirmOptions, SYSVAR_RENT_PUBKEY, SystemProgram, Transaction } from "@solana/web3.js";
import { Brick } from "../../target/types/brick";
import BN from "bn.js";
import { v4 as uuid } from "uuid";

describe("brick", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Brick as Program<Brick>;
  const confirmOptions: ConfirmOptions = { commitment: "confirmed" };
  const messagesProgram: anchor.web3.PublicKey = new anchor.web3.PublicKey('ALepH1n9jxScbz45aZhBYVa35zxBNbKSvL6rWQpb4snc');

  let governanceAuthorityKeypair: anchor.web3.Keypair;
  let governanceBalance: number;
  let productAuthorityKeypair: anchor.web3.Keypair;
  let productAuthorityBalance: number;
  let buyerKeypair: anchor.web3.Keypair;
  let buyerBalance: number;
  let exploiterKeypair: anchor.web3.Keypair;
  let exploiterBalance: number;

  let governancePubkey: anchor.web3.PublicKey;
  let governanceBump: number;
  let governanceMint: anchor.web3.PublicKey;
  let fee: number;
  let feeReduction: number;
  let sellerPromo: number;
  let buyerPromo: number;

  let productPubkey: anchor.web3.PublicKey;
  let paymentMintPubkey: anchor.web3.PublicKey;
  let productPrice: BN;
  let firstId: Buffer;
  let secondId: Buffer;

  let governanceBonusVault: anchor.web3.PublicKey;
  let governanceBonusVaultBalance: number;

  let governanceGovernanceVault: anchor.web3.PublicKey;
  let governanceGovernanceBalance: number;
  let governanceBuyerTransferVault: anchor.web3.PublicKey;
  let governanceBuyerBalance: number;
  let governanceProductAuthorityTransferVault: anchor.web3.PublicKey;
  let governanceProductAuthorityBalance: number;

  let governanceTransferVault: anchor.web3.PublicKey;
  let productAuthorityTransferVault: anchor.web3.PublicKey
  let buyerTransferVault: anchor.web3.PublicKey;

  let productAuthorityBonus: anchor.web3.PublicKey;
  let productAuthorityBonusVault: anchor.web3.PublicKey;
  let buyerBonus: anchor.web3.PublicKey;
  let buyerBonusVault: anchor.web3.PublicKey;

  it("Should create the fishnet governance account and check potential exploits", async () => {
    governanceBalance = 1000;
    governanceAuthorityKeypair = await createFundedWallet(provider, governanceBalance);
    governanceMint = await createMint(provider);
    [governancePubkey, governanceBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("governance", "utf-8")],
      program.programId
    );

    [governanceBonusVault] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("governance_bonus_vault", "utf-8")],
      program.programId
    );

    [fee, feeReduction, sellerPromo, buyerPromo] = [0, 0, 0, 0];
    const createGovernanceParams = {
      fee,
      feeReduction,
      sellerPromo,
      buyerPromo
    };

    await program.methods
      .createGovernance(createGovernanceParams)
      .accounts({
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
        governanceAuthority: governanceAuthorityKeypair.publicKey,
        governance: governancePubkey,
        governanceMint: governanceMint,
        governanceBonusVault: governanceBonusVault,
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
    assert.equal(governanceAccount.governanceAuthority.toString(), governanceAuthorityKeypair.publicKey.toString());
    assert.equal(governanceAccount.governanceMint.toString(), governanceMint.toString());
    assert.equal(governanceAccount.governanceBonusVault.toString(), governanceBonusVault.toString());
    assert.equal(governanceAccount.fee, fee);
    assert.equal(governanceAccount.feeReduction, feeReduction);
    assert.equal(governanceAccount.sellerPromo, sellerPromo);
    assert.equal(governanceAccount.buyerPromo, buyerPromo);
    assert.equal(governanceAccount.bump, governanceBump);

    // try to create the already created governance account
    try {
      await program.methods
        .createGovernance(createGovernanceParams)
        .accounts({
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
          governanceAuthority: governanceAuthorityKeypair.publicKey,
          governance: governancePubkey,
          governanceMint: governanceMint,
          governanceBonusVault: governanceBonusVault,
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
    exploiterBalance = 1000;
    exploiterKeypair = await createFundedWallet(provider, exploiterBalance);
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
        .rpc();
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
    productAuthorityBalance = 100000000;
    productAuthorityKeypair = await createFundedWallet(provider, productAuthorityBalance);

    paymentMintPubkey = await createMint(provider);
    [productPubkey] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("product", "utf-8"), firstId, secondId],
      program.programId
    );
    productPrice = new BN(100000);

    const createProductParams = {
      firstId: [...firstId],
      secondId: [...secondId],
      productPrice,
    };

    await program.methods
      .createProduct(createProductParams)
      .accounts({
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
        productAuthority: productAuthorityKeypair.publicKey,
        governance: governancePubkey,
        product: productPubkey,
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
    assert.equal(productAccount.productAuthority.toString(), productAuthorityKeypair.publicKey.toString());
    assert.equal(productAccount.sellerConfig.paymentMint.toString(), paymentMintPubkey.toString());
    assert.equal(Number(productAccount.sellerConfig.productPrice), Number(productPrice));
  });

  it("Should create another product and delete it", async () => {
    const [firstId, secondId] = getSplitId(uuid());
    const productAuthorityKeypair = await createFundedWallet(provider, 1000);
    const [productPubkey] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("product", "utf-8"), firstId, secondId],
      program.programId
    );
    const paymentMintPubkey = await createMint(provider);
    const productPrice = new BN(200000);

    const createProductParams = {
      firstId: [...firstId],
      secondId: [...secondId],
      productPrice,
    };

    await program.methods
      .createProduct(createProductParams)
      .accounts({
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
        productAuthority: productAuthorityKeypair.publicKey,
        governance: governancePubkey,
        product: productPubkey,
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
        productAuthority: productAuthorityKeypair.publicKey,
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
    buyerBalance = 100000000;
    buyerKeypair = await createFundedWallet(provider, buyerBalance);
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
        tokenProgram: TOKEN_PROGRAM_ID,
        messagesProgram,
        rent: SYSVAR_RENT_PUBKEY,
        governanceAuthority: governanceAuthorityKeypair.publicKey,
        productAuthority: productAuthorityKeypair.publicKey,
        signer: buyerKeypair.publicKey,
        governance: governancePubkey,
        product: productPubkey,
        paymentMint: paymentMintPubkey,
        buyerTransferVault: buyerTransferVault,
        productAuthorityTransferVault: productAuthorityTransferVault,
        governanceTransferVault: governanceTransferVault,
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
        tokenProgram: TOKEN_PROGRAM_ID,
        messagesProgram,
        rent: SYSVAR_RENT_PUBKEY,
        governanceAuthority: governanceAuthorityKeypair.publicKey,
        productAuthority: productAuthorityKeypair.publicKey,
        signer: buyerKeypair.publicKey,
        governance: governancePubkey,
        product: productPubkey,
        paymentMint: paymentMintPubkey,
        buyerTransferVault: buyerTransferVault,
        productAuthorityTransferVault: productAuthorityTransferVault,
        governanceTransferVault: governanceTransferVault,
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
    const governanceFee = Math.floor((Number(productPrice) * (fee - feeReduction)) / 10000);
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
    [fee, feeReduction, sellerPromo, buyerPromo] = [100, 20, 0, 0];

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
      .editPaymentMint()
      .accounts({
        productAuthority: productAuthorityKeypair.publicKey,
        product: productPubkey,
        paymentMint: governanceMint
      })
      .signers(
        productAuthorityKeypair instanceof (anchor.Wallet as any)
          ? []
          : [productAuthorityKeypair]
      )
      .rpc(confirmOptions)
      .catch(console.error);

    governanceGovernanceBalance = 100000000;
    governanceGovernanceVault = await createFundedAssociatedTokenAccount(
      provider,
      governanceMint,
      governanceGovernanceBalance,
      governanceAuthorityKeypair
    );

    // fill the governance token account controlled by the program to holds the governance bonus tokens
    governanceBonusVaultBalance = 50000;
    await provider.sendAndConfirm(
      new Transaction()
        .add(
          createTransferInstruction(
            governanceGovernanceVault,
            governanceBonusVault,
            governanceAuthorityKeypair.publicKey,
            governanceBonusVaultBalance
          )
        ),
      [governanceAuthorityKeypair as anchor.web3.Signer]
    );
    governanceGovernanceBalance = governanceGovernanceBalance - governanceBonusVaultBalance;

    governanceBuyerBalance = 100000000;
    governanceBuyerTransferVault = await createFundedAssociatedTokenAccount(
      provider,
      governanceMint,
      governanceBuyerBalance,
      buyerKeypair
    );
    governanceProductAuthorityBalance = 100000000;
    governanceProductAuthorityTransferVault = await createFundedAssociatedTokenAccount(
      provider,
      governanceMint,
      governanceProductAuthorityBalance,
      productAuthorityKeypair
    );

    const governanceVaultFunds = await getAccount(provider.connection, governanceBonusVault);
    assert.equal(Number(governanceVaultFunds.amount), governanceBonusVaultBalance);
    
    await program.methods
      .registerBuy()
      .accounts({
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        messagesProgram,
        governanceAuthority: governanceAuthorityKeypair.publicKey,
        productAuthority: productAuthorityKeypair.publicKey,
        signer: buyerKeypair.publicKey,
        governance: governancePubkey,
        product: productPubkey,
        paymentMint: governanceMint,
        governanceMint: governanceMint,
        buyerTransferVault: governanceBuyerTransferVault,
        productAuthorityTransferVault: governanceProductAuthorityTransferVault,
        governanceTransferVault: governanceGovernanceVault,
      })
      .signers(
        buyerKeypair instanceof (anchor.Wallet as any)
          ? []
          : [buyerKeypair]
      )
      .rpc(confirmOptions)
      .catch(console.error);
    
    const governanceGovernanceVaultAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      governanceAuthorityKeypair as anchor.web3.Signer,
      governanceMint,
      governanceAuthorityKeypair.publicKey,
      false,
      "confirmed",
      confirmOptions,
      TOKEN_PROGRAM_ID,
    );
    const governanceFee = Math.floor((Number(productPrice) * (fee - feeReduction)) / 10000);
    governanceGovernanceBalance = governanceGovernanceBalance + governanceFee;
    assert.equal(Number(governanceGovernanceVaultAccount.amount), governanceGovernanceBalance);
    
    const governanceBuyerTransferVaultAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      buyerKeypair as anchor.web3.Signer,
      governanceMint,
      buyerKeypair.publicKey,
      false,
      "confirmed",
      confirmOptions,
      TOKEN_PROGRAM_ID,
    );
    governanceBuyerBalance = governanceBuyerBalance - Number(productPrice);
    assert.equal(Number(governanceBuyerTransferVaultAccount.amount), governanceBuyerBalance);    

    const governanceProductAuthorityTransferVaultAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      productAuthorityKeypair as anchor.web3.Signer,
      governanceMint,
      productAuthorityKeypair.publicKey,
      false,
      "confirmed",
      confirmOptions,
      TOKEN_PROGRAM_ID,
    );
    governanceProductAuthorityBalance = governanceProductAuthorityBalance + Number(productPrice) - governanceFee;
    assert.equal(Number(governanceProductAuthorityTransferVaultAccount.amount), governanceProductAuthorityBalance);
  });

  it("Should register a buy during promo time, users can withdraw bonus when that promo is finished (not when still active)", async () => {
    [fee, feeReduction, sellerPromo, buyerPromo] = [100, 20, 20, 20];

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

    [productAuthorityBonus] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("bonus", "utf-8"), productAuthorityKeypair.publicKey.toBuffer()],
      program.programId
    );
    [productAuthorityBonusVault] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("bonus_vault", "utf-8"), productAuthorityKeypair.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .initBonus()
      .accounts({
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        signer: productAuthorityKeypair.publicKey,
        governance: governancePubkey,
        bonus: productAuthorityBonus,
        bonusVault: productAuthorityBonusVault,
        governanceMint: governanceMint
      })
      .signers(
        productAuthorityKeypair instanceof (anchor.Wallet as any)
          ? []
          : [productAuthorityKeypair]
      )
      .rpc(confirmOptions)
      .catch(console.error);

    const bonusAccount = await program.account.bonus.fetch(productAuthorityBonus);
    assert.isDefined(bonusAccount);
    assert.equal(bonusAccount.authority.toString(), productAuthorityKeypair.publicKey.toString());

    [buyerBonus] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("bonus", "utf-8"), buyerKeypair.publicKey.toBuffer()],
      program.programId
    );
    [buyerBonusVault] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("bonus_vault", "utf-8"), buyerKeypair.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .initBonus()
      .accounts({
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        signer: buyerKeypair.publicKey,
        governance: governancePubkey,
        bonus: buyerBonus,
        bonusVault: buyerBonusVault,
        governanceMint: governanceMint
      })
      .signers(
        buyerKeypair instanceof (anchor.Wallet as any)
          ? []
          : [buyerKeypair]
      )
      .rpc(confirmOptions)
      .catch(console.error);

    await program.methods
      .registerPromoBuy()
      .accounts({
        systemProgram: SystemProgram.programId,
        messagesProgram,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        governanceAuthority: governanceAuthorityKeypair.publicKey,
        productAuthority: productAuthorityKeypair.publicKey,
        signer: buyerKeypair.publicKey,
        governance: governancePubkey,
        product: productPubkey,
        governanceMint: governanceMint,
        buyerTransferVault: governanceBuyerTransferVault,
        productAuthorityTransferVault: governanceProductAuthorityTransferVault,
        governanceTransferVault: governanceGovernanceVault,
        governanceBonusVault: governanceBonusVault,
        productAuthorityBonus: productAuthorityBonus,
        productAuthorityBonusVault: productAuthorityBonusVault,
        buyerBonus: buyerBonus,
        buyerBonusVault: buyerBonusVault,
      })
      .signers(
        buyerKeypair instanceof (anchor.Wallet as any)
          ? []
          : [buyerKeypair]
      )
      .rpc(confirmOptions)
      .catch(console.error);

    // test if bonus vault can handle multiple buys and the bonus vault is increased correctly after this buy
    await program.methods
      .registerPromoBuy()
      .accounts({
        systemProgram: SystemProgram.programId,
        messagesProgram,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        governanceAuthority: governanceAuthorityKeypair.publicKey,
        productAuthority: productAuthorityKeypair.publicKey,
        signer: buyerKeypair.publicKey,
        governance: governancePubkey,
        product: productPubkey,
        governanceMint: governanceMint,
        buyerTransferVault: governanceBuyerTransferVault,
        productAuthorityTransferVault: governanceProductAuthorityTransferVault,
        governanceTransferVault: governanceGovernanceVault,
        governanceBonusVault: governanceBonusVault,
        productAuthorityBonus: productAuthorityBonus,
        productAuthorityBonusVault: productAuthorityBonusVault,
        buyerBonus: buyerBonus,
        buyerBonusVault: buyerBonusVault,
      })
      .signers(
        buyerKeypair instanceof (anchor.Wallet as any)
          ? []
          : [buyerKeypair]
      )
      .rpc(confirmOptions)
      .catch(console.error);

    const productAuthorityBonusAccount = await program.account.bonus.fetch(productAuthorityBonus);
    assert.isDefined(productAuthorityBonusAccount);
    assert.equal(productAuthorityBonusAccount.authority.toString(), productAuthorityKeypair.publicKey.toString());
    const oldBuyerPromo = 20;
    const expectedBuyerBonus = Math.floor(Number(productPrice) * oldBuyerPromo / 10000) * 2;;
    const productAuthorityBonusFunds = await getAccount(provider.connection, productAuthorityBonusVault);
    assert.equal(Number(productAuthorityBonusFunds.amount), expectedBuyerBonus);

    try {
      await program.methods
        .withdrawBonus()
        .accounts({
          tokenProgram: TOKEN_PROGRAM_ID,
          signer: buyerKeypair.publicKey,
          governance: governancePubkey,
          bonus: buyerBonus,
          governanceMint: governanceMint,
          receiverVault: governanceBuyerTransferVault,
          bonusVault: buyerBonusVault,
        })
        .signers(
          buyerKeypair instanceof (anchor.Wallet as any)
            ? []
            : [buyerKeypair]
        )
        .rpc(confirmOptions);
    } catch (e) {
      if (e as anchor.AnchorError)
        assert.equal(e.error.errorCode.code, "OpenPromotion");
    }

    // promo is finished when sellerPromo and buyerPromo is 0
    [fee, feeReduction, sellerPromo, buyerPromo] = [100, 20, 0, 0];
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

    // cant withdraw the bonus of another wallet 
    try {
      await program.methods
        .withdrawBonus()
        .accounts({
          tokenProgram: TOKEN_PROGRAM_ID,
          signer: productAuthorityKeypair.publicKey,
          governance: governancePubkey,
          bonus: buyerBonus,
          governanceMint: governanceMint,
          governanceBonusVault: governanceBonusVault,
          receiverVault: governanceProductAuthorityTransferVault,
          bonusVault: buyerBonusVault,
        })
        .signers(
          productAuthorityKeypair instanceof (anchor.Wallet as any)
            ? []
            : [productAuthorityKeypair]
        )
        .rpc(confirmOptions);
    } catch (e) {
      if (e as anchor.AnchorError)
        assert.equal(e.error.errorCode.code, "ConstraintSeeds");
    }

    await program.methods
      .withdrawBonus()
      .accounts({
        tokenProgram: TOKEN_PROGRAM_ID,
        signer: buyerKeypair.publicKey,
        governance: governancePubkey,
        bonus: buyerBonus,
        governanceMint: governanceMint,
        governanceBonusVault: governanceBonusVault,
        receiverVault: governanceBuyerTransferVault,
        bonusVault: buyerBonusVault,
      })
      .signers(
        buyerKeypair instanceof (anchor.Wallet as any)
          ? []
          : [buyerKeypair]
      )
      .rpc(confirmOptions)
      .catch(console.error);

    try {
      await program.account.bonus.fetch(buyerBonus);
    } catch (e) {
      assert.isTrue(e.toString().includes("Account does not exist or has no data"))
    }

    await program.methods
      .withdrawBonus()
      .accounts({
        tokenProgram: TOKEN_PROGRAM_ID,
        signer: productAuthorityKeypair.publicKey,
        governance: governancePubkey,
        bonus: productAuthorityBonus,
        governanceMint: governanceMint,
        governanceBonusVault: governanceBonusVault,
        receiverVault: governanceProductAuthorityTransferVault,
        bonusVault: productAuthorityBonusVault,
      })
      .signers(
        productAuthorityKeypair instanceof (anchor.Wallet as any)
          ? []
          : [productAuthorityKeypair]
      )
      .rpc(confirmOptions)
      .catch(console.error);

    try {
      await program.account.bonus.fetch(buyerBonus);
    } catch (e) {
      assert.isTrue(e.toString().includes("Account does not exist or has no data"))
    }

    const governanceGovernanceVaultAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      governanceAuthorityKeypair as anchor.web3.Signer,
      governanceMint,
      governanceAuthorityKeypair.publicKey,
      false,
      "confirmed",
      confirmOptions,
      TOKEN_PROGRAM_ID,
    );
    const governanceBuyerTransferVaultAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      buyerKeypair as anchor.web3.Signer,
      governanceMint,
      buyerKeypair.publicKey,
      false,
      "confirmed",
      confirmOptions,
      TOKEN_PROGRAM_ID,
    );
    const governanceProductAuthorityTransferVaultAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      productAuthorityKeypair as anchor.web3.Signer,
      governanceMint,
      productAuthorityKeypair.publicKey,
      false,
      "confirmed",
      confirmOptions,
      TOKEN_PROGRAM_ID,
    ); 

    const governanceFee = Math.floor((Number(productPrice) * (fee - feeReduction) / 10000)) * 2;
    governanceGovernanceBalance = governanceGovernanceBalance + governanceFee;
    governanceBuyerBalance = governanceBuyerBalance - (Number(productPrice) * 2) + expectedBuyerBonus;
    const oldSellerPromo = 20; // Change to the actual value
    const expectedSellerBonus = Math.floor(Number(productPrice) * oldSellerPromo / 10000) * 2;
    governanceProductAuthorityBalance = governanceProductAuthorityBalance + (Number(productPrice) * 2) - governanceFee + expectedSellerBonus;

    assert.equal(Number(governanceGovernanceVaultAccount.amount), governanceGovernanceBalance);
    assert.equal(Number(governanceBuyerTransferVaultAccount.amount), governanceBuyerBalance);    
    assert.equal(Number(governanceProductAuthorityTransferVaultAccount.amount), governanceProductAuthorityBalance);
  });
})