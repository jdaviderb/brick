use {
    anchor_lang::prelude::*,
    crate::errors::ErrorCode,
};

#[account]
pub struct Product {
    /// cant use 64 bytes seed, it is splitted to include the whole id in the mint pda, 
    /// the way we discriminate between our mints and others, is creating the mint as a pda
    pub first_id: [u8; 32], 
    pub second_id: [u8; 32],
    // app account created by this program, is useful to store to perform validations and use its data securely
    pub governance: Pubkey,
    // mint that represents a dataset
    pub product_mint: Pubkey,
    // seller that owns the dataset
    pub product_authority: Pubkey,
    pub seller_config: SellerConfig,
    pub bumps: Bumps,
}

#[derive(AnchorSerialize, AnchorDeserialize, Default, Clone)]
pub struct SellerConfig {
    // token which the user wants to receive as a payment
    pub payment_mint: Pubkey,
    // token amount
    pub product_price: u64,
    // usdc token amount equivalent
    pub usdc_price: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Default, Clone)]
pub struct Bumps {
    pub bump: u8,
    pub mint_bump: u8,
}

impl Product {
    pub const SIZE: usize = 8 // discriminator
        + 32 // first_id
        + 32 // second_id
        + 32 // app_pubkey
        + 32 // token_mint
        + 32 // authority
        // SellerConfig
        + 32 // payment_mint
        + 8  // token_price
        + 8  // usdc_price
        // Bumps
        + 1  // bump
        + 1; // mint_bump

    pub fn get_splitted_id(string: String) -> std::result::Result<([u8; 32], [u8; 32]), ErrorCode> {
        // The reason for creating a fixed-length byte array is to ensure that the resulting array always has a consistent size, 
        // regardless of the length of the original string. If the app_name string is shorter than 32 characters, the remaining 
        // bytes in the name_data array will be filled with whitespace characters.
        let bytes = string.as_bytes();
        if bytes.len() > 64 {
            return Err(ErrorCode::StringTooLong.into());
        }
        let mut data = [b' '; 64];
        data[..bytes.len()].copy_from_slice(bytes);
    
        let first_id = data[..32].try_into().map_err(|_| ErrorCode::ConversionError)?;
        let second_id = data[32..].try_into().map_err(|_| ErrorCode::ConversionError)?;
    
        return Ok((first_id, second_id));
    }
}