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

    pub fn create_governance(ctx: Context<CreateGovernance>, params: CreateGovernanceParams) -> Result<()> {
        create_governance::handler(ctx, params)
    }

    pub fn create_product(ctx: Context<CreateProduct>, params: CreateProductParams) -> Result<()> {
        create_product::handler(ctx, params)
    }

    pub fn delete_product(ctx: Context<DeleteProduct>) -> Result<()> {
        delete_product::handler(ctx)
    }

    pub fn edit_points(ctx: Context<EditPoints>, params: EditPointsParams) -> Result<()> {
        edit_points::handler(ctx, params)
    }

    pub fn edit_payment_mint(ctx: Context<EditPaymentMint>) -> Result<()> {
        edit_payment_mint::handler(ctx)
    }

    pub fn edit_price(ctx: Context<EditPrice>, product_price: u64) -> Result<()> {
        edit_price::handler(ctx, product_price)
    }

    pub fn init_bonus(ctx: Context<InitBonus>) -> Result<()> {
        init_bonus::handler(ctx)
    }
    
    pub fn register_buy(ctx: Context<RegisterBuy>) -> Result<()> {
        register_buy::handler(ctx)
    }

    pub fn register_promo_buy(ctx: Context<RegisterPromoBuy>) -> Result<()> {
        register_promo_buy::handler(ctx)
    }

    pub fn withdraw_bonus(ctx: Context<WithdrawBonus>) -> Result<()> {
        withdraw_bonus::handler(ctx)
    }
}
