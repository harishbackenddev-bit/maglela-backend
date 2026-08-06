// config/payfast.config.ts
export interface PayFastConfig {
  mode: 'test' | 'live';
  merchantId: string;
  merchantKey: string;
  passphrase: string;
  paymentUrl: string;
  validateUrl: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
}

export const PAYFAST_CONFIG: PayFastConfig = {
  mode: 'test',
  merchantId: '10050879',
  merchantKey: 'y4jdud635c88g',
  // ⚠️ IMPORTANT: If you don't have a passphrase set in PayFast dashboard, 
  // keep it empty. If you do have one, set it here.
  passphrase: '',

  get paymentUrl(): string {
    return this.mode === 'live'
      ? 'https://www.payfast.co.za/eng/process'
      : 'https://sandbox.payfast.co.za/eng/process';
  },

  get validateUrl(): string {
    return this.mode === 'live'
      ? 'https://www.payfast.co.za/eng/query/validate'
      : 'https://sandbox.payfast.co.za/eng/query/validate';
  },

  // ✅ FIXED: Use environment variables with fallbacks
  returnUrl: process.env.PAYFAST_RETURN_URL || 'http://localhost:5173/ticket-success',
  cancelUrl: process.env.PAYFAST_CANCEL_URL || 'http://localhost:5173/payment-cancelled',

  // ✅ FIXED: For local development, use ngrok URL
  // Set this in .env: PAYFAST_NOTIFY_URL=https://your-ngrok-url.ngrok.io/api/payfast/notify
  notifyUrl: process.env.PAYFAST_NOTIFY_URL || 'http://localhost:5173/api/toolkit/payfast/notify',
};


// ============================================
// CREDIT PAYFAST CONFIGURATION
// ============================================

export const CREDIT_PAYFAST_CONFIG: PayFastConfig = {
  mode: (process.env.PAYFAST_MODE as "test" | "live") || "test",
  merchantId: process.env.PAYFAST_MERCHANT_ID || "10050879",
  merchantKey: process.env.PAYFAST_MERCHANT_KEY || "y4jdud635c88g",
  passphrase: process.env.PAYFAST_PASSPHRASE || "",

  get paymentUrl(): string {
    return this.mode === "live"
      ? "https://www.payfast.co.za/eng/process"
      : "https://sandbox.payfast.co.za/eng/process";
  },

  get validateUrl(): string {
    return this.mode === "live"
      ? "https://www.payfast.co.za/eng/query/validate"
      : "https://sandbox.payfast.co.za/eng/query/validate";
  },

  returnUrl: `${process.env.FRONTEND_URL}/user/credit-success`,
  cancelUrl: `${process.env.FRONTEND_URL}/user/credit-cancelled`,
  notifyUrl: `${process.env.BASE_URL}/api/user/credit/payfast/notify`,
};
