use anchor_lang::prelude::*;

#[account]
pub struct TokenConfig {
    pub first_id: [u8; 32],
    pub second_id: [u8; 32],
    pub app_pubkey: Pubkey, // to be able to access to the app creator pubkey to send fees
    pub token_mint: Pubkey,
    pub authority: Pubkey,
    pub active_payments: u32, // counter not to close the mint account if there are active payments
    pub seller_config: SellerConfig,
    pub bumps: Bumps,
}

#[derive(AnchorSerialize, AnchorDeserialize, Default, Clone)]
pub struct SellerConfig {
    pub payment_mint: Pubkey,
    pub token_price: u64,
    pub refund_timespan: u64, // time given to buyer to get a refund
    pub exemplars: i32, // -1 means unlimited sale
}

#[derive(AnchorSerialize, AnchorDeserialize, Default, Clone)]
pub struct Bumps {
    pub bump: u8,
    pub mint_bump: u8,
}

impl TokenConfig {
    pub const SIZE: usize = 8 + 32 + 32 + 32 + 32 + 32 + 4 + SellerConfig::SIZE + Bumps::SIZE;
}

impl SellerConfig {
    pub const SIZE: usize = 32 + 8 + 8 + 4;
}

impl Bumps {
    pub const SIZE: usize = 1 + 1 + 1;
}
