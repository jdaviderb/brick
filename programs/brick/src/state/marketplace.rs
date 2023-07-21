use {
    anchor_lang::prelude::*,
    crate::errors::ErrorCode,
};

/// This account represents a marketplace with associated transaction fees and reward configurations.
/// The account is controlled by an authority that can modify the fee and reward configurations.
#[account]
pub struct Marketplace {
    /// The authorized entity that can modify this account data.
    pub authority: Pubkey,
    /// Set of fees that can be modified by the authority.
    pub fees_config: FeesConfig,
    /// Set of rewards that can be modified by the authority.
    pub rewards_config: RewardsConfig,
    /// Seed bump parameters used for deterministic address derivation.
    pub bumps: MarketplaceBumps,
}

/// Marketplace fees related to transactions.
#[derive(AnchorSerialize, AnchorDeserialize, Default, Clone)]
pub struct FeesConfig {
    /// Marketplaces can set a mint. Sellers opting to receive this mint as payment
    /// will have their marketplace fee reduced. This could be a governance token, for instance.
    pub discount_mint: Pubkey,
    /// The transaction fee percentage levied by the app or marketplace.
    /// For example, a value of 250 corresponds to a fee of 2.5%.
    pub fee: u16,
    /// Fee reduction percentage applied if the seller chooses to receive a specific token as payment.
    pub fee_reduction: u16, 
}

/// Rewards configuration associated with sales.
/// 1. marketplace auth init_market (with one bounty_vault)
/// 2. if a marketplace wants to change the reward mint, needs to call init_bounty_vault
/// 3. marketplace auth transfers manually the bounty tokens
/// 4. user sells / buys during promo by marketplace, sends some tokens to the reward_vault of both seller and buyer
/// these vaults are controlled by marketplace pda
/// 5. when promotion is ended the user can withdraw the rewards
#[derive(AnchorSerialize, AnchorDeserialize, Default, Clone)]
pub struct RewardsConfig {
    /// The address of the mint currently used for rewards.
    pub reward_mint: Pubkey,
    /// Vault where reward tokens are stored.
    /// These vaults are managed by this marketplace PDA.
    /// Tokens used during the promotional period should be deposited here.
    pub bounty_vaults: Vec<Pubkey>,
    /// The transaction volume percentage that the seller receives as a reward on a sale.
    /// A value of 250 corresponds to a reward of 2.5% of the transaction volume.
    /// A value of 0 indicates that there is no active rewards for the seller.
    pub seller_reward: u16,
    /// The transaction volume percentage that the buyer receives as a reward on a sale.
    pub buyer_reward: u16,
    /// This flag enables or disables the reward system.
    /// When false, the reward system is inactive regardless of the reward_trigger_mint value.
    pub rewards_enabled: bool,
    /// If set, the marketplace will only give rewards if the payment is made with this specific mint.
    /// To enable rewards irrespective of payment mint, set this value to SystemProgramID.
    pub reward_trigger_mint: Pubkey,
}

/// Bump seed parameters used for deterministic address derivation.
#[derive(AnchorSerialize, AnchorDeserialize, Default, Clone)]
pub struct MarketplaceBumps {
    pub bump: u8,
    pub vault_bumps: Vec<u8>,
}

impl Marketplace {
    pub const VAULT_COUNT: usize = 5;
    pub const SIZE: usize = 8 // discriminator
        + 32  // authority
        // FeesConfig
        + 32  // discount_mint
        + 2   // fee
        + 2   // fee_reduction
        // RewardsConfig
        + 32  // reward_mint
        + 32  // bounty_vaults
        * Self::VAULT_COUNT
        + 2   // seller_reward
        + 2   // buyer_reward
        + 1   // rewards_enabled
        + 32  // reward_trigger_mint
        // MarketplaceBumps
        + 1   // bump
        + 1   // vault_bumps
        * Self::VAULT_COUNT;

    /// Checks if marketplace reward system is active, is active when:
    /// If rewardTriggerMint == null_mint && rewardsEnabled == false -> NO REWARDS
    /// If rewardTriggerMint == null_mint && rewardsEnabled == true -> REWARDS (regardless of the payment mint)
    /// If rewardTriggerMint == mint && rewardsEnabled == true -> REWARDS only with specific rewardTriggerMint
    pub fn is_rewards_active(reward_config: &RewardsConfig, payment_mint: &Pubkey, program_id: &Pubkey) -> bool {
        let null_seeds = &[b"null".as_ref()];
        let account_address = Pubkey::find_program_address(null_seeds, program_id);

        reward_config.rewards_enabled 
            && (*payment_mint == reward_config.reward_trigger_mint || reward_config.reward_trigger_mint == account_address.0)
    }

    /// Calculates the distribution of the token amount, considering transaction fee and potential fee reduction.
    /// Adjusts the fee if the payment mint is the same as the reward mint.
    pub fn calculate_transfer_distribution(
        fees: FeesConfig,
        payment_mint: Pubkey, 
        product_price: u64
    ) -> std::result::Result<(u64, u64), ErrorCode> {
        // Adjust fee if the payment mint is the same as the reducer mint
        let adjusted_fee_basis_points: u16 = if payment_mint == fees.discount_mint {
            fees.fee.saturating_sub(fees.fee_reduction)
        } else {
            fees.fee
        };
    
        // Compute the total fee
        let total_fee = (adjusted_fee_basis_points as u128)
            .checked_mul(product_price as u128)
            .ok_or(ErrorCode::NumericalOverflow)?
            .checked_div(10000)
            .ok_or(ErrorCode::NumericalOverflow)? as u64;
    
        // Compute the amount that goes to the seller
        let seller_amount = product_price
            .checked_sub(total_fee)
            .ok_or(ErrorCode::NumericalOverflow)?;
    
        Ok((total_fee, seller_amount))
    }

    pub fn get_bump(address: Pubkey, bumps: MarketplaceBumps, bounty_vaults: Vec<Pubkey>) -> u8 {
        bounty_vaults.iter().position(|&r| r == address)
            .map(|index| bumps.vault_bumps[index])
            .unwrap_or(0)
    }
}