use {
    crate::state::*,
    anchor_lang::prelude::*,
};

#[derive(Accounts)]
pub struct InitRequest<'info> {
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        mut,
        seeds = [
            b"marketplace".as_ref(),
            marketplace.authority.as_ref(),
        ],
        bump = marketplace.bumps.bump,
    )]
    pub marketplace: Box<Account<'info, Marketplace>>,
    #[account(
        init,
        payer = signer,
        space = Request::SIZE,
        seeds = [
            b"request".as_ref(),
            signer.key().as_ref(),
            marketplace.key().as_ref(),
        ],
        bump,
    )]
    pub request: Account<'info, Request>,
}

pub fn handler<'info>(ctx: Context<InitRequest>) -> Result<()> {
    (*ctx.accounts.request).authority = ctx.accounts.signer.key();
    (*ctx.accounts.request).marketplace =  ctx.accounts.marketplace.key();
    (*ctx.accounts.request).bump = *ctx.bumps.get("request").unwrap();
    
    Ok(())
}
