use {
    crate::state::*,
    anchor_lang::{
        prelude::*,
        system_program::System,
    },
    anchor_spl::token_interface:: Mint,
};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CreateProductParams {
    pub first_id: [u8; 32],
    pub second_id: [u8; 32],
    pub product_price: u64,
}

#[derive(Accounts)]
#[instruction(params: CreateProductParams)]
pub struct CreateProduct<'info> {
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    #[account(mut)]
    pub product_authority: Signer<'info>,
    #[account(
        seeds = [
            b"governance".as_ref(),
            governance.governance_name.as_ref()
        ],
        bump = governance.bump,
    )]
    pub governance: Account<'info, Governance>,
    #[account(
        init,
        payer = product_authority,
        space = Product::SIZE,
        seeds = [
            b"product".as_ref(),
            params.first_id.as_ref(),
            params.second_id.as_ref(),        
        ],
        bump,
    )]
    pub product: Box<Account<'info, Product>>,
    pub payment_mint: Box<InterfaceAccount<'info, Mint>>,
}

pub fn handler<'info>(ctx: Context<CreateProduct>, params: CreateProductParams) -> Result<()> {
    (*ctx.accounts.product).first_id = params.first_id;
    (*ctx.accounts.product).second_id = params.second_id;
    (*ctx.accounts.product).product_authority = ctx.accounts.product_authority.key();
    (*ctx.accounts.product).seller_config = SellerConfig {
        payment_mint: ctx.accounts.payment_mint.key(),
        product_price: params.product_price,
    };
    (*ctx.accounts.product).bump = *ctx.bumps.get("product").unwrap();

    Ok(())
}
