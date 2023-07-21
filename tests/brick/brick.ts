import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { assert } from "chai";
import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
  getAccount,
  createTransferInstruction,
  getAssociatedTokenAddress,
  getAssociatedTokenAddressSync,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { 
  createFundedAssociatedTokenAccount, 
  createFundedWallet, 
  createMint, 
  getSplitId 
} from "./utils";
import { 
  ConfirmOptions, 
  SYSVAR_RENT_PUBKEY, 
  SystemProgram, 
  Transaction 
} from "@solana/web3.js";
import { Brick } from "../../target/types/brick";
import BN from "bn.js";
import { v4 as uuid } from "uuid";
import { ASSOCIATED_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";

describe("brick", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Brick as Program<Brick>;
  const confirmOptions: ConfirmOptions = { commitment: "confirmed" };

  // Keypairs:
  let marketplaceAuth: anchor.web3.Keypair;
  let seller: anchor.web3.Keypair;
  let buyer: anchor.web3.Keypair;
  let exploiter: anchor.web3.Keypair;

  // Mints, vaults and balances:
  let paymentMints: anchor.web3.PublicKey[] = [];
  let productMint: anchor.web3.PublicKey;
  let buyerTokenVault: anchor.web3.PublicKey;
  let mintBump: number;
  let marketplaceVaults: [anchor.web3.PublicKey, number][] = [];
  let buyerVaults: [anchor.web3.PublicKey, number][] = [];
  let sellerVaults: [anchor.web3.PublicKey, number][] = [];
  let exploiterVaults: [anchor.web3.PublicKey, number][] = [];
  let sellerRewardVaults: [anchor.web3.PublicKey, number][] = [];
  let buyerRewardVaults: [anchor.web3.PublicKey, number][] = [];
  let bountyVaults: [anchor.web3.PublicKey, number][] = [];

  // Program account addresses:
  let marketplacePubkey: anchor.web3.PublicKey;
  let productPubkey: anchor.web3.PublicKey;
  let sellerReward: anchor.web3.PublicKey;
  let buyerReward: anchor.web3.PublicKey;

  // Marketplace properties:
  let discountMint: anchor.web3.PublicKey;
  let fee: number;
  let feeReduction: number;
  let rewardMint: anchor.web3.PublicKey;
  let sellerRewardMarketplace: number;
  let buyerRewardMarketplace: number;
  let rewardsEnabled: boolean;
  let rewardTriggerMint: anchor.web3.PublicKey;

  // Product properties
  let productPrice: BN;
  let firstId: Buffer;
  let secondId: Buffer;

  it("Should create marketplace account", async () => {
    rewardMint = discountMint = paymentMints[0] = await createMint(provider);

    // If rewardTriggerMint == null_mint && rewardsEnabled == false -> NO REWARDS
    // If rewardTriggerMint == null_mint && rewardsEnabled == true -> REWARDS (regardless of the payment mint)
    // If rewardTriggerMint == mint && rewardsEnabled == true -> REWARDS only with specific rewardTriggerMint
    [rewardTriggerMint] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("null", "utf-8")],
      program.programId
    );

    const balance = 1000;
    marketplaceAuth = await createFundedWallet(provider, balance);

    [marketplacePubkey] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("marketplace", "utf-8"),
        marketplaceAuth.publicKey.toBuffer()
      ],
      program.programId
    );

    const [bountyVault] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("bounty_vault", "utf-8"),
        marketplacePubkey.toBuffer(),
        rewardMint.toBuffer()
      ],
      program.programId
    );
    bountyVaults.push([bountyVault, 0])

    fee = feeReduction = sellerRewardMarketplace = buyerRewardMarketplace = 0;
    rewardsEnabled = false;

    const initMarketplaceParams = {
      fee: fee,
      feeReduction: feeReduction,
      sellerReward: sellerRewardMarketplace,
      buyerReward: buyerRewardMarketplace,
      rewardsEnabled: rewardsEnabled
    };
    const initMarketplaceAccounts = {
      systemProgram: SystemProgram.programId,
      tokenProgramV0: TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
      signer: marketplaceAuth.publicKey,
      marketplace: marketplacePubkey,
      rewardMint: rewardMint,
      discountMint: discountMint,
      rewardTriggerMint: rewardTriggerMint,
      bountyVault: bountyVault,
    };
     
    await program.methods
      .initMarketplace(initMarketplaceParams)
      .accounts(initMarketplaceAccounts)
      .signers([marketplaceAuth])
      .rpc(confirmOptions)
      .catch(console.error);

    const marketplaceAccount = await program.account.marketplace.fetch(marketplacePubkey);
    assert.isDefined(marketplaceAccount);
    assert.equal(marketplaceAccount.authority.toString(), marketplaceAuth.publicKey.toString());
    assert.equal(marketplaceAccount.feesConfig.discountMint.toString(), discountMint.toString());
    assert.equal(marketplaceAccount.feesConfig.fee, fee);
    assert.equal(marketplaceAccount.feesConfig.feeReduction, feeReduction);
    assert.equal(marketplaceAccount.rewardsConfig.rewardMint.toString(), rewardMint.toString());
    assert.equal(marketplaceAccount.rewardsConfig.bountyVaults[0].toString(), bountyVaults[0][0].toString());
    assert.equal(marketplaceAccount.rewardsConfig.sellerReward, sellerRewardMarketplace);
    assert.equal(marketplaceAccount.rewardsConfig.buyerReward, buyerRewardMarketplace);
    assert.equal(marketplaceAccount.rewardsConfig.rewardsEnabled, rewardsEnabled);
    assert.equal(marketplaceAccount.rewardsConfig.rewardTriggerMint.toString(), rewardTriggerMint.toString());

    /// marketplace pda is created with "marketpalce" and signer address, lets try to create the same pda
    /// another user cant create the previous marketplace and authority cant be changed
    try {
      await program.methods
        .initMarketplace(initMarketplaceParams)
        .accounts(initMarketplaceAccounts)
        .signers([marketplaceAuth])
        .rpc(confirmOptions)
    } catch (e) {
      const logsWithError = e.logs;
      const isAlreadyInUse = logsWithError.some(log => log.includes("already in use"));
      assert.isTrue(isAlreadyInUse);   
    }
  });    

  it("Should edit marketplace data", async () => {
    const editMarketplaceInfoParams = {
      fee: 100,
      feeReduction: 100,
      sellerReward: 100,
      buyerReward: 100,
      rewardsEnabled: true
    };
    const editMarketplaceInfoAccounts = {
      signer: marketplaceAuth.publicKey,
      marketplace: marketplacePubkey,
      rewardMint: await createMint(provider),
      discountMint: await createMint(provider),
      rewardTriggerMint: await createMint(provider),
    };

    await program.methods
      .editMarketplaceInfo(editMarketplaceInfoParams)
      .accounts(editMarketplaceInfoAccounts)
      .signers([marketplaceAuth])
      .rpc(confirmOptions)
      .catch(console.error);

    const changedMarketplaceAccount = await program.account.marketplace.fetch(marketplacePubkey);
    assert.isDefined(changedMarketplaceAccount);
    assert.equal(changedMarketplaceAccount.authority.toString(), marketplaceAuth.publicKey.toString());
    assert.equal(changedMarketplaceAccount.feesConfig.discountMint.toString(), editMarketplaceInfoAccounts.discountMint.toString());
    assert.equal(changedMarketplaceAccount.feesConfig.fee, 100);
    assert.equal(changedMarketplaceAccount.feesConfig.feeReduction, 100);
    assert.equal(changedMarketplaceAccount.rewardsConfig.rewardMint.toString(), editMarketplaceInfoAccounts.rewardMint.toString());
    assert.equal(changedMarketplaceAccount.rewardsConfig.bountyVaults[0].toString(), bountyVaults[0][0].toString());
    assert.equal(changedMarketplaceAccount.rewardsConfig.sellerReward, 100);
    assert.equal(changedMarketplaceAccount.rewardsConfig.buyerReward, 100);
    assert.equal(changedMarketplaceAccount.rewardsConfig.rewardsEnabled, true);
    assert.equal(changedMarketplaceAccount.rewardsConfig.rewardTriggerMint.toString(), editMarketplaceInfoAccounts.rewardTriggerMint.toString());

    // another wallet tries to change product data
    const balance = 1000;
    exploiter = await createFundedWallet(provider, balance);
    const exploiterEditInfoParams = {
      fee: fee,
      feeReduction: feeReduction,
      sellerReward: sellerRewardMarketplace,
      buyerReward: buyerRewardMarketplace,
      rewardsEnabled: rewardsEnabled
    };
    const exploiterEditInfoAccounts = {
      signer: exploiter.publicKey,
      marketplace: marketplacePubkey,
      rewardMint: rewardMint,
      discountMint: discountMint,
      rewardTriggerMint: rewardTriggerMint,
    };

    try {
      await program.methods
        .editMarketplaceInfo(exploiterEditInfoParams)
        .accounts(exploiterEditInfoAccounts)
        .signers([exploiter])
        .rpc();
    } catch (e) {
      // marketplace seeds are composed by "marketplace" & signer
      if (e as anchor.AnchorError)
        assert.equal(e.error.errorCode.code, "ConstraintSeeds");
    }

    // to be able to re-use this account and its data, the account data will be the same that was before this unit test
    await program.methods
      .editMarketplaceInfo({
        fee: fee,
        feeReduction: feeReduction,
        sellerReward: sellerRewardMarketplace,
        buyerReward: buyerRewardMarketplace,
        rewardsEnabled: rewardsEnabled
      })
      .accounts({
        signer: marketplaceAuth.publicKey,
        marketplace: marketplacePubkey,
        rewardMint: rewardMint,
        discountMint: discountMint,
        rewardTriggerMint: rewardTriggerMint,
      })
      .signers([marketplaceAuth])
      .rpc(confirmOptions)
      .catch(console.error);

    const marketplaceAccount = await program.account.marketplace.fetch(marketplacePubkey);
    assert.isDefined(marketplaceAccount);
    assert.equal(marketplaceAccount.authority.toString(), marketplaceAuth.publicKey.toString());
    assert.equal(marketplaceAccount.feesConfig.discountMint.toString(), discountMint.toString());
    assert.equal(marketplaceAccount.feesConfig.fee, fee);
    assert.equal(marketplaceAccount.feesConfig.feeReduction, feeReduction);
    assert.equal(marketplaceAccount.rewardsConfig.rewardMint.toString(), rewardMint.toString());
    assert.equal(marketplaceAccount.rewardsConfig.bountyVaults[0].toString(), bountyVaults[0][0].toString());
    assert.equal(marketplaceAccount.rewardsConfig.sellerReward, sellerRewardMarketplace);
    assert.equal(marketplaceAccount.rewardsConfig.buyerReward, buyerRewardMarketplace);
    assert.equal(marketplaceAccount.rewardsConfig.rewardsEnabled, rewardsEnabled);
    assert.equal(marketplaceAccount.rewardsConfig.rewardTriggerMint.toString(), rewardTriggerMint.toString());
  });

  it("Should create a product account", async () => {
    [firstId, secondId] = getSplitId(uuid());
    const balance = 1000;
    seller = await createFundedWallet(provider, balance);

    [productPubkey] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("product", "utf-8"), 
        firstId, 
        secondId,
        marketplacePubkey.toBuffer()
      ],
      program.programId
    );
    [productMint, mintBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("product_mint", "utf-8"), 
        firstId, 
        secondId,
        marketplacePubkey.toBuffer()
      ],
      program.programId
    );
    productPrice = new BN(100);

    const initProductParams = {
      firstId: [...firstId],
      secondId: [...secondId],
      productPrice: productPrice,
      mintBump: mintBump,
    };
    const initProductAccounts = {
      systemProgram: SystemProgram.programId,
      tokenProgram2022: TOKEN_2022_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
      signer: seller.publicKey,
      marketplace: marketplacePubkey,
      product: productPubkey,
      productMint: productMint,
      paymentMint: paymentMints[0]
    };

    await program.methods
      .initProduct(initProductParams)
      .accounts(initProductAccounts)
      .signers([seller])
      .rpc(confirmOptions)
      .catch(console.error);

    const productAccount = await program.account.product.fetch(productPubkey);
    assert.isDefined(productAccount);
    assert.equal(productAccount.authority.toString(), seller.publicKey.toString());
    assert.equal(productAccount.firstId.toString(), [...firstId].toString());
    assert.equal(productAccount.secondId.toString(), [...secondId].toString());
    assert.equal(productAccount.marketplace.toString(), marketplacePubkey.toString());
    assert.equal(productAccount.productMint.toString(), productMint.toString());
    assert.equal(productAccount.sellerConfig.paymentMint.toString(), paymentMints[0].toString());
    assert.equal(Number(productAccount.sellerConfig.productPrice), Number(productPrice));
  });
/*
  it("Should create another product and delete it", async () => {
    const [firstId, secondId] = getSplitId(uuid());
    const seller = await createFundedWallet(provider, 1000);
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
        sellerority: seller.publicKey,
        governance: marketplacePubkey,
        product: productPubkey,
        paymentMint: paymentMintPubkey
      })
      .signers([seller])
      .rpc(confirmOptions)
      .catch(console.error);

    await program.methods
      .deleteProduct()
      .accounts({
        sellerority: seller.publicKey,
        product: productPubkey,
      })
      .signers([seller])
      .rpc(confirmOptions)
      .catch(console.error);

    try {
      await program.account.product.fetch(productPubkey);
    } catch (e) {
      assert.isTrue(e.toString().includes("Account does not exist or has no data"))
    }
  });
*/
  it("Should edit product data", async () => {
    const newPaymentMintPubkey = await createMint(provider);
    const newPrice = new BN(88);

    const editProductInfoAccounts = {
      signer: seller.publicKey,
      product: productPubkey,
      paymentMint: newPaymentMintPubkey,
    };
    await program.methods
      .editProductInfo(newPrice)
      .accounts(editProductInfoAccounts)
      .signers([seller])
      .rpc()
      .catch(console.error);

    const changedProductAccount = await program.account.product.fetch(productPubkey);
    assert.isDefined(changedProductAccount);
    assert.equal(changedProductAccount.sellerConfig.paymentMint.toString(), newPaymentMintPubkey.toString());
    assert.equal(Number(changedProductAccount.sellerConfig.productPrice), Number(newPrice));

    // another wallet tries to change product data
    try {
      await program.methods
        .editProductInfo(productPrice)
        .accounts({
          signer: exploiter.publicKey,
          product: productPubkey,
          paymentMint: newPaymentMintPubkey
        })
        .signers([exploiter])
        .rpc();
    } catch (e) {
      if (e as anchor.AnchorError)
        assert.equal(e.error.errorCode.code, "IncorrectAuthority");
    }

    // to be able to re-use this account and its data, the account data will be the same that was before this unit test
    await program.methods
      .editProductInfo(productPrice)
      .accounts({
        signer: seller.publicKey,
        product: productPubkey,
        paymentMint: paymentMints[0],
      })
      .signers([seller])
      .rpc()
      .catch(console.error);

    const productAccount = await program.account.product.fetch(productPubkey);
    assert.isDefined(productAccount);
    assert.equal(productAccount.sellerConfig.paymentMint.toString(), paymentMints[0].toString());
    assert.equal(Number(productAccount.sellerConfig.productPrice), Number(productPrice));
  });

  it("Should register a buy (no fees)", async () => {
    const buyerSOLBalance = 1000;
    buyer = await createFundedWallet(provider, buyerSOLBalance);

    const vaultBalances = 1000000;
    marketplaceVaults.push([
      await createFundedAssociatedTokenAccount(
        provider,
        paymentMints[0],
        vaultBalances,
        marketplaceAuth
      ),
      vaultBalances
    ]);
    sellerVaults.push([
      await createFundedAssociatedTokenAccount(
        provider,
        paymentMints[0],
        vaultBalances,
        seller
      ),
      vaultBalances
    ]);
    buyerVaults.push([
      await createFundedAssociatedTokenAccount(
        provider,
        paymentMints[0],
        vaultBalances,
        buyer
      ),
      vaultBalances
    ]);
    
    const buyerTokenVaultAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      buyer as anchor.web3.Signer,
      productMint,
      buyer.publicKey,
      false,
      "confirmed",
      confirmOptions,
      TOKEN_2022_PROGRAM_ID,
    );
    buyerTokenVault = buyerTokenVaultAccount.address;
    
    const registerBuyAccounts = {
      systemProgram: SystemProgram.programId,
      tokenProgramV0: TOKEN_PROGRAM_ID,
      tokenProgram22: TOKEN_2022_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
      signer: buyer.publicKey,
      marketplace: marketplacePubkey,
      product: productPubkey,
      productMint: productMint,
      paymentMint: paymentMints[0],
      buyerTokenVault: buyerTokenVault,
      buyerTransferVault: buyerVaults[0][0],
      sellerTransferVault: sellerVaults[0][0],
      marketplaceTransferVault: marketplaceVaults[0][0],
    };

    await program.methods
      .registerBuy()
      .accounts(registerBuyAccounts)
      .signers([buyer])
      .rpc(confirmOptions)
      .catch(console.error);

    const buyerVaultAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      buyer as anchor.web3.Signer,
      paymentMints[0],
      buyer.publicKey,
      false,
      "confirmed",
      confirmOptions,
      TOKEN_PROGRAM_ID,
    );
    buyerVaults[0][1] = vaultBalances - Number(productPrice);
    assert.equal(Number(buyerVaultAccount.amount), buyerVaults[0][1]);
    
    const sellerVaultAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      seller as anchor.web3.Signer,
      paymentMints[0],
      seller.publicKey,
      false,
      "confirmed",
      confirmOptions,
      TOKEN_PROGRAM_ID,
    );
    sellerVaults[0][1] = vaultBalances + Number(productPrice);
    assert.equal(Number(sellerVaultAccount.amount), sellerVaults[0][1]);
  });

  it("Buyer can not transfer the product token", async () => {
    const sellerTokenVaultAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      buyer as anchor.web3.Signer,
      productMint,
      buyer.publicKey,
      false,
      "confirmed",
      confirmOptions,
      TOKEN_2022_PROGRAM_ID,
    );

    try {
      await provider.sendAndConfirm(
        new Transaction()
          .add(
            createTransferInstruction(
              buyerTokenVault,
              sellerTokenVaultAccount.address,
              buyer.publicKey,
              1,
              [],
              TOKEN_2022_PROGRAM_ID
            )
          ),
        [buyer as anchor.web3.Signer]
      );
    } catch(e) {
      // the decimal equivalent of hexadecimal 0x25, it's 37 in decimal 
      // ie NonTransferable error in the t2022 program 
      assert.isTrue(e.toString().includes("0x25"));
    }
  });

  it("Should register a buy (with fees)", async () => {
    [fee, feeReduction, sellerRewardMarketplace, buyerRewardMarketplace] = [100, 0, 0, 0];
    const editMarketplaceInfoParams = {
      fee: fee,
      feeReduction: feeReduction,
      sellerReward: sellerRewardMarketplace,
      buyerReward: buyerRewardMarketplace,
      rewardsEnabled: false
    };
    const editMarketplaceInfoAccounts = {
      signer: marketplaceAuth.publicKey,
      marketplace: marketplacePubkey,
      rewardMint: rewardMint,
      discountMint: discountMint,
      rewardTriggerMint: rewardTriggerMint,
    };

    await program.methods
      .editMarketplaceInfo(editMarketplaceInfoParams)
      .accounts(editMarketplaceInfoAccounts)
      .signers([marketplaceAuth])
      .rpc()
      .catch(console.error);

    const registerBuyAccounts = {
      systemProgram: SystemProgram.programId,
      tokenProgramV0: TOKEN_PROGRAM_ID,
      tokenProgram22: TOKEN_2022_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
      signer: buyer.publicKey,
      marketplace: marketplacePubkey,
      product: productPubkey,
      productMint: productMint,
      paymentMint: paymentMints[0],
      buyerTokenVault: buyerTokenVault,
      buyerTransferVault: buyerVaults[0][0],
      sellerTransferVault: sellerVaults[0][0],
      marketplaceTransferVault: marketplaceVaults[0][0],
    };

    await program.methods
      .registerBuy()
      .accounts(registerBuyAccounts)
      .signers([buyer])
      .rpc(confirmOptions)
      .catch(console.error);
    
    const buyerVaultAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      buyer as anchor.web3.Signer,
      paymentMints[0],
      buyer.publicKey,
      false,
      "confirmed",
      confirmOptions,
      TOKEN_PROGRAM_ID,
    );
    buyerVaults[0][1] = buyerVaults[0][1] - Number(productPrice);
    assert.equal(Number(buyerVaultAccount.amount), buyerVaults[0][1]);
    
    const sellerVaultAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      seller as anchor.web3.Signer,
      paymentMints[0],
      seller.publicKey,
      false,
      "confirmed",
      confirmOptions,
      TOKEN_PROGRAM_ID,
    );
    const marketplaceFee = Math.floor((Number(productPrice) * (fee - feeReduction)) / 10000);
    sellerVaults[0][1] = sellerVaults[0][1] + Number(productPrice) - marketplaceFee;
    assert.equal(Number(sellerVaultAccount.amount), sellerVaults[0][1]);

    const marketAuthTransferVaultAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      marketplaceAuth as anchor.web3.Signer,
      paymentMints[0],
      marketplaceAuth.publicKey,
      false,
      "confirmed",
      confirmOptions,
      TOKEN_PROGRAM_ID,
    );
    marketplaceVaults[0][1] = marketplaceVaults[0][1] + marketplaceFee;
    assert.equal(Number(marketAuthTransferVaultAccount.amount), marketplaceVaults[0][1]);
  });

  it("Should register a buy (with fees and specific mint makes fee reduction)", async () => {
    [fee, feeReduction, sellerRewardMarketplace, buyerRewardMarketplace] = [100, 20, 0, 0];
    discountMint = paymentMints[0];
    const editMarketplaceInfoParams = {
      fee: fee,
      feeReduction: feeReduction,
      sellerReward: sellerRewardMarketplace,
      buyerReward: buyerRewardMarketplace,
      rewardsEnabled: false
    };
    const editMarketplaceInfoAccounts = {
      signer: marketplaceAuth.publicKey,
      marketplace: marketplacePubkey,
      rewardMint: rewardMint,
      discountMint: discountMint,
      rewardTriggerMint: rewardTriggerMint,
    };

    await program.methods
      .editMarketplaceInfo(editMarketplaceInfoParams)
      .accounts(editMarketplaceInfoAccounts)
      .signers([marketplaceAuth])
      .rpc()
      .catch(console.error);

    const registerBuyAccounts = {
      systemProgram: SystemProgram.programId,
      tokenProgramV0: TOKEN_PROGRAM_ID,
      tokenProgram22: TOKEN_2022_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
      signer: buyer.publicKey,
      marketplace: marketplacePubkey,
      product: productPubkey,
      productMint: productMint,
      paymentMint: paymentMints[0],
      buyerTokenVault: buyerTokenVault,
      buyerTransferVault: buyerVaults[0][0],
      sellerTransferVault: sellerVaults[0][0],
      marketplaceTransferVault: marketplaceVaults[0][0],
    };

    await program.methods
      .registerBuy()
      .accounts(registerBuyAccounts)
      .signers([buyer])
      .rpc(confirmOptions)
      .catch(console.error);
    
    const marketAuthTransferVaultAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      marketplaceAuth as anchor.web3.Signer,
      paymentMints[0],
      marketplaceAuth.publicKey,
      false,
      "confirmed",
      confirmOptions,
      TOKEN_PROGRAM_ID,
    );
    const marketplaceFee = Math.floor((Number(productPrice) * (fee - feeReduction)) / 10000);
    marketplaceVaults[0][1] = marketplaceVaults[0][1] + marketplaceFee;
    assert.equal(Number(marketAuthTransferVaultAccount.amount), marketplaceVaults[0][1]);
    
    const buyerVaultAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      buyer as anchor.web3.Signer,
      paymentMints[0],
      buyer.publicKey,
      false,
      "confirmed",
      confirmOptions,
      TOKEN_PROGRAM_ID,
    );
    buyerVaults[0][1] = buyerVaults[0][1] - Number(productPrice);
    assert.equal(Number(buyerVaultAccount.amount), buyerVaults[0][1]);

    const sellerVaultAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      seller as anchor.web3.Signer,
      paymentMints[0],
      seller.publicKey,
      false,
      "confirmed",
      confirmOptions,
      TOKEN_PROGRAM_ID,
    );
    sellerVaults[0][1] = sellerVaults[0][1] + Number(productPrice) - marketplaceFee;
    assert.equal(Number(sellerVaultAccount.amount), sellerVaults[0][1]);
  });

  it("Should register a buy during promo time, users can withdraw bonus when that promo is finished (not when still active)", async () => {
    // fill the token account controlled by the program to send the rewards
    bountyVaults[0][1] == 500;
    await provider.sendAndConfirm(
      new Transaction()
        .add(
          createTransferInstruction(
            marketplaceVaults[0][0],
            bountyVaults[0][0],
            marketplaceAuth.publicKey,
            bountyVaults[0][1]
          )
        ),
      [marketplaceAuth as anchor.web3.Signer]
    );
    [fee, feeReduction, sellerRewardMarketplace, buyerRewardMarketplace] = [100, 20, 20, 20];

    const editMarketplaceInfoParams = {
      fee: fee,
      feeReduction: feeReduction,
      sellerReward: sellerRewardMarketplace,
      buyerReward: buyerRewardMarketplace,
      rewardsEnabled: true
    };
    const editMarketplaceInfoAccounts = {
      signer: marketplaceAuth.publicKey,
      marketplace: marketplacePubkey,
      rewardMint: rewardMint,
      discountMint: discountMint,
      rewardTriggerMint: rewardTriggerMint,
    };

    await program.methods
      .editMarketplaceInfo(editMarketplaceInfoParams)
      .accounts(editMarketplaceInfoAccounts)
      .signers([marketplaceAuth])
      .rpc()
      .catch(console.error);

    [sellerReward] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("reward", "utf-8"), 
        seller.publicKey.toBuffer(),
        marketplacePubkey.toBuffer()
      ],
      program.programId
    );
    const [sellerRewardVault] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("reward_vault", "utf-8"), 
        seller.publicKey.toBuffer(),
        marketplacePubkey.toBuffer(),
        rewardMint.toBuffer(),
      ],
      program.programId
    );
    sellerRewardVaults.push([sellerRewardVault, 0]);

    const initSellerRewardAccounts = {
      systemProgram: SystemProgram.programId,
      tokenProgramV0: TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
      signer: seller.publicKey,
      marketplace: marketplacePubkey,
      reward: sellerReward,
      rewardMint: paymentMints[0],
      rewardVault: sellerRewardVault,
    };

    await program.methods
      .initReward()
      .accounts(initSellerRewardAccounts)
      .signers([seller])
      .rpc()
      .catch(console.error);

    const sellerRewardAccount = await program.account.reward.fetch(sellerReward);
    assert.isDefined(sellerRewardAccount);
    assert.equal(sellerRewardAccount.authority.toString(), seller.publicKey.toString());
    assert.equal(sellerRewardAccount.marketplace.toString(), marketplacePubkey.toString());
    assert.equal(sellerRewardAccount.rewardVaults[0].toString(), sellerRewardVault.toString());

    [buyerReward] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("reward", "utf-8"), 
        buyer.publicKey.toBuffer(),
        marketplacePubkey.toBuffer()
      ],
      program.programId
    );
    const [buyerRewardVault] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("reward_vault", "utf-8"), 
        buyer.publicKey.toBuffer(),
        marketplacePubkey.toBuffer(),
        rewardMint.toBuffer(),
      ],
      program.programId
    );
    buyerRewardVaults.push([buyerRewardVault, 0]);

    const initBuyerRewardAccounts = {
      systemProgram: SystemProgram.programId,
      tokenProgramV0: TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
      signer: buyer.publicKey,
      marketplace: marketplacePubkey,
      reward: buyerReward,
      rewardMint: paymentMints[0],
      rewardVault: buyerRewardVault,
    };
    await program.methods
      .initReward()
      .accounts(initBuyerRewardAccounts)
      .signers([buyer])
      .rpc()
      .catch(console.error);

    const buyerRewardAccount = await program.account.reward.fetch(buyerReward);
    assert.isDefined(buyerRewardAccount);
    assert.equal(buyerRewardAccount.authority.toString(), buyer.publicKey.toString());
    assert.equal(buyerRewardAccount.marketplace.toString(), marketplacePubkey.toString());
    assert.equal(buyerRewardAccount.rewardVaults[0].toString(), buyerRewardVault.toString());

    const registerRewardBuyAccounts = {
      systemProgram: SystemProgram.programId,
      tokenProgramV0: TOKEN_PROGRAM_ID,
      tokenProgram22: TOKEN_2022_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
      signer: buyer.publicKey,
      marketplace: marketplacePubkey,
      product: productPubkey,
      productMint: productMint,
      paymentMint: paymentMints[0],
      rewardMint: rewardMint,
      buyerTokenVault: buyerTokenVault,
      buyerTransferVault: buyerVaults[0][0],
      sellerTransferVault: sellerVaults[0][0],
      marketplaceTransferVault: marketplaceVaults[0][0],
      bountyVault: bountyVaults[0][0],
      sellerReward: sellerReward,
      sellerRewardVault: sellerRewardVault,
      buyerReward: buyerReward,
      buyerRewardVault: buyerRewardVault,
    };

    await program.methods
      .registerRewardBuy()
      .accounts(registerRewardBuyAccounts)
      .signers([buyer])
      .rpc(confirmOptions)
      .catch(console.error);

    const oldsellerPromo = 20;
    const expectedSellerReward = Math.floor(Number(productPrice) * oldsellerPromo / 10000);
    const sellerRewardFunds = await getAccount(provider.connection, sellerRewardVault);
    assert.equal(Number(sellerRewardFunds.amount), expectedSellerReward);

    const oldBuyerPromo = 20;
    const expectedBuyerReward = Math.floor(Number(productPrice) * oldBuyerPromo / 10000);
    const buyerRewardFunds = await getAccount(provider.connection, sellerRewardVault);
    assert.equal(Number(buyerRewardFunds.amount), expectedBuyerReward);

    try {
      await program.methods
        .withdrawReward()
        .accounts({
          tokenProgramV0: TOKEN_PROGRAM_ID,
          signer: buyer.publicKey,
          marketplace: marketplacePubkey,
          reward: buyerReward,
          rewardMint: rewardMint,
          receiverVault: buyerVaults[0][0],
          rewardVault: buyerRewardVaults[0][0],
        })
      .signers([buyer])
      .rpc(confirmOptions);
    } catch (e) {
      if (e as anchor.AnchorError)
        assert.equal(e.error.errorCode.code, "OpenPromotion");
    }

    // promo is finished with rewardsEnable = false
    const changeMarketplaceInfoParams = {
      fee: fee,
      feeReduction: feeReduction,
      sellerReward: sellerRewardMarketplace,
      buyerReward: buyerRewardMarketplace,
      rewardsEnabled: false
    };
    const changeMarketplaceInfoAccounts = {
      signer: marketplaceAuth.publicKey,
      marketplace: marketplacePubkey,
      rewardMint: rewardMint,
      discountMint: discountMint,
      rewardTriggerMint: rewardTriggerMint,
    };

    await program.methods
      .editMarketplaceInfo(changeMarketplaceInfoParams)
      .accounts(changeMarketplaceInfoAccounts)
      .signers([marketplaceAuth])
      .rpc()
      .catch(console.error);

    // only the reward auth can withdraw
    try {
      await program.methods
        .withdrawReward()
        .accounts({
          tokenProgramV0: TOKEN_PROGRAM_ID,
          signer: seller.publicKey,
          marketplace: marketplacePubkey,
          reward: buyerReward,
          rewardMint: rewardMint,
          receiverVault: sellerVaults[0][0],
          rewardVault: buyerRewardVaults[0][0],
        })
        .signers([seller])
        .rpc();
    } catch (e) {
      if (e as anchor.AnchorError)
        assert.equal(e.error.errorCode.code, "ConstraintSeeds");
    }

    await program.methods
      .withdrawReward()
      .accounts({
        tokenProgramV0: TOKEN_PROGRAM_ID,
        signer: buyer.publicKey,
        marketplace: marketplacePubkey,
        reward: buyerReward,
        rewardMint: rewardMint,
        receiverVault: buyerVaults[0][0],
        rewardVault: buyerRewardVaults[0][0],
      })
      .signers([buyer])
      .rpc(confirmOptions)
      .catch(console.error);

    await program.methods
      .withdrawReward()
      .accounts({
        tokenProgramV0: TOKEN_PROGRAM_ID,
        signer: seller.publicKey,
        marketplace: marketplacePubkey,
        reward: sellerReward,
        rewardMint: rewardMint,
        receiverVault: sellerVaults[0][0],
        rewardVault: sellerRewardVaults[0][0],
      })
      .signers([seller])
      .rpc(confirmOptions)
      .catch(console.error);

    const marketplaceTokenVaultAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      marketplaceAuth as anchor.web3.Signer,
      paymentMints[0],
      marketplaceAuth.publicKey,
      false,
      "confirmed",
      confirmOptions,
      TOKEN_PROGRAM_ID,
    );
    const buyerTokenTransferVaultAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      buyer as anchor.web3.Signer,
      paymentMints[0],
      buyer.publicKey,
      false,
      "confirmed",
      confirmOptions,
      TOKEN_PROGRAM_ID,
    );
    const sellerTokenVaultAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      seller as anchor.web3.Signer,
      paymentMints[0],
      seller.publicKey,
      false,
      "confirmed",
      confirmOptions,
      TOKEN_PROGRAM_ID,
    ); 

    const governanceFee = Math.floor(Number(productPrice) * (fee - feeReduction) / 10000);
    marketplaceVaults[0][1] = marketplaceVaults[0][1] + governanceFee;
    buyerVaults[0][1] = buyerVaults[0][1] - Number(productPrice) + expectedBuyerReward;
    const oldSellerPromo = 20; // Change to the actual value
    const expectedSellerBonus = Math.floor(Number(productPrice) * oldSellerPromo / 10000);
    sellerVaults[0][1] = sellerVaults[0][1] + Number(productPrice) - governanceFee + expectedSellerBonus;

    assert.equal(Number(marketplaceTokenVaultAccount.amount), marketplaceVaults[0][1]);
    assert.equal(Number(buyerTokenTransferVaultAccount.amount), buyerVaults[0][1]);    
    assert.equal(Number(sellerTokenVaultAccount.amount), sellerVaults[0][1]);
  });
})
