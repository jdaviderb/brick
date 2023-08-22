# Brick Protocol

Note: Brick **is subject to change**, is in active development. This code is unaudited. Use at your own risk.

[Introduction and demo](https://youtu.be/68g5d9NQb_8)
[Gitbook](https://brick-protocol.gitbook.io/docs/)


## Overview

Brick is a payment gateway built on the Solana blockchain, facilitating the seamless creation and management of marketplaces to effectively monetize a wide array of products and services.

## Marketplace customization

Marketplace creators have the freedom to customize their platforms based on their specific requirements. 

The following customizable features are available:
  
- **Permissionless Access**: Marketplaces can opt for a permissionless model, allowing anyone to sell on the platform without the need for verification like KYC. Alternatively, a token gate or KYC process can be implemented for controlled access.

- **Rewards or Cashback**: Marketplaces can incentivize users by offering rewards or cashback for their purchases on the platform, enhancing user engagement and loyalty.

- **Transaction Fees**: The marketplace has the flexibility to set transaction fees for facilitating transactions between buyers and sellers. This allows marketplaces to generate revenue from the platform operations.
  
- **Secondary Market Support**: Marketplaces can decide whether products or services can be resold, thereby creating a secondary market for items. When users register a purchase, a fungible token is minted to the user, granting them access to the specific product or service.

- **Metadata Support**: Tokens within the marketplace can be enriched with multimedia representations such as images and videos. This feature is particularly useful for video game marketplaces where tokens can represent in-game items like skins, covers, etc.

## Components of this monorepo:
- **Indexer**: Based on the [Aleph Indexer Framework](https://github.com/aleph-im/aleph-indexer-framework), [Readme](https://github.com/ricardocr987/brick/blob/master/indexer/brick/README.md)
- **Solana program**: Core piece of the protocol, [Readme](https://brick-protocol.gitbook.io/docs/fundamentals/solana-program)
- **Transaction builder server**: It allows you to serve to the client prepared serialized transactions
- **Typescript sdk**: Helps you to build the transactions and also to query from the indexer
- **App**: The brick app built by [Stefan](https://twitter.com/evalucratie)
