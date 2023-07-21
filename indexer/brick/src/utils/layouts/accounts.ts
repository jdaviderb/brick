import {
  bonusDiscriminator,
  bonusBeet,
  governanceDiscriminator,
  governanceBeet,
  productDiscriminator,
  productBeet,
} from './solita/index.js'

export enum AccountType {
  Bonus = 'Bonus',
  Governance = 'Governance',
  Product = 'Product',
}

export const ACCOUNT_DISCRIMINATOR: Record<AccountType, Buffer> = {
  [AccountType.Bonus]: Buffer.from(bonusDiscriminator),
  [AccountType.Governance]: Buffer.from(governanceDiscriminator),
  [AccountType.Product]: Buffer.from(productDiscriminator),
}

export const ACCOUNTS_DATA_LAYOUT: Record<AccountType, any> = {
  [AccountType.Bonus]: bonusBeet,
  [AccountType.Governance]: governanceBeet,
  [AccountType.Product]: productBeet,
}
