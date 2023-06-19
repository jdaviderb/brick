pub mod state;
pub mod errors;
mod instructions;
use {
    anchor_lang::prelude::*,
    instructions::*,
};

declare_id!("5Taf6ZN851FT8yMDnE3Z5XbevRKwKBCyi4BS6Cxsy6tJ");

#[program]
pub mod fishnet {
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
    
    pub fn register_buy(ctx: Context<RegisterBuy>) -> Result<()> {
        register_buy::handler(ctx)
    }
}
