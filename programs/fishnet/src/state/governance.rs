use {
    anchor_lang::prelude::*,
    crate::errors::ErrorCode,
    crate::instructions::{CreateGovernanceParams, EditPointsParams}
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
    // This vault receive the USDC (ATA of authority, the wallet that manages this account receives the tokens)
    pub governance_usdc_vault: Pubkey,
    // Percentage charged for a transaction by the app, a value of 250 corresponds to a fee of 2,5%
    pub fee_basis_points: u16, 
    // Percentage reduced if the seller decides to recive the governance token as a payment
    pub fee_reduction_basis_points: u16, 
    // Percentage that the seller receives extra of FNET on the sale, 0 represents there is not an active offer
    pub promotion_basis_points: u16,
    pub bump: u8,
}

impl Governance {
    pub const SIZE: usize = 8 // discriminator
        + 7   // governance_name
        + 32  // governance_authority
        + 32  // governance_mint
        + 32  // governance_token_vault
        + 32  // governance_usdc_vault
        + 2   // fee_basis_points
        + 2   // fee_reduction_basis_points
        + 2   // promotion_basis_points
        + 1;  // bump

    pub fn validate_account(params: CreateGovernanceParams) -> std::result::Result<(), ErrorCode> {
        let fishnet_ascii = [70, 105, 115, 104, 110, 101, 116];
        if params.governance_name != fishnet_ascii {
            Err(ErrorCode::IncorrectGovernanceName)
        } else {
            let edit_points_params = EditPointsParams {
                fee_basis_points: params.fee_basis_points,
                fee_reduction_basis_points: params.fee_reduction_basis_points,
                promotion_basis_points: params.promotion_basis_points,
            };
    
            Self::validate_basis_points(edit_points_params)
        }
    }        

    pub fn validate_basis_points(params: EditPointsParams) -> std::result::Result<(), ErrorCode> {
        if params.fee_basis_points > 10000 || params.fee_reduction_basis_points > 10000 || params.promotion_basis_points > 10000 {
            Err(ErrorCode::IncorrectFee)
        } else {
            Ok(())
        }
    }
    
}