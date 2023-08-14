Full events query
{
  events(account: "5WnQLqDpc35PodFDBH6ZAWzDonvt4SF9R9wHq7mhMBG") {
    id
    timestamp
    type
    account
    signer
    ... on AcceptAccessEvent {
      info {
        systemProgram
        tokenProgram2022
        associatedTokenProgram
        rent
        signer
        receiver
        marketplace
        request
        accessMint
        accessVault
      }
    }
    ... on AirdropAccessEvent {
      info {
        systemProgram
        tokenProgram2022
        associatedTokenProgram
        rent
        signer
        receiver
        marketplace
        accessMint
        accessVault
      }
    }
    ... on EditProductEvent {
      info {
        signer
        product
        paymentMint
        productPrice
      }
    }
    ... on EditMarketplaceEvent {
      info {
        signer
        marketplace
        rewardMint
        discountMint
        params {
          fee
          feeReduction
          sellerReward
          buyerReward
          useCnfts
          deliverToken
          transferable
          chainCounter
          permissionless
          rewardsEnabled
          feePayer
        }
      }
    }
    ... on InitBountyEvent {
      info {
        systemProgram
        tokenProgramV0
        associatedTokenProgram
        rent
        signer
        marketplace
        rewardMint
        bountyVault
      }
    }
    ... on InitMarketplaceEvent {
      info {
        systemProgram
        tokenProgram2022
        tokenProgramV0
        rent
        signer
        marketplace
        accessMint
        rewardMint
        discountMint
        bountyVault
        params {
          fee
          feeReduction
          sellerReward
          buyerReward
          useCnfts
          deliverToken
          transferable
          chainCounter
          permissionless
          rewardsEnabled
          accessMintBump
          feePayer
        }
      }
    }
    ... on InitProductTreeEvent {
      info {
        tokenMetadataProgram
        logWrapper
        bubblegumProgram
        compressionProgram
        tokenProgramV0
        associatedTokenProgram
        rent
        signer
        marketplace
        product
        productMint
        paymentMint
        accessMint
        productMintVault
        accessVault
        masterEdition
        metadata
        merkleTree
        treeAuthority
        params {
          firstId
          secondId
          productPrice
          maxDepth
          maxBufferSize
          name
          metadataUrl
          feeBasisPoints
        }
      }
    }
    ... on InitProductEvent {
      info {
        systemProgram
        tokenProgram2022
        rent
        signer
        marketplace
        product
        productMint
        paymentMint
        accessMint
        accessVault
        params {
          firstId
          secondId
          productPrice
          productMintBump
        }
      }
    }
    ... on InitRewardVaultEvent {
      info {
        systemProgram
        tokenProgramV0
        associatedTokenProgram
        rent
        signer
        marketplace
        reward
        rewardMint
        rewardVault
      }
    }
    ... on InitRewardEvent {
      info {
        systemProgram
        tokenProgramV0
        rent
        signer
        marketplace
        reward
        rewardMint
        rewardVault
      }
    }
    ... on RegisterBuyCnftEvent {
      info {
        systemProgram
        tokenProgramV0
        rent
        logWrapper
        bubblegumProgram
        compressionProgram
        tokenMetadataProgram
        signer
        seller
        marketplaceAuth
        marketplace
        product
        paymentMint
        productMint
        buyerTransferVault
        sellerTransferVault
        marketplaceTransferVault
        bountyVault
        sellerReward
        sellerRewardVault
        buyerReward
        buyerRewardVault
        metadata
        masterEdition
        treeAuthority
        merkleTree
        params {
          amount
          name
          symbol
          uri
        }
      }
    }
    ... on RegisterBuyCounterEvent {
      info {
        systemProgram
        tokenProgramV0
        rent
        signer
        seller
        marketplaceAuth
        marketplace
        product
        payment
        paymentMint
        buyerTransferVault
        sellerTransferVault
        marketplaceTransferVault
        bountyVault
        sellerReward
        sellerRewardVault
        buyerReward
        buyerRewardVault
        amount
      }
    }
    ... on RegisterBuyTokenEvent {
      info {
        systemProgram
        tokenProgramV0
        tokenProgram2022
        signer
        seller
        marketplaceAuth
        marketplace
        product
        productMint
        paymentMint
        buyerTokenVault
        buyerTransferVault
        sellerTransferVault
        marketplaceTransferVault
        bountyVault
        sellerReward
        sellerRewardVault
        buyerReward
        buyerRewardVault
        amount
      }
    }
    ... on RegisterBuyEvent {
      info {
        systemProgram
        tokenProgramV0
        rent
        signer
        seller
        marketplaceAuth
        marketplace
        product
        payment
        paymentMint
        buyerTransferVault
        sellerTransferVault
        marketplaceTransferVault
        bountyVault
        sellerReward
        sellerRewardVault
        buyerReward
        buyerRewardVault
        amount
      }
    }
    ... on RequestAccessEvent {
      info {
        systemProgram
        rent
        signer
        marketplace
        request
      }
    }
    ... on UpdateTreeEvent {
      info {
        payer
        signer
        marketplace
        product
        treeAuthority
        merkleTree
        logWrapper
        systemProgram
        bubblegumProgram
        compressionProgram
        params {
          maxDepth
          maxBufferSize
        }
      }
    }
    ... on WithdrawRewardEvent {
      info {
        tokenProgramV0
        signer
        marketplace
        reward
        rewardMint
        receiverVault
        rewardVault
      }
    }
  }
}

Full accounts query: 
{
  accounts {
    address
    type
    data {
      ...on Marketplace {
        authority
        tokenConfig {
          useCnfts
          deliverToken
          transferable
          chainCounter
        }
        permissionConfig {
          accessMint
          permissionless
        }
        feesConfig {
          discountMint
          fee
          feeReduction
          feePayer
        }
        rewardsConfig {
          rewardMint
          bountyVaults
          sellerReward
          buyerReward
          rewardsEnabled
        }
      }
      ...on Product {
        authority
        firstId
        secondId
        marketplace
        productMint
        merkleTree
        sellerConfig {
          paymentMint
          productPrice
        }
        bumps {
          bump
          mintBump
        }
      }
      ...on Reward {
        authority
        marketplace
        rewardVaults
        bumps {
          bump
          vaultBumps
        }
      }
      ...on Access {
        authority
        marketplace
        bump
      }
      ...on Payment {
        units
        bump
      }
    }
  }
}

{
  accountTimeSeriesStats(timeFrame:Month, account: "78uGjiznTqYG93bzHSjnLUn4gD31SKoFFTe4wos2fPTY", type: "access", blockchain: solana) {
    series {
      date
      value {
        ...on AccessTimeStats {
          accessesByProgramId
        }
      }
    }
  }
}

{
  accountStats(account: "78uGjiznTqYG93bzHSjnLUn4gD31SKoFFTe4wos2fPTY", blockchain: solana) {
    stats {
      last1h {
        accesses
      }
      last24h {
        accesses
      }
      last7d {
        accesses
      }
      total {
        accesses
      }
    }
  }
}

{
  accountState(account: "78uGjiznTqYG93bzHSjnLUn4gD31SKoFFTe4wos2fPTY", blockchain: solana, type: transaction) {
    accurate
    progress
    pending
    processed
  }
}

{
    globalStats {
        totalAccounts {
            Marketplace
            Product
          	Reward
            Access
            Payment
        }
        totalAccesses
        totalAccessesByProgramId
    }
}

