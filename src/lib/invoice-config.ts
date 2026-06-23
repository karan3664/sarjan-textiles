/** Seller bank + UPI details for tax invoices (Bank of India, Madhapar). */
export const INVOICE_BANK = {
  accountName: "SARJAN TEXTILES",
  bankName: "Bank of India",
  branch: "Madhapar",
  accountNumber: "381630150000003",
  ifsc: "BKID0003816",
  accountType: "Current Account",
  upiId: "boim-381681000003@boi",
} as const;

/** Default HSN for apparel / textiles when product has no HSN field. */
export const DEFAULT_TEXTILE_HSN = "62031990";

export const SELLER_STATE = "Gujarat";
export const SELLER_STATE_CODE = "24";
