use {
    anchor_lang::prelude::*,
    crate::errors::ErrorCode,
};

/// This account works as an product administrator
#[account]
pub struct Product {
    /// The seller's public key, who owns the product.
    pub authority: Pubkey,
    /// Identifier of the product, split across two arrays due to a limit on
    /// the maximum size of a seed component.
    pub first_id: [u8; 32], 
    pub second_id: [u8; 32],
    pub marketplace: Pubkey,
    /// Mint that represents the product. Owning this token implies having paid for the product.
    pub product_mint: Pubkey,
    /// Seller-defined product configurations.
    pub seller_config: SellerConfig,
    /// Seed bump parameters used for deterministic address derivation.
    pub bumps: ProductBumps,
}

#[derive(AnchorSerialize, AnchorDeserialize, Default, Clone)]
pub struct SellerConfig {
    /// The token the seller selects to receive as payment.
    pub payment_mint: Pubkey,
    /// The price of the product in terms of the payment token.
    pub product_price: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Default, Clone)]
pub struct ProductBumps {
    pub bump: u8,
    pub mint_bump: u8,
}

impl Product {
    pub const SIZE: usize = 8 // discriminator
        + 32 // authority
        + 32 // first_id
        + 32 // second_id
        + 32 // marketplace
        + 32 // product_mint
        // SellerConfig
        + 32 // payment_mint
        + 8  // product_price
        // ProductBumps
        + 1  // product_bump
        + 1; // mint_bump

    /// Splits a string into two parts for use as identifiers.
    pub fn split_id_string(id_string: String) -> std::result::Result<([u8; 32], [u8; 32]), ErrorCode> {
        let bytes = id_string.as_bytes();
        if bytes.len() > 64 {
            return Err(ErrorCode::StringTooLong.into());
        }
        let mut data = [b' '; 64];
        data[..bytes.len()].copy_from_slice(bytes);
    
        let first_id_part = data[..32].try_into().map_err(|_| ErrorCode::ConversionError)?;
        let second_id_part = data[32..].try_into().map_err(|_| ErrorCode::ConversionError)?;
    
        return Ok((first_id_part, second_id_part));
    }
}