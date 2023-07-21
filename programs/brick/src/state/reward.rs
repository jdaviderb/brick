use anchor_lang::prelude::*;

#[account]
pub struct Reward {
    /// The public key of the account having authority over the reward PDA.
    pub authority: Pubkey,
    /// The marketplace address, stored to derive reward pda in the context.
    pub marketplace: Pubkey,
    /// Vault where tokens are stored until promotion is ended, when the user can withdraw.
    /// reward_mint is stored in marketplace account.
    /// It is allowed to create 5 vaults with different mints. In init_reward one is created, 
    /// if you want to change the mint reward for your users you need to call edit_market_place_info and init_bounty
    pub reward_vaults: Vec<Pubkey>,
    /// Seed bump parameter used for deterministic address derivation in case of the Reward account.
    pub bumps: RewardBumps,
}

#[derive(AnchorSerialize, AnchorDeserialize, Default, Clone)]
pub struct RewardBumps {
    pub bump: u8,
    pub vault_bumps: Vec<u8>,
}

impl Reward {
    pub const VAULT_COUNT: usize = 5;
    pub const SIZE: usize = 8 // discriminator
        + 32  // authority
        + 32  // marketplace
        + 32  // reward_vaults
        * Self::VAULT_COUNT
        + 1   // bump
        + 1   // vault_bumps
        * Self::VAULT_COUNT;

    pub fn get_bump(address: Pubkey, reward_bumps: RewardBumps, reward_vaults: Vec<Pubkey>) -> u8 {
        reward_vaults.iter().position(|&r| r == address)
            .map(|index| reward_bumps.vault_bumps[index])
            .unwrap_or(0)
    }
}
