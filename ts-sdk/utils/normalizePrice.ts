import BN from "bn.js";
import { decimalsFromPubkey } from "../constants";

export function normalizePrice(price: number, paymentMint: string): BN {
    const newPrice = price * Math.pow(10, decimalsFromPubkey[paymentMint]);
    return new BN(newPrice);
}