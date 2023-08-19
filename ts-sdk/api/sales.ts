import { BrickEvent } from "../types"

export type SalesFilters = {
    seller: string
    startDate?: number
    endDate?: number
    limit?: number
    skip?: number
    reverse?: boolean
}

export async function querySales(url: string, filters: SalesFilters): Promise<BrickEvent[]> {
    let queryArgs = `seller: "${filters.seller}", `;
    if (filters.startDate) queryArgs += `startDate: ${filters.startDate}, `;
    if (filters.endDate) queryArgs += `endDate: ${filters.endDate}, `;
    if (filters.limit) queryArgs += `limit: ${filters.limit}, `;
    if (filters.skip) queryArgs += `skip: ${filters.skip}, `;
    if (filters.reverse) queryArgs += `reverse: ${filters.reverse}, `;

    const query = `
        query {
            sales(${queryArgs}) {
                id
                timestamp
                type
                account
                signer
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
    return responseBody.data.sales;
}