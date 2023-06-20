use {
    anchor_lang::prelude::*,
    crate::errors::ErrorCode,
    crate::instructions::{CreateGovernanceParams, EditPointsParams},
};

#[account]
pub struct Governance {
    // Limited to 32 bytes
    pub governance_name: [u8; 7],
    // Only this auth can change this account data (by calling instructions)
    pub governance_authority: Pubkey,
    // FNET mint
    pub governance_mint: Pubkey,
    // The authority of this vault is the app pda, where the FNET tokens are stored to be able to use them in the contract,
    // before the promo time, this vault has to receive the tokens that are going to be used during the promo
    pub governance_token_vault: Pubkey,
    // Percentage charged for a transaction by the app, a value of 250 corresponds to a fee of 2,5%
    pub fee_reduction: u16, 
    // Percentage reduced if the seller decides to recive the governance token as a payment
    pub fee: u16, 
    // Percentage that the seller receives extra of FNET on the sale, 0 represents there is not an active offer
    pub seller_promo: u16,
    // Percentage that the seller receives extra of FNET on the sale, 0 represents there is not an active offer
    pub buyer_promo: u16,
    pub bump: u8,
    pub vault_bump: u8,
}

impl Governance {
    pub const SIZE: usize = 8 // discriminator
        + 7   // governance_name
        + 32  // governance_authority
        + 32  // governance_mint
        + 32  // governance_token_vault
        + 2   // fee_basis_points
        + 2   // fee_reduction_basis_points
        + 2   // promotion_basis_points
        + 2   // promotion_basis_points
        + 1   // bump
        + 1;  // vault_bump


    pub fn validate_params(params: CreateGovernanceParams) -> std::result::Result<(), ErrorCode> {
        let fishnet_ascii = [70, 105, 115, 104, 110, 101, 116];
        if params.governance_name != fishnet_ascii {
            Err(ErrorCode::IncorrectGovernanceName)
        } else {
            let edit_points_params = EditPointsParams {
                fee_reduction: params.fee_reduction,
                fee: params.fee,
                seller_promo: params.seller_promo,
                buyer_promo: params.buyer_promo,
            };
    
            Self::validate_basis_points(edit_points_params)
        }
    }

    pub fn validate_basis_points(params: EditPointsParams) -> std::result::Result<(), ErrorCode> {
        if params.fee_reduction > 10000 || params.fee > 10000 || params.seller_promo > 10000 || params.buyer_promo > 10000 {
            Err(ErrorCode::IncorrectFee)
        } else {
            Ok(())
        }
    }

    pub fn is_active_promo(governance: &Governance, payment_mint: &Pubkey) -> bool {
        governance.buyer_promo > 0 
        && governance.seller_promo > 0 
        && *payment_mint == governance.governance_mint
    }    
}