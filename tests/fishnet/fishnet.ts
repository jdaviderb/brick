import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorError } from "@coral-xyz/anchor";
import { assert } from "chai";
import {
  createAssociatedTokenAccountInstruction,
  getAccount,
  getMint,
  createMintToInstruction,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { delay, initNewAccounts } from "./utils";
import { Connection, PublicKey, SYSVAR_RENT_PUBKEY, SystemProgram } from "@solana/web3.js";
import { Fishnet } from "../../target/types/fishnet";
import BN from "bn.js";
import { ASSOCIATED_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";

describe("fishnet", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Fishnet as Program<Fishnet>;

  const noRefundTime = new anchor.BN(0);
  const creatorBalance = 100000000;
  const noFee = 0;

  it("Create an app (including a fee), an token to mint unlimited editions and buy some, checks payment data is correct, withdraw to check fee", async () => {
    const buyerBalance = 500000000;
    const sellerBalance = 200000000;
    const tokenPrice = new BN(50000);
    const exemplars = -1; // makes the token can be sold unlimited times
    const fee = 250; // represents 5% fee for each sale
    const appName = "Fishplace";
    const {
      appPublicKey,
      appCreatorKeypair,
      creatorTransferVault,
      sellerKeypair,
      acceptedMintPublicKey,
      tokenConfig,
      firstId,
      secondId,
      tokenMint,
      buyerKeypair,
      buyerTokenVault,
      buyerTransferVault,
      buyTimestamp,
      paymentPublicKey,
      paymentVaultPublicKey,
      secondBuyTimestamp,
      secondPaymentPublicKey,
      secondPaymentVaultPublicKey,
      sellerTransferVault,
    } = await initNewAccounts(
      provider,
      program,
      appName,
      buyerBalance,
      sellerBalance,
      creatorBalance
    );

    await program.methods
      .createApp(appName, fee)
      .accounts({
        authority: appCreatorKeypair.publicKey,
      })
      .signers(
        appCreatorKeypair instanceof (anchor.Wallet as any)
          ? []
          : [appCreatorKeypair]
      )
      .rpc()
      .catch(console.error);

    const appAccount = await program.account.app.fetch(appPublicKey);
    assert.isDefined(appAccount);
    assert.equal(appAccount.appName, appName);
    assert.equal(
      appAccount.authority.toString(),
      appCreatorKeypair.publicKey.toString()
    );
    assert.equal(appAccount.feeBasisPoints, fee);
    await program.methods
      .createProduct(
        [...firstId],
        [...secondId],
        noRefundTime,
        tokenPrice,
        exemplars,
      )
      .accounts({
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        authority: sellerKeypair.publicKey,
        app: appPublicKey,
        paymentMint: acceptedMintPublicKey,
      })
      .signers(
        sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
      )
      .rpc()
      .catch(console.error);

    const tokenMintAccount = await getMint(provider.connection, tokenMint, null, TOKEN_2022_PROGRAM_ID);
    assert.equal(tokenMintAccount.supply, BigInt(0));

    const preBuyTokenAccount = await program.account.tokenConfig.fetch(
      tokenConfig
    );
    assert.isDefined(preBuyTokenAccount);
    assert.equal(preBuyTokenAccount.appPubkey.toString(), appPublicKey.toString());
    assert.equal(preBuyTokenAccount.firstId.toString(), [...firstId].toString());
    assert.equal(
      preBuyTokenAccount.sellerConfig.paymentMint.toString(),
      acceptedMintPublicKey.toString()
    );
    assert.equal(preBuyTokenAccount.tokenMint.toString(), tokenMint.toString());
    assert.equal(
      preBuyTokenAccount.authority.toString(),
      sellerKeypair.publicKey.toString()
    );
    assert.equal(
      Number(preBuyTokenAccount.sellerConfig.refundTimespan),
      Number(noRefundTime)
    );
    assert.equal(preBuyTokenAccount.sellerConfig.tokenPrice.toString(), tokenPrice.toString());
    assert.equal(preBuyTokenAccount.sellerConfig.exemplars, exemplars);

    await program.methods
      .registerBuy(buyTimestamp)
      .accounts({
        systemProgram: SystemProgram.programId,
        tokenProgramV0: TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        authority: buyerKeypair.publicKey,
        tokenConfig: tokenConfig,
        paymentAccount: paymentPublicKey,
        tokenMint: tokenMint,
        paymentMint: acceptedMintPublicKey,
        paymentVault: paymentVaultPublicKey,
        buyerTransferVault: buyerTransferVault,
        buyerTokenVault: buyerTokenVault,
      })
      .signers(
        buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
      )
      .rpc()
      .catch(console.error);

    await program.methods
      .registerBuy(secondBuyTimestamp)
      .accounts({
        tokenProgramV0: TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        authority: buyerKeypair.publicKey,
        tokenConfig: tokenConfig,
        tokenMint: tokenMint,
        paymentMint: acceptedMintPublicKey,
        paymentAccount: secondPaymentPublicKey,
        paymentVault: secondPaymentVaultPublicKey,
        buyerTransferVault: buyerTransferVault,
        buyerTokenVault: buyerTokenVault,
      })
      .signers(
        buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
      )
      .rpc()
      .catch(console.error);

    const paymentAccount = await program.account.payment.fetch(
      paymentPublicKey
    );
    assert.equal(paymentAccount.tokenMint.toString(), tokenMint.toString());
    assert.equal(
      paymentAccount.seller.toString(),
      sellerKeypair.publicKey.toString()
    );
    assert.equal(
      paymentAccount.buyer.toString(),
      buyerKeypair.publicKey.toString()
    );
    assert.equal(Number(paymentAccount.tokenPrice), Number(tokenPrice));
    assert.equal(Number(paymentAccount.paymentTimestamp), Number(buyTimestamp));
    assert.equal(Number(paymentAccount.refundConsumedAt), Number(buyTimestamp));

    const secondPaymentAccount = await program.account.payment.fetch(
      secondPaymentPublicKey
    );
    assert.equal(
      secondPaymentAccount.tokenMint.toString(),
      tokenMint.toString()
    );
    assert.equal(
      secondPaymentAccount.seller.toString(),
      sellerKeypair.publicKey.toString()
    );
    assert.equal(
      secondPaymentAccount.buyer.toString(),
      buyerKeypair.publicKey.toString()
    );
    assert.equal(Number(secondPaymentAccount.tokenPrice), Number(tokenPrice));
    assert.equal(
      Number(secondPaymentAccount.paymentTimestamp),
      Number(secondBuyTimestamp)
    );
    assert.equal(
      Number(secondPaymentAccount.refundConsumedAt),
      Number(secondBuyTimestamp)
    );

    // postTxInfo
    const tokenConfigData = await program.account.tokenConfig.fetch(
      tokenConfig
    );
    assert.isDefined(tokenConfigData);
    assert.equal(tokenConfigData.activePayments, 2);

    // check if the buyer is able to mint more tokens from the units bought
    // impossible, the mint authority is the token pda, only is possible calling
    // the buy ix that first requires the transfer
    try {
      await provider.sendAndConfirm(
        new anchor.web3.Transaction().add(
          createMintToInstruction(
            tokenMint,
            buyerKeypair.publicKey,
            tokenConfig,
            1,
            [buyerKeypair.publicKey]
          )
        )
      );
    } catch (e) {
        assert.equal(e, "Error: Signature verification failed");
    }

    await program.methods
      .withdrawFunds()
      .accounts({
        authority: sellerKeypair.publicKey,
        tokenConfig: tokenConfig,
        paymentAccount: paymentPublicKey,
        app: appPublicKey,
        tokenMint: tokenMint,
        paymentMint: acceptedMintPublicKey,
        buyer: buyerKeypair.publicKey,
        appCreator: appCreatorKeypair.publicKey,
        paymentVault: paymentVaultPublicKey,
        appCreatorVault: creatorTransferVault,
        receiverVault: sellerTransferVault,
      })
      .signers(
        sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
      )
      .rpc()
      .catch(console.error);

    await program.methods
      .withdrawFunds()
      .accounts({
        authority: sellerKeypair.publicKey,
        tokenConfig: tokenConfig,
        paymentAccount: secondPaymentPublicKey,
        appCreatorVault: creatorTransferVault,
        app: appPublicKey,
        tokenMint: tokenMint,
        paymentMint: acceptedMintPublicKey,
        buyer: buyerKeypair.publicKey,
        appCreator: appCreatorKeypair.publicKey,
        paymentVault: secondPaymentVaultPublicKey,
        receiverVault: sellerTransferVault,
      })
      .signers(
        sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
      )
      .rpc()
      .catch(console.error);

    const creatorTokenVaultAccount = await getAccount(
      provider.connection,
      creatorTransferVault
    );
    const totalAmount = 2 * Number(tokenPrice);
    const creatorFee = (totalAmount * fee) / 10000;
    const expectedCreatorAmount = Math.trunc(creatorBalance + creatorFee);
    assert.equal(
      Number(creatorTokenVaultAccount.amount),
      expectedCreatorAmount
    );
    const sellerTokenAccount = await getAccount(
      provider.connection,
      sellerTransferVault
    );
    const expectedSellerAmount = Math.trunc(
      sellerBalance + totalAmount - creatorFee
    );
    assert.equal(Number(sellerTokenAccount.amount), expectedSellerAmount);
  });

  it("Create an token and modify the price, an user pays the new price, seller withdraws funds and get the correct amount", async () => {
    const buyerBalance = 10;
    const sellerBalance = 2;
    const oldTokenPrice = new BN(1);
    const newTokenPrice = new BN(2);
    const exemplars = -1; // makes the token can be sold unlimited times
    const appName = "Solana";
    const {
      appPublicKey,
      appCreatorKeypair,
      creatorTransferVault,
      sellerKeypair,
      acceptedMintPublicKey,
      tokenConfig,
      firstId,
      secondId,
      tokenMint,
      buyerKeypair,
      buyerTokenVault,
      buyerTransferVault,
      buyTimestamp,
      paymentPublicKey,
      paymentVaultPublicKey,
      secondBuyTimestamp,
      secondPaymentPublicKey,
      secondPaymentVaultPublicKey,
      sellerTransferVault,
    } = await initNewAccounts(
      provider,
      program,
      appName,
      buyerBalance,
      sellerBalance,
      creatorBalance
    );

    await program.methods
      .createApp(appName, noFee)
      .accounts({
        authority: appCreatorKeypair.publicKey,
      })
      .signers(
        appCreatorKeypair instanceof (anchor.Wallet as any)
          ? []
          : [appCreatorKeypair]
      )
      .rpc()
      .catch(console.error);

    const preTxBuyerFunds = await getAccount(
      provider.connection,
      buyerTransferVault
    );
    const preTxSellerFunds = await getAccount(
      provider.connection,
      sellerTransferVault
    );

    await program.methods
      .createProduct(
        [...firstId],
        [...secondId],
        noRefundTime,
        oldTokenPrice,
        exemplars,
      )
      .accounts({
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        authority: sellerKeypair.publicKey,
        app: appPublicKey,
        paymentMint: acceptedMintPublicKey,
      })
      .signers(
        sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
      )
      .rpc()
      .catch(console.error);

    const prePriceChangeTokenAccount =
      await program.account.tokenConfig.fetch(tokenConfig);
    assert.isDefined(prePriceChangeTokenAccount);
    assert.equal(Number(prePriceChangeTokenAccount.sellerConfig.tokenPrice), Number(oldTokenPrice));

    await program.methods
      .editPrice(newTokenPrice)
      .accounts({
        authority: sellerKeypair.publicKey,
        tokenConfig: tokenConfig,
      })
      .signers(
        sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
      )
      .rpc()
      .catch(console.error);

    const postPriceChangeTokenAccount =
      await program.account.tokenConfig.fetch(tokenConfig);
    assert.isDefined(postPriceChangeTokenAccount);
    assert.equal(Number(postPriceChangeTokenAccount.sellerConfig.tokenPrice), Number(newTokenPrice));

    await program.methods
      .registerBuy(buyTimestamp)
      .accounts({
        systemProgram: SystemProgram.programId,
        tokenProgramV0: TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        authority: buyerKeypair.publicKey,
        tokenConfig: tokenConfig,
        paymentAccount: paymentPublicKey,
        tokenMint: tokenMint,
        paymentMint: acceptedMintPublicKey,
        paymentVault: paymentVaultPublicKey,
        buyerTransferVault: buyerTransferVault,
        buyerTokenVault: buyerTokenVault,
      })
      .signers(
        buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
      )
      .rpc()
      .catch(console.error);

    await program.methods
      .registerBuy(secondBuyTimestamp)
      .accounts({
        systemProgram: SystemProgram.programId,
        tokenProgramV0: TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        authority: buyerKeypair.publicKey,
        tokenConfig: tokenConfig,
        paymentAccount: secondPaymentPublicKey,
        tokenMint: tokenMint,
        paymentMint: acceptedMintPublicKey,
        paymentVault: secondPaymentVaultPublicKey,
        buyerTransferVault: buyerTransferVault,
        buyerTokenVault: buyerTokenVault,
      })
      .signers(
        buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
      )
      .rpc()
      .catch(console.error);

    const paymentAccount = await program.account.payment.fetch(
      paymentPublicKey
    );
    assert.isDefined(paymentAccount);

    // check if the buyer can withdraw the funds when the seller is the authority
    try {
      await program.methods
        .withdrawFunds()
        .accounts({
          authority: buyerKeypair.publicKey,
          tokenConfig: tokenConfig,
          paymentAccount: paymentPublicKey,
          app: appPublicKey,
          tokenMint: tokenMint,
          paymentMint: acceptedMintPublicKey,
          buyer: buyerKeypair.publicKey,
          appCreator: appCreatorKeypair.publicKey,
          paymentVault: paymentVaultPublicKey,
          appCreatorVault: creatorTransferVault,
          receiverVault: sellerTransferVault,
        })
        .signers(
          buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
        )
        .rpc();
    } catch (e) {
      console.log('Intentional error ' + e.error.errorCode.code);
      assert.equal(e.error.errorCode?.code, "ConstraintTokenOwner");
    }
    try {
      await program.methods
        .refund()
        .accounts({
          authority: buyerKeypair.publicKey,
          tokenConfig: tokenConfig,
          paymentAccount: paymentPublicKey,
          tokenMint: tokenMint,
          paymentMint: acceptedMintPublicKey,
          receiverVault: buyerTransferVault,
          paymentVault: paymentVaultPublicKey,
        })
        .signers(
          buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
        )
        .rpc();
    } catch (e) {
      console.log('Intentional error'  + e.error.errorCode.code);
      assert.equal(e.error.errorCode.code, "TimeForRefundHasConsumed");
    }

    await program.methods
      .withdrawFunds()
      .accounts({
        authority: sellerKeypair.publicKey,
        tokenConfig: tokenConfig,
        paymentAccount: paymentPublicKey,
        app: appPublicKey,
        tokenMint: tokenMint,
        paymentMint: acceptedMintPublicKey,
        buyer: buyerKeypair.publicKey,
        appCreator: appCreatorKeypair.publicKey,
        paymentVault: paymentVaultPublicKey,
        appCreatorVault: creatorTransferVault,
        receiverVault: sellerTransferVault,
      })
      .signers(
        sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
      )
      .rpc()
      .catch(console.error);

    await program.methods
      .withdrawFunds()
      .accounts({
        authority: sellerKeypair.publicKey,
        tokenConfig: tokenConfig,
        paymentAccount: secondPaymentPublicKey,
        app: appPublicKey,
        tokenMint: tokenMint,
        paymentMint: acceptedMintPublicKey,
        buyer: buyerKeypair.publicKey,
        appCreator: appCreatorKeypair.publicKey,
        paymentVault: secondPaymentVaultPublicKey,
        appCreatorVault: creatorTransferVault,
        receiverVault: sellerTransferVault,
      })
      .signers(
        sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
      )
      .rpc()
      .catch(console.error);

    const postTxBuyerFunds = await getAccount(
      provider.connection,
      buyerTransferVault
    );
    const postTxSellerFunds = await getAccount(
      provider.connection,
      sellerTransferVault
    );
    const tokenMintAccount = await getMint(provider.connection, tokenMint, null, TOKEN_2022_PROGRAM_ID);
    const tokenAccount = await program.account.tokenConfig.fetch(
      tokenConfig
    );

    // Assert buyer token account changed
    assert.isDefined(preTxBuyerFunds);
    assert.isDefined(postTxBuyerFunds);
    assert.equal(
      Number(postTxBuyerFunds.amount),
      Number(preTxBuyerFunds.amount - BigInt(Number(tokenAccount.sellerConfig.tokenPrice) * 2))
    );
    // Assert seller token account changed
    assert.isDefined(preTxSellerFunds);
    assert.isDefined(postTxSellerFunds);
    assert.equal(
        Number(postTxSellerFunds.amount),
        Number(preTxSellerFunds.amount + BigInt(Number(tokenAccount.sellerConfig.tokenPrice) * 2))
    );
    // Assert product token supply
    assert.isDefined(tokenMintAccount);
    assert.equal(tokenMintAccount.supply, BigInt(0));
  });

  it("Buyer gets refund, before test if the seller can withdraw during the refund time", async () => {
    const buyerBalance = 10;
    const sellerBalance = 2;
    const tokenPrice = new BN(2);
    const exemplars = 1;
    const appName = "Backpack";
    const refundTime = new anchor.BN(60000);
    const {
      appPublicKey,
      appCreatorKeypair,
      creatorTransferVault,
      sellerKeypair,
      acceptedMintPublicKey,
      tokenConfig,
      firstId,
      secondId,
      tokenMint,
      buyerKeypair,
      buyerTokenVault,
      buyerTransferVault,
      buyTimestamp,
      paymentPublicKey,
      paymentVaultPublicKey,
      sellerTransferVault,
    } = await initNewAccounts(
      provider,
      program,
      appName,
      buyerBalance,
      sellerBalance,
      creatorBalance
    );

    await program.methods
      .createApp(appName, noFee)
      .accounts({
        authority: appCreatorKeypair.publicKey,
      })
      .signers(
        appCreatorKeypair instanceof (anchor.Wallet as any)
          ? []
          : [appCreatorKeypair]
      )
      .rpc()
      .catch(console.error);

    await program.methods
      .createProduct(
        [...firstId],
        [...secondId],
        refundTime,
        tokenPrice,
        exemplars,
      )
      .accounts({
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        authority: sellerKeypair.publicKey,
        app: appPublicKey,
        paymentMint: acceptedMintPublicKey,
      })
      .signers(
        sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
      )
      .rpc()
      .catch(console.error);

    const preTxBuyerFunds = await getAccount(
      provider.connection,
      buyerTransferVault
    );

    await program.methods
      .registerBuy(buyTimestamp)
      .accounts({
        systemProgram: SystemProgram.programId,
        tokenProgramV0: TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        authority: buyerKeypair.publicKey,
        tokenConfig: tokenConfig,
        paymentAccount: paymentPublicKey,
        tokenMint: tokenMint,
        paymentMint: acceptedMintPublicKey,
        paymentVault: paymentVaultPublicKey,
        buyerTransferVault: buyerTransferVault,
        buyerTokenVault: buyerTokenVault,
      })
      .signers(
        buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
      )
      .rpc()
      .catch(console.error);

    const paymentVaultFunds = await getAccount(
      provider.connection,
      paymentVaultPublicKey
    );
    assert.isDefined(paymentVaultFunds);
    const paymentAccount = await program.account.payment.fetch(
      paymentPublicKey
    );
    assert.isDefined(paymentAccount);
    assert.equal(Number(paymentVaultFunds.amount), Number(tokenPrice) * exemplars);

    // check if the seller can withdraw the funds when the buyer is the authority
    try {
      await program.methods
        .withdrawFunds()
        .accounts({
          authority: sellerKeypair.publicKey,
          tokenConfig: tokenConfig,
          paymentAccount: paymentPublicKey,
          app: appPublicKey,
          tokenMint: tokenMint,
          paymentMint: acceptedMintPublicKey,
          buyer: buyerKeypair.publicKey,
          appCreator: appCreatorKeypair.publicKey,
          paymentVault: paymentVaultPublicKey,
          appCreatorVault: creatorTransferVault,
          receiverVault: sellerTransferVault,
        })
        .signers(
          sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
        )
        .rpc();
    } catch (e) {
      if (e as AnchorError)
        assert.equal(e.error.errorCode.code, "CannotWithdrawYet");
    }
    try {
      await program.methods
        .refund()
        .accounts({
          authority: sellerKeypair.publicKey,
          tokenConfig: tokenConfig,
          paymentAccount: paymentPublicKey,
          tokenMint: tokenMint,
          paymentMint: acceptedMintPublicKey,
          receiverVault: sellerTransferVault,
          paymentVault: paymentVaultPublicKey,
        })
        .signers(
          sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
        )
        .rpc();
    } catch (e) {
      if (e as AnchorError)
        assert.equal(e.error.errorCode.code, "IncorrectPaymentAuthority");
    }

    await program.methods
      .refund()
      .accounts({
        authority: buyerKeypair.publicKey,
        tokenConfig: tokenConfig,
        paymentAccount: paymentPublicKey,
        tokenMint: tokenMint,
        paymentMint: acceptedMintPublicKey,
        receiverVault: buyerTransferVault,
        paymentVault: paymentVaultPublicKey,
      })
      .signers(
        buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
      )
      .rpc()
      .catch(console.error);

    const postTxBuyerFunds = await getAccount(
      provider.connection,
      buyerTransferVault
    );

    // Assert buyer token account haven't changed
    assert.isDefined(preTxBuyerFunds);
    assert.isDefined(postTxBuyerFunds);
    assert.equal(postTxBuyerFunds.amount, preTxBuyerFunds.amount);
  });

  it("Seller withdraws after refund time, before test if the buyer can get a refund after the refund time", async () => {
    const buyerBalance = 10;
    const sellerBalance = 2;
    const tokenPrice = new BN(2);
    const exemplars = 1;
    const refundTime = new anchor.BN(3); // it is introduced in seconds
    const appName = "OnePiece";
    const {
      appPublicKey,
      appCreatorKeypair,
      creatorTransferVault,
      sellerKeypair,
      acceptedMintPublicKey,
      tokenConfig,
      firstId,
      secondId,
      tokenMint,
      buyerKeypair,
      buyerTokenVault,
      buyerTransferVault,
      buyTimestamp,
      paymentPublicKey,
      paymentVaultPublicKey,
      sellerTransferVault,
    } = await initNewAccounts(
      provider,
      program,
      appName,
      buyerBalance,
      sellerBalance,
      creatorBalance
    );

    await program.methods
      .createApp(appName, noFee)
      .accounts({
        authority: appCreatorKeypair.publicKey,
      })
      .signers(
        appCreatorKeypair instanceof (anchor.Wallet as any)
          ? []
          : [appCreatorKeypair]
      )
      .rpc()
      .catch(console.error);

    await program.methods
    await program.methods
      .createProduct(
        [...firstId],
        [...secondId],
        refundTime,
        tokenPrice,
        exemplars,
      )
      .accounts({
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        authority: sellerKeypair.publicKey,
        app: appPublicKey,
        paymentMint: acceptedMintPublicKey,
      })
      .signers(
        sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
      )
      .rpc()
      .catch(console.error);

    const preTxSellerFunds = await getAccount(
      provider.connection,
      sellerTransferVault
    );

    await program.methods
      .registerBuy(buyTimestamp)
      .accounts({
        systemProgram: SystemProgram.programId,
        tokenProgramV0: TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        authority: buyerKeypair.publicKey,
        tokenConfig: tokenConfig,
        paymentAccount: paymentPublicKey,
        tokenMint: tokenMint,
        paymentMint: acceptedMintPublicKey,
        paymentVault: paymentVaultPublicKey,
        buyerTransferVault: buyerTransferVault,
        buyerTokenVault: buyerTokenVault,
      })
      .signers(
        buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
      )
      .rpc()
      .catch(console.error);

    const paymentVaultFunds = await getAccount(
      provider.connection,
      paymentVaultPublicKey
    );
    assert.isDefined(paymentVaultFunds);
    const paymentAccount = await program.account.payment.fetch(
      paymentPublicKey
    );
    assert.isDefined(paymentAccount);
    assert.equal(Number(paymentVaultFunds.amount), Number(tokenPrice) * exemplars);

    await delay(5000); // i've created 3s refund time, it waits 5s

    // check if the buyer can withdraw the funds when the seller is the authority
    try {
      await program.methods
        .withdrawFunds()
        .accounts({
          authority: buyerKeypair.publicKey,
          tokenConfig: tokenConfig,
          paymentAccount: paymentPublicKey,
          app: appPublicKey,
          tokenMint: tokenMint,
          paymentMint: acceptedMintPublicKey,
          buyer: buyerKeypair.publicKey,
          appCreator: appCreatorKeypair.publicKey,
          paymentVault: paymentVaultPublicKey,
          appCreatorVault: creatorTransferVault,
          receiverVault: buyerTransferVault,
        })
        .signers(
          buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
        )
        .rpc();
    } catch (e) {
      if (e as AnchorError)
        assert.equal(e.error.errorCode.code, "IncorrectPaymentAuthority");
    }
    try {
      await program.methods
        .refund()
        .accounts({
          authority: buyerKeypair.publicKey,
          tokenConfig: tokenConfig,
          paymentAccount: paymentPublicKey,
          tokenMint: tokenMint,
          paymentMint: acceptedMintPublicKey,
          receiverVault: buyerTransferVault,
          paymentVault: paymentVaultPublicKey,
        })
        .signers(
          buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
        )
        .rpc();
    } catch (e) {
      if (e as AnchorError)
        assert.equal(e.error.errorCode.code, "TimeForRefundHasConsumed");
    }

    await program.methods
      .withdrawFunds()
      .accounts({
        authority: sellerKeypair.publicKey,
        tokenConfig: tokenConfig,
        paymentAccount: paymentPublicKey,
        app: appPublicKey,
        tokenMint: tokenMint,
        paymentMint: acceptedMintPublicKey,
        buyer: buyerKeypair.publicKey,
        appCreator: appCreatorKeypair.publicKey,
        paymentVault: paymentVaultPublicKey,
        appCreatorVault: creatorTransferVault,
        receiverVault: sellerTransferVault,
      })
      .signers(
        sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
      )
      .rpc();

    const postTxSellerFunds = await getAccount(
      provider.connection,
      sellerTransferVault
    );

    // Assert buyer token account haven't changed
    assert.isDefined(preTxSellerFunds);
    assert.equal(
      Number(preTxSellerFunds.amount) + exemplars * Number(tokenPrice),
      Number(postTxSellerFunds.amount)
    );
  });
})