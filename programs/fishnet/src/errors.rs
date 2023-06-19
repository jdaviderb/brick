use anchor_lang::error_code;

#[error_code]
pub enum ErrorCode {
    #[msg("There are still users with active payments")]
    CannotCloseProduct,
    #[msg("You are providing a string that is too long")]
    StringTooLong,
    #[msg("Numerical Overflow happened")]
    NumericalOverflow,
    #[msg("You are setting a higher fee than allowed")]
    IncorrectFee,
    #[msg("You are providing a wrong app account")]
    InconrrectAppAccount,
    #[msg("You are providing a wrong creator vault")]
    InconrrectCreatorAccount,
    #[msg("You are trying to pay a different mint than the one stated by the seller")]
    IncorrectPaymentMint,
    #[msg("You are providing a wrong associated token account")]
    IncorrectATA,
    #[msg("You are not the authority")]
    IncorrectAuthority,
    #[msg("You are providing an incorrect mint")]
    IncorrectMint,
    #[msg("Given nonce is invalid")]
    IncorrectNonce,
    #[msg("Incorrect seeds")]
    IncorrectSeeds,
    #[msg("You are not allowed to create a governance account")]
    IncorrectGovernanceName,
    #[msg("You are providing a wrong token program")]
    IncorrectTokenProgram,
    #[msg("Failed to convert data")]
    ConversionError,
    #[msg("Transfer error")]
    TransferError,
    #[msg("Error during the mint_to CPI")]
    MintToError,
    #[msg("Error during the burn CPI")]
    BurnError,
    #[msg("Error during the close account CPI")]
    CloseAccountError,
}