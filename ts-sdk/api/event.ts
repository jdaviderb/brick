import { BrickEvent, InstructionType } from "../types"

export type EventsFilters = {
    account: string
    types?: InstructionType[]
    signer?: string
    startDate?: number
    endDate?: number
    limit?: number
    skip?: number
    reverse?: boolean
}

export async function queryEvents(url: string, filters: EventsFilters): Promise<BrickEvent[]> {
    let queryArgs = `account: "${filters.account}", `;
    if (filters.types) queryArgs += `types: [${filters.types.map(type => `"${type}"`).join(',')}], `;
    if (filters.signer) queryArgs += `signer: "${filters.signer}", `;
    if (filters.startDate) queryArgs += `startDate: ${filters.startDate}, `;
    if (filters.endDate) queryArgs += `endDate: ${filters.endDate}, `;
    if (filters.limit) queryArgs += `limit: ${filters.limit}, `;
    if (filters.skip) queryArgs += `skip: ${filters.skip}, `;
    if (filters.reverse) queryArgs += `reverse: ${filters.reverse}, `;

    const query = `
        query {
            events(${queryArgs}) {
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
    `;
    const response = await fetch(url + '/graphql', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ query }),
    });

    if (!response.ok) {
        throw new Error(`GraphQL request failed with status ${response.status}`);
    }

    const responseBody = await response.json();
    return responseBody.data.events;
}