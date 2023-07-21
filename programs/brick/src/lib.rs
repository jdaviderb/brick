pub mod state;
pub mod errors;
mod instructions;
use {
    anchor_lang::prelude::*,
    instructions::*,
};

declare_id!("brick5DMMWvdRZQU9tsnyeHBNsY9hbyH2NhFRH1wjkB");

#[program]
pub mod brick {
    use super::*;

    /// seller can edit payment_mint and product_price
    pub fn edit_product_info(ctx: Context<EditProductInfo>, product_price: u64) -> Result<()> {
        edit_product_info::handler(ctx, product_price)
    }

    /// marketplace authority can edit fees and rewards configs
    pub fn edit_marketplace_info(ctx: Context<EditMarketplaceInfo>, params: EditMarketplaceInfoParams) -> Result<()> {
        edit_marketplace_info::handler(ctx, params)
    }

    /// marketplace auth can create multiple bounty vaults (different mints)
    pub fn init_bounty_vault(ctx: Context<InitBountyVault>) -> Result<()> {
        init_bounty_vault::handler(ctx)
    }

    /// recommeded to read the Marketplace state code to understand the meaning of this data structure 
    pub fn init_marketplace(ctx: Context<InitMarketplace>, params: InitMarketplaceParams) -> Result<()> {
        init_marketplace::handler(ctx, params)
    }

    /// recommeded to read the Product state code to understand the meaning of this data structure 
    pub fn init_product(ctx: Context<InitProduct>, params: InitProductParams) -> Result<()> {
        init_product::handler(ctx, params)
    }

    /// if a marketplace wants to change the reward mint, sellers and buyers have to create a new vault
    /// because there is only one PDA, reward is the authority of these vaults
    pub fn init_reward_vault(ctx: Context<InitRewardVault>) -> Result<()> {
        init_reward_vault::handler(ctx)
    }
    
    pub fn init_reward(ctx: Context<InitReward>) -> Result<()> {
        init_reward::handler(ctx)
    }
    
    /// manages the transfers (buyer -> seller and fees to marketplace authority) 
    /// and buyers receive a token as a proof of payment (each product has its own tokenc)
    pub fn register_buy(ctx: Context<RegisterBuy>) -> Result<()> {
        register_buy::handler(ctx)
    }

    /// register_buy + sellers and buyers can receive token rewards for interacting with the smart contract 
    pub fn register_reward_buy(ctx: Context<RegisterRewardBuy>) -> Result<()> {
        register_reward_buy::handler(ctx)
    }

    /// when promotion is ended users can withdraw the funds stored in the vaults and managed by the reward PFA
    pub fn withdraw_reward(ctx: Context<WithdrawReward>) -> Result<()> {
        withdraw_reward::handler(ctx)
    }
}
