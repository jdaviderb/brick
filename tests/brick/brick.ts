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
  NATIVE_MINT,
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
  let marketplaceSOLVault: [anchor.web3.PublicKey, number];
  let marketplaceVaults: [anchor.web3.PublicKey, number][] = [];
  let buyerVaults: [anchor.web3.PublicKey, number][] = [];
  let sellerVaults: [anchor.web3.PublicKey, number][] = [];
  let exploiterVaults: [anchor.web3.PublicKey, number][] = [];
  let sellerRewardVaults: [anchor.web3.PublicKey, number][] = [];
  let buyerRewardVaults: [anchor.web3.PublicKey, number][] = [];
  let bountyVaults: [anchor.web3.PublicKey, number][] = [];
  let accessVaults: [anchor.web3.PublicKey, number][] = [];

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
  let allowSecondary: boolean;
  let permissionless: boolean;
  let accessMint: anchor.web3.PublicKey;
  let accessMintBump: number;
  const FeePayer = {
    Buyer: { buyer: {} },
    Seller: { seller: {} },
  };

  // Product properties
  let productPrice: BN;
  let firstId: Buffer;
  let secondId: Buffer;

  it("Should create marketplace account", async () => {
    rewardMint = discountMint = paymentMints[0] = await createMint(provider, confirmOptions);

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
    rewardsEnabled = allowSecondary = false;
    permissionless = true;

    [accessMint, accessMintBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("access_mint", "utf-8"),
        marketplacePubkey.toBuffer(),
      ],
      program.programId
    );

    const initMarketplaceParams = {
      fee: fee,
      feeReduction: feeReduction,
      sellerReward: sellerRewardMarketplace,
      buyerReward: buyerRewardMarketplace,
      deliverToken: false,
      rewardsEnabled: rewardsEnabled,
      allowSecondary: allowSecondary,
      permissionless: permissionless,
      accessMintBump: accessMintBump,
      feePayer: FeePayer.Seller,
    };
    const initMarketplaceAccounts = {
      systemProgram: SystemProgram.programId,
      tokenProgramV0: TOKEN_PROGRAM_ID,
      tokenProgram2022: TOKEN_2022_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
      signer: marketplaceAuth.publicKey,
      marketplace: marketplacePubkey,
      accessMint: accessMint,
      rewardMint: rewardMint,
      discountMint: discountMint,
      bountyVault: bountyVault,
    };
     
    await program.methods
      .initMarketplace(initMarketplaceParams)
      .accounts(initMarketplaceAccounts)
      .signers([marketplaceAuth])
      .rpc(confirmOptions)
      .catch(console.error);

    const solBalance = await provider.connection.getBalance(marketplaceAuth.publicKey, confirmOptions);
    console.log('Crate marketplace cost: ' + (1000 - solBalance / anchor.web3.LAMPORTS_PER_SOL) + ' SOL');

    const marketplaceAccount = await program.account.marketplace.fetch(marketplacePubkey);
    assert.isDefined(marketplaceAccount);
    assert.equal(marketplaceAccount.authority.toString(), marketplaceAuth.publicKey.toString());
    assert.equal(marketplaceAccount.permissionConfig.accessMint.toString(), accessMint.toString());
    assert.equal(marketplaceAccount.permissionConfig.permissionless, permissionless);
    assert.equal(marketplaceAccount.permissionConfig.allowSecondary, allowSecondary);
    assert.equal(marketplaceAccount.feesConfig.discountMint.toString(), discountMint.toString());
    assert.equal(marketplaceAccount.feesConfig.fee, fee);
    assert.equal(marketplaceAccount.feesConfig.feeReduction, feeReduction);
    assert.equal(marketplaceAccount.feesConfig.feePayer.toString(), FeePayer.Seller.toString());
    assert.equal(marketplaceAccount.rewardsConfig.rewardMint.toString(), rewardMint.toString());
    assert.equal(marketplaceAccount.rewardsConfig.bountyVaults[0].toString(), bountyVaults[0][0].toString());
    assert.equal(marketplaceAccount.rewardsConfig.sellerReward, sellerRewardMarketplace);
    assert.equal(marketplaceAccount.rewardsConfig.buyerReward, buyerRewardMarketplace);
    assert.equal(marketplaceAccount.rewardsConfig.rewardsEnabled, rewardsEnabled);

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
      rewardsEnabled: !rewardsEnabled,
      allowSecondary: !allowSecondary,
      permissionless: !permissionless,
      feePayer: FeePayer.Buyer,
    };

    const editMarketplaceInfoAccounts = {
      signer: marketplaceAuth.publicKey,
      marketplace: marketplacePubkey,
      rewardMint: await createMint(provider, confirmOptions),
      discountMint: await createMint(provider, confirmOptions),
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
    assert.equal(changedMarketplaceAccount.permissionConfig.accessMint.toString(), accessMint.toString());
    assert.equal(changedMarketplaceAccount.permissionConfig.permissionless, !permissionless);
    assert.equal(changedMarketplaceAccount.permissionConfig.allowSecondary, !allowSecondary);
    assert.equal(changedMarketplaceAccount.feesConfig.discountMint.toString(), editMarketplaceInfoAccounts.discountMint.toString());
    assert.equal(changedMarketplaceAccount.feesConfig.feePayer.toString(), FeePayer.Buyer.toString());
    assert.equal(changedMarketplaceAccount.feesConfig.fee, 100);
    assert.equal(changedMarketplaceAccount.feesConfig.feeReduction, 100);
    assert.equal(changedMarketplaceAccount.rewardsConfig.rewardMint.toString(), editMarketplaceInfoAccounts.rewardMint.toString());
    assert.equal(changedMarketplaceAccount.rewardsConfig.bountyVaults[0].toString(), bountyVaults[0][0].toString());
    assert.equal(changedMarketplaceAccount.rewardsConfig.sellerReward, 100);
    assert.equal(changedMarketplaceAccount.rewardsConfig.buyerReward, 100);
    assert.equal(changedMarketplaceAccount.rewardsConfig.rewardsEnabled, !rewardsEnabled);

    // another wallet tries to change product data
    const balance = 1000;
    exploiter = await createFundedWallet(provider, balance);
    const exploiterEditInfoParams = {
      fee: fee,
      feeReduction: feeReduction,
      sellerReward: sellerRewardMarketplace,
      buyerReward: buyerRewardMarketplace,
      rewardsEnabled: rewardsEnabled,
      allowSecondary: allowSecondary,
      permissionless: permissionless,
      feePayer: FeePayer.Seller,
    };
    const exploiterEditInfoAccounts = {
      signer: exploiter.publicKey,
      marketplace: marketplacePubkey,
      rewardMint: rewardMint,
      discountMint: discountMint,
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
    const initMarketplaceParams = {
      fee: fee,
      feeReduction: feeReduction,
      sellerReward: sellerRewardMarketplace,
      buyerReward: buyerRewardMarketplace,
      rewardsEnabled: rewardsEnabled,
      allowSecondary: allowSecondary,
      permissionless: permissionless,
      feePayer: FeePayer.Seller,
    };
    const initMarketplaceAccounts = {
      signer: marketplaceAuth.publicKey,
      marketplace: marketplacePubkey,
      rewardMint: rewardMint,
      discountMint: discountMint,
    };
    await program.methods
      .editMarketplaceInfo(initMarketplaceParams)
      .accounts(initMarketplaceAccounts)
      .signers([marketplaceAuth])
      .rpc(confirmOptions)
      .catch(console.error);

    const marketplaceAccount = await program.account.marketplace.fetch(marketplacePubkey);
    assert.isDefined(marketplaceAccount);
    assert.equal(marketplaceAccount.authority.toString(), marketplaceAuth.publicKey.toString());
    assert.equal(marketplaceAccount.permissionConfig.accessMint.toString(), accessMint.toString());
    assert.equal(marketplaceAccount.permissionConfig.permissionless, permissionless);
    assert.equal(marketplaceAccount.permissionConfig.allowSecondary, allowSecondary);
    assert.equal(marketplaceAccount.feesConfig.discountMint.toString(), discountMint.toString());
    assert.equal(marketplaceAccount.feesConfig.feePayer.toString(), FeePayer.Seller.toString());
    assert.equal(marketplaceAccount.feesConfig.fee, fee);
    assert.equal(marketplaceAccount.feesConfig.feeReduction, feeReduction);
    assert.equal(marketplaceAccount.rewardsConfig.rewardMint.toString(), rewardMint.toString());
    assert.equal(marketplaceAccount.rewardsConfig.bountyVaults[0].toString(), bountyVaults[0][0].toString());
    assert.equal(marketplaceAccount.rewardsConfig.sellerReward, sellerRewardMarketplace);
    assert.equal(marketplaceAccount.rewardsConfig.buyerReward, buyerRewardMarketplace);
    assert.equal(marketplaceAccount.rewardsConfig.rewardsEnabled, rewardsEnabled);
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
    productPrice = new BN(10000);

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
      paymentMint: paymentMints[0],
      accessMint: null,
      accessVault: null,
    };

    await program.methods
      .initProduct(initProductParams)
      .accounts(initProductAccounts)
      .signers([seller])
      .rpc(confirmOptions)
      .catch(console.error);

    const solBalance = await provider.connection.getBalance(seller.publicKey, confirmOptions);
    console.log('Crate product cost: ' + (1000 - solBalance / anchor.web3.LAMPORTS_PER_SOL) + ' SOL');

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
    const newPaymentMintPubkey = await createMint(provider, confirmOptions);
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

  it("Should register a buy, no fees, two amounts in the same instruction", async () => {
    const buyerSOLBalance = 1000;
    buyer = await createFundedWallet(provider, buyerSOLBalance);

    const vaultBalances = 1000000000;
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
  
    const [paymentPubkey, bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("payment", "utf-8"), 
        buyer.publicKey.toBuffer(), 
        productPubkey.toBuffer(),
      ],
      program.programId
    );

    const registerBuyAccounts = {
      systemProgram: SystemProgram.programId,
      tokenProgramV0: TOKEN_PROGRAM_ID,
      tokenProgram2022: TOKEN_2022_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
      signer: buyer.publicKey,
      seller: null,
      marketplaceAuth: null,
      marketplace: marketplacePubkey,
      product: productPubkey,
      payment: paymentPubkey,
      productMint: null,
      paymentMint: paymentMints[0],
      buyerTokenVault: null,
      buyerTransferVault: buyerVaults[0][0],
      sellerTransferVault: sellerVaults[0][0],
      marketplaceTransferVault: marketplaceVaults[0][0],
      bountyVault: null,
      sellerReward: null,
      sellerRewardVault: null,
      buyerReward: null,
      buyerRewardVault: null,
    };
    await program.methods
      .registerBuy(bump, new BN(2))
      .accounts(registerBuyAccounts)
      .signers([buyer])
      .rpc(confirmOptions)
      .catch(console.error);

    const solBalance = await provider.connection.getBalance(buyer.publicKey, confirmOptions);
    console.log('Purchase a product costs without mint: ' + (1000 - solBalance / anchor.web3.LAMPORTS_PER_SOL) + ' SOL');

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
    buyerVaults[0][1] = vaultBalances - 2 * Number(productPrice);
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
    sellerVaults[0][1] = vaultBalances + 2 * Number(productPrice);
    assert.equal(Number(sellerVaultAccount.amount), sellerVaults[0][1]);
  });

  /*
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
  */

  it("Should register a buy (with fees)", async () => {
    [fee, feeReduction, sellerRewardMarketplace, buyerRewardMarketplace] = [100, 0, 0, 0];
    const editMarketplaceInfoParams = {
      fee: fee,
      feeReduction: feeReduction,
      sellerReward: sellerRewardMarketplace,
      buyerReward: buyerRewardMarketplace,
      rewardsEnabled: rewardsEnabled,
      allowSecondary: allowSecondary,
      permissionless: permissionless,
      feePayer: FeePayer.Seller,
    };
    const editMarketplaceInfoAccounts = {
      signer: marketplaceAuth.publicKey,
      marketplace: marketplacePubkey,
      rewardMint: rewardMint,
      discountMint: discountMint,
    };

    await program.methods
      .editMarketplaceInfo(editMarketplaceInfoParams)
      .accounts(editMarketplaceInfoAccounts)
      .signers([marketplaceAuth])
      .rpc()
      .catch(console.error);

    const [paymentPubkey, bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("payment", "utf-8"), 
        buyer.publicKey.toBuffer(), 
        productPubkey.toBuffer(),
      ],
      program.programId
    );

    const registerBuyAccounts = {
      systemProgram: SystemProgram.programId,
      tokenProgramV0: TOKEN_PROGRAM_ID,
      tokenProgram2022: TOKEN_2022_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
      signer: buyer.publicKey,
      seller: null,
      marketplaceAuth: null,
      marketplace: marketplacePubkey,
      product: productPubkey,
      payment: paymentPubkey,
      productMint: null,
      paymentMint: paymentMints[0],
      buyerTokenVault: null,
      buyerTransferVault: buyerVaults[0][0],
      sellerTransferVault: sellerVaults[0][0],
      marketplaceTransferVault: marketplaceVaults[0][0],
      bountyVault: null,
      sellerReward: null,
      sellerRewardVault: null,
      buyerReward: null,
      buyerRewardVault: null,
    };
    await program.methods
      .registerBuy(bump, new BN(1))
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

  it("Should register a buy (with fees and native mint)", async () => {
    const newPaymentMintPubkey = NATIVE_MINT;
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

    const [paymentPubkey, bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("payment", "utf-8"), 
        buyer.publicKey.toBuffer(), 
        productPubkey.toBuffer(),
      ],
      program.programId
    );

    const marketAuthBalance = await provider.connection.getBalance(marketplaceAuth.publicKey, confirmOptions);
    const sellerBalance = await provider.connection.getBalance(seller.publicKey, confirmOptions);
    const buyerBalance = await provider.connection.getBalance(buyer.publicKey, confirmOptions);

    const registerBuyAccounts = {
      systemProgram: SystemProgram.programId,
      tokenProgramV0: TOKEN_PROGRAM_ID,
      tokenProgram2022: TOKEN_2022_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
      signer: buyer.publicKey,
      seller: seller.publicKey,
      marketplaceAuth: marketplaceAuth.publicKey,
      marketplace: marketplacePubkey,
      product: productPubkey,
      payment: paymentPubkey,
      productMint: null,
      paymentMint: newPaymentMintPubkey,
      buyerTokenVault: null,
      buyerTransferVault: null,
      sellerTransferVault: null,
      marketplaceTransferVault: null,
      bountyVault: null,
      sellerReward: null,
      sellerRewardVault: null,
      buyerReward: null,
      buyerRewardVault: null,
    };
    await program.methods
      .registerBuy(bump, new BN(1))
      .accounts(registerBuyAccounts)
      .signers([buyer])
      .rpc(confirmOptions)
      .catch(console.error);

    // Set the previous product configuration
    const initialEditProductInfoAccounts = {
      signer: seller.publicKey,
      product: productPubkey,
      paymentMint: paymentMints[0],
    };
    await program.methods
      .editProductInfo(productPrice)
      .accounts(initialEditProductInfoAccounts)
      .signers([seller])
      .rpc()
      .catch(console.error);

    const postMarketAuthBalance = await provider.connection.getBalance(marketplaceAuth.publicKey, confirmOptions);
    const postSellerBalance = await provider.connection.getBalance(seller.publicKey, confirmOptions);
    const postBuyerBalance = await provider.connection.getBalance(buyer.publicKey, confirmOptions);
    const marketplaceFee = Math.floor((Number(newPrice) * fee) / 10000);

    assert.equal(postMarketAuthBalance, marketAuthBalance + marketplaceFee);
    assert.equal(postSellerBalance, sellerBalance + Number(newPrice) - marketplaceFee);
    assert.equal(postBuyerBalance, buyerBalance - Number(newPrice));
  });

  it("Should register a buy (with fees and specific mint makes fee reduction)", async () => {
    [fee, feeReduction, sellerRewardMarketplace, buyerRewardMarketplace] = [100, 20, 0, 0];
    discountMint = paymentMints[0];
    const editMarketplaceInfoParams = {
      fee: fee,
      feeReduction: feeReduction,
      sellerReward: sellerRewardMarketplace,
      buyerReward: buyerRewardMarketplace,
      rewardsEnabled: rewardsEnabled,
      allowSecondary: allowSecondary,
      permissionless: permissionless,
      feePayer: FeePayer.Seller,
    };
    const editMarketplaceInfoAccounts = {
      signer: marketplaceAuth.publicKey,
      marketplace: marketplacePubkey,
      rewardMint: rewardMint,
      discountMint: discountMint,
    };

    await program.methods
      .editMarketplaceInfo(editMarketplaceInfoParams)
      .accounts(editMarketplaceInfoAccounts)
      .signers([marketplaceAuth])
      .rpc()
      .catch(console.error);

    const [paymentPubkey, bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("payment", "utf-8"), 
        buyer.publicKey.toBuffer(), 
        productPubkey.toBuffer(),
      ],
      program.programId
    );

    const registerBuyAccounts = {
      systemProgram: SystemProgram.programId,
      tokenProgramV0: TOKEN_PROGRAM_ID,
      tokenProgram2022: TOKEN_2022_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
      signer: buyer.publicKey,
      seller: null,
      marketplaceAuth: null,
      marketplace: marketplacePubkey,
      product: productPubkey,
      payment: paymentPubkey,
      productMint: null,
      paymentMint: paymentMints[0],
      buyerTokenVault: null,
      buyerTransferVault: buyerVaults[0][0],
      sellerTransferVault: sellerVaults[0][0],
      marketplaceTransferVault: marketplaceVaults[0][0],
      bountyVault: null,
      sellerReward: null,
      sellerRewardVault: null,
      buyerReward: null,
      buyerRewardVault: null,
    };

    await program.methods
      .registerBuy(bump, new BN(1))
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
    bountyVaults[0][1] = 1000000;
    marketplaceVaults[0][1] = marketplaceVaults[0][1] - 1000000;
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
    rewardsEnabled = true;
    const editMarketplaceInfoParams = {
      fee: fee,
      feeReduction: feeReduction,
      sellerReward: sellerRewardMarketplace,
      buyerReward: buyerRewardMarketplace,
      rewardsEnabled: rewardsEnabled,
      allowSecondary: allowSecondary,
      permissionless: permissionless,
      feePayer: FeePayer.Seller,
    };
    const editMarketplaceInfoAccounts = {
      signer: marketplaceAuth.publicKey,
      marketplace: marketplacePubkey,
      rewardMint: rewardMint,
      discountMint: discountMint,
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

    const [paymentPubkey, bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("payment", "utf-8"), 
        buyer.publicKey.toBuffer(), 
        productPubkey.toBuffer(),
      ],
      program.programId
    );
    const registerRewardBuyAccounts = {
      systemProgram: SystemProgram.programId,
      tokenProgramV0: TOKEN_PROGRAM_ID,
      tokenProgram2022: TOKEN_2022_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
      signer: buyer.publicKey,
      seller: null,
      marketplaceAuth: null,
      marketplace: marketplacePubkey,
      product: productPubkey,
      payment: paymentPubkey,
      productMint: null,
      paymentMint: paymentMints[0],
      rewardMint: rewardMint,
      buyerTokenVault: null,
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
      .registerBuy(bump, new BN(1))
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
    rewardsEnabled = false;
    const changeMarketplaceInfoParams = {
      fee: fee,
      feeReduction: feeReduction,
      sellerReward: sellerRewardMarketplace,
      buyerReward: buyerRewardMarketplace,
      rewardsEnabled: rewardsEnabled,
      allowSecondary: allowSecondary,
      permissionless: permissionless,
      feePayer: FeePayer.Seller,
    };
    const changeMarketplaceInfoAccounts = {
      signer: marketplaceAuth.publicKey,
      marketplace: marketplacePubkey,
      rewardMint: rewardMint,
      discountMint: discountMint,
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

  it("Should make the marketplace token-gated", async () => {
    const editMarketplaceInfoParams = {
      fee: 0,
      feeReduction: 0,
      sellerReward: 0,
      buyerReward: 0,
      rewardsEnabled: false,
      allowSecondary: false,
      permissionless: false,
      feePayer: FeePayer.Buyer,
    };

    const editMarketplaceInfoAccounts = {
      signer: marketplaceAuth.publicKey,
      marketplace: marketplacePubkey,
      rewardMint: await createMint(provider, confirmOptions),
      discountMint: await createMint(provider, confirmOptions),
    };

    await program.methods
      .editMarketplaceInfo(editMarketplaceInfoParams)
      .accounts(editMarketplaceInfoAccounts)
      .signers([marketplaceAuth])
      .rpc()
      .catch(console.error);

    const receiverVault = getAssociatedTokenAddressSync(accessMint, seller.publicKey, false, TOKEN_2022_PROGRAM_ID);
    const [request] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("request", "utf-8"),
        seller.publicKey.toBuffer(),
        marketplacePubkey.toBuffer()
      ],
      program.programId
    );
    const initRequestAccounts = {
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
      signer: seller.publicKey,
      marketplace: marketplacePubkey,
      request: request,
    };
    await program.methods
      .initRequest()
      .accounts(initRequestAccounts)
      .signers([seller])
      .rpc()
      .catch(console.error);

    const acceptRequestAccounts = {
      systemProgram: SystemProgram.programId,
      tokenProgram2022: TOKEN_2022_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
      signer: marketplaceAuth.publicKey,
      receiver: seller.publicKey,
      marketplace: marketplacePubkey,
      request: request,
      accessMint: accessMint,
      receiverVault: receiverVault,
    };

    await program.methods
      .acceptRequest()
      .accounts(acceptRequestAccounts)
      .signers([marketplaceAuth])
      .rpc()
      .catch(console.error);

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
      paymentMint: paymentMints[0],
      accessMint: accessMint,
      accessVault: receiverVault,
    };
    await program.methods
      .initProduct(initProductParams)
      .accounts(initProductAccounts)
      .signers([seller])
      .rpc()
      .catch(console.error);

    [firstId, secondId] = getSplitId(uuid());
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
    const buyerVault = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      buyer as anchor.web3.Signer,
      accessMint,
      buyer.publicKey,
      false,
      "confirmed",
      confirmOptions,
      TOKEN_2022_PROGRAM_ID,
    );
    const initErrorProductParams = {
      firstId: [...firstId],
      secondId: [...secondId],
      productPrice: productPrice,
      mintBump: mintBump,
    };
    const initErrorProductAccounts = {
      systemProgram: SystemProgram.programId,
      tokenProgram2022: TOKEN_2022_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
      signer: buyer.publicKey,
      marketplace: marketplacePubkey,
      product: productPubkey,
      productMint: productMint,
      paymentMint: paymentMints[0],
      accessMint: accessMint,
      accessVault: buyerVault.address,
    };
    try {
      await program.methods
        .initProduct(initErrorProductParams)
        .accounts(initErrorProductAccounts)
        .signers([buyer])
        .rpc();
    } catch (e) {
      if (e as anchor.AnchorError)
        assert.equal(e.error.errorCode.code, "NotInWithelist");
    }
  });    
})