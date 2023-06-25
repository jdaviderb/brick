use anchor_lang::prelude::*;

#[account]
pub struct Bonus {
    pub authority: Pubkey,
    pub bump: u8,
    pub vault_bump: u8,
}

impl Bonus {
    pub const SIZE: usize = 8 // discriminator
        + 32  // authority
        + 8  //amount
        + 1   // bump
        + 1;  // vault_bump
}