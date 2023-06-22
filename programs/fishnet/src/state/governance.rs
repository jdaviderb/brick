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
    pub governance_bonus_vault: Pubkey,
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
        + 32  // governance_bonus_vault
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

    /// This function calculates the distribution of the token amount taking into account the fee and a potential fee reduction.
    /// The fee is adjusted in case the payment mint is the same as the governance mint.
    /// 
    /// # Arguments
    /// 
    /// * `fee` - The initial fee for the transaction.
    /// * `fee_reduction` - The reduction to apply to the fee in case the payment mint is the governance mint.
    /// * `governance_mint` - The mint associated with the governance.
    /// * `payment_mint` - The mint associated with the payment.
    /// * `product_price` - The price of the product being sold.
    /// 
    /// # Returns
    /// 
    /// A Result with a tuple containing the total fee and the seller amount, or an ErrorCode.
    pub fn calculate_transfer_distribution(
        fee: u16,
        fee_reduction: u16, 
        governance_mint: Pubkey,
        payment_mint: Pubkey, 
        product_price: u64
    ) -> std::result::Result<(u64, u64), ErrorCode> {
        // Adjust fee if the payment mint is the same as the governance mint
        let adjusted_fee_basis_points: u16 = if payment_mint == governance_mint {
            fee.saturating_sub(fee_reduction)
        } else {
            fee
        };
    
        // Compute the total fee
        let total_fee = (adjusted_fee_basis_points as u128)
            .checked_mul(product_price as u128)
            .ok_or(ErrorCode::NumericalOverflow)?
            .checked_div(10000)
            .ok_or(ErrorCode::NumericalOverflow)? as u64;
    
        // Compute the amount that goes to the seller
        let seller_amount = (product_price as u64)
            .checked_sub(total_fee)
            .ok_or(ErrorCode::NumericalOverflow)? as u64;
    
        Ok((total_fee, seller_amount))
    }
}