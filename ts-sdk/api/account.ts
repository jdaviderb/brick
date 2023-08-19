import { BrickAccountInfo, AccountType } from '../types';

export type AccountsFilters = {
    types?: AccountType[]
    accounts?: string[]
    authorities?: string[]
    includeStats?: boolean
}

export async function queryAccounts(url: string, filters: AccountsFilters): Promise<BrickAccountInfo[]> {
    let queryArgs = '';
    if (filters.types) queryArgs += `types: [${filters.types.map(type => `"${type}"`).join(',')}], `;
    if (filters.accounts) queryArgs += `signer: "${filters.accounts}", `;
    if (filters.authorities) queryArgs += `startDate: ${filters.authorities}, `;
    if (filters.includeStats) queryArgs += `endDate: ${filters.includeStats}, `;

    const query = `
        query {
            accounts(${queryArgs}) {
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
    return responseBody.data.accounts;
}