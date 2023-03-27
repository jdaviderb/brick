import { PublicKey } from "@solana/web3.js"

export const BRICK_PROGRAM_ID = 'BrickarF2QeREBZsapbhgYPHJi5FYkJVnx7mZhxETCt5'
export const BRICK_PROGRAM_ID_PK = new PublicKey(BRICK_PROGRAM_ID)

export const METADATA_PROGRAM_ID = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
export const METADATA_PROGRAM_ID_PK = new PublicKey(METADATA_PROGRAM_ID)

export const symbolFromMint: Record<string, string> = {
    'So11111111111111111111111111111111111111112': 'SOL',
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
    'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': 'MSOL',
    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK',
}
export const mintFromSymbol: Record<string, string> = {
    'SOL': 'So11111111111111111111111111111111111111112',
    'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    'MSOL': 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
    'BONK': 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
}
export const decimalsFromPubkey: Record<string, number> = {
    'So11111111111111111111111111111111111111112': 9,
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 6,
    'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': 9,
    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 5,
}

export const withdrawComputeUnits = 4645 + 4645 + 3015 // compute of the two transfers (seller + app creator) + close payment account

export const RESPONSIVE_SWIPER = {
    // when window width is <= 300px
    400: {
        slidesPerView: 1,
    },
    600: {
        slidesPerView: 2,
    },
    800: {
        slidesPerView: 3,
    },
    1000: {
        slidesPerView: 4,
    },
    1200: {
        slidesPerView: 5,
    }
}