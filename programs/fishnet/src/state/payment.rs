use anchor_lang::prelude::*;

#[account]
pub struct Payment {
    pub token_mint: Pubkey,
    pub paid_mint: Pubkey,
    pub seller: Pubkey,
    pub buyer: Pubkey,
    pub token_price: u64,
    pub payment_timestamp: u64,
    pub refund_consumed_at: u64,
    pub bump: u8,
    pub bump_vault: u8,
}

impl Payment {
    pub const SIZE: usize = 8 + 32 + 32 + 32 + 32 + 32 + 8 + 8 + 1 + 1;
}