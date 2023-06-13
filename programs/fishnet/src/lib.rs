pub mod state;
pub mod errors;
pub mod utils;
mod instructions;
use {
    anchor_lang::prelude::*,
    instructions::*,
};

declare_id!("5Taf6ZN851FT8yMDnE3Z5XbevRKwKBCyi4BS6Cxsy6tJ");

#[program]
pub mod fishnet {
    use super::*;

    pub fn create_app(ctx: Context<CreateApp>, app_name: String, fee_basis_points: u16) -> Result<()> {
        create_app::handler(ctx, app_name, fee_basis_points)
    }

    pub fn create_config(
        ctx: Context<CreateConfig>,
        first_id: [u8; 32],
        second_id: [u8; 32],
        refund_timespan: u64,
        token_price: u64,
        exemplars: i32,
        bump: u8
    ) -> Result<()> {
        create_config::handler(
            ctx,
            first_id,
            second_id,
            refund_timespan,
            token_price,
            exemplars,
            bump
        )
    }

    pub fn create_mint(ctx: Context<CreateMint>) -> Result<()> {
        create_mint::handler(ctx)
    }    

    pub fn delete_product(ctx: Context<DeleteProduct>) -> Result<()> {
        delete_product::handler(ctx)
    }

    pub fn edit_fees(ctx: Context<EditFees>, fee_basis_points: u16) -> Result<()> {
        edit_fees::handler(ctx, fee_basis_points)
    }

    pub fn edit_price(ctx: Context<EditPrice>, token_price: u64) -> Result<()> {
        edit_price::handler(ctx, token_price)
    }
    
    pub fn register_buy(ctx: Context<RegisterBuy>, timestamp: u64) -> Result<()> {
        register_buy::handler(ctx, timestamp)
    }

    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        refund::handler(ctx)
    }

    pub fn withdraw_funds(ctx: Context<WithdrawFunds>) -> Result<()> {
        withdraw_funds::handler(ctx)
    }
}
