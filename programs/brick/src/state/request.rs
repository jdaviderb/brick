use anchor_lang::prelude::*;

#[account]
pub struct Request {
    /// The public key of the account having authority over the reward PDA.
    pub authority: Pubkey,
    /// The marketplace address, stored to derive reward pda in the context.
    pub marketplace: Pubkey,
    pub bump: u8,
}

impl Request {
    pub const SIZE: usize = 8 // discriminator
        + 32  // authority
        + 32  // marketplace
        + 1;  // bump
}
