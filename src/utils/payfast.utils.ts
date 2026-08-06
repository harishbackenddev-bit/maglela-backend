// utils/payfast.utils.ts
import crypto from 'crypto';
import { PAYFAST_CONFIG, CREDIT_PAYFAST_CONFIG } from '../config/payfast.config';

// ============================================
// PAYFAST SIGNATURE GENERATION - FIXED
// ============================================

/**
 * For ITN signature validation, PayFast expects:
 * 1. Fields in the SAME ORDER they were posted (NOT alphabetical)
 * 2. URL encoding with '+' for spaces (PHP urlencode() style, NOT %20)
 * 3. All fields except 'signature' (including empty ones)
 *
 * For checkout/onsite signature, PayFast uses a specific field order
 * (CHECKOUT_SIGNATURE_FIELD_ORDER), also with '+' encoding, and empty
 * fields are omitted entirely.
 *
 * Source: https://developers.payfast.co.za/docs#step_2_signature
 */
export const CHECKOUT_SIGNATURE_FIELD_ORDER = [
  'merchant_id', 'merchant_key', 'return_url', 'cancel_url', 'notify_url',
  'name_first', 'name_last', 'email_address', 'cell_number',
  'm_payment_id', 'amount', 'item_name', 'item_description',
  'custom_int1', 'custom_int2', 'custom_int3', 'custom_int4', 'custom_int5',
  'custom_str1', 'custom_str2', 'custom_str3', 'custom_str4', 'custom_str5',
  'email_confirmation', 'confirmation_address',
  'payment_method',
  'subscription_type', 'billing_date', 'recurring_amount', 'frequency', 'cycles',
];

/**
 * URL encode to match PayFast's expected format (PHP urlencode() style):
 * spaces become '+', not '%20'. Used for BOTH checkout and ITN signing —
 * the only real difference between the two is field ORDER, not encoding.
 */
const pfEncode = (value: string): string => {
  return encodeURIComponent(value).replace(/%20/g, '+');
};

/**
 * Generate MD5 signature for PayFast.
 *
 * @param data - The payment / ITN data to sign
 * @param fieldOrder - Optional explicit field order (checkout only)
 * @param isITN - If true, preserves as-received field order and includes
 *                empty values (matches how PayFast itself signs ITN posts).
 *                If false (checkout), empty fields are stripped and the
 *                explicit fieldOrder is used.
 */
export const generateSignature = (
  data: Record<string, any>,
  fieldOrder?: string[],
  isITN: boolean = false
): string => {
  // Determine which keys are valid for signing
  let validKeys: string[];

  if (isITN) {
    // ✅ For ITN: include ALL fields (even empty ones) - PayFast includes them
    validKeys = Object.keys(data).filter(key => key !== 'signature');
  } else {
    // ✅ For checkout: filter out empty values
    validKeys = Object.keys(data).filter(
      key =>
        key !== 'signature' &&
        data[key] !== '' &&
        data[key] !== null &&
        data[key] !== undefined
    );
  }

  // Determine key ORDER
  let orderedKeys: string[];
  if (isITN) {
    // ✅ ITN uses the field order AS RECEIVED from PayFast — NOT alphabetical.
    // This relies on Object.keys(data) preserving insertion/POST order,
    // which holds for plain JS objects with string keys.
    orderedKeys = validKeys;
  } else if (fieldOrder) {
    // ✅ Checkout uses the specific PayFast field order
    orderedKeys = [
      ...fieldOrder.filter(key => validKeys.includes(key)),
      ...validKeys.filter(key => !fieldOrder.includes(key)),
    ];
  } else {
    orderedKeys = validKeys;
  }

  let pfOutput = '';
  for (const key of orderedKeys) {
    const value = data[key];
    // Include empty values as empty string (matters for ITN)
    const stringValue = value !== undefined && value !== null ? String(value).trim() : '';

    if (pfOutput !== '') {
      pfOutput += '&';
    }
    pfOutput += `${key}=${pfEncode(stringValue)}`;
  }

  // Add passphrase if set
  if (PAYFAST_CONFIG.passphrase) {
    pfOutput += `&passphrase=${pfEncode(PAYFAST_CONFIG.passphrase)}`;
  }

  // Generate MD5 signature
  return crypto.createHash('md5').update(pfOutput).digest('hex');
};

/**
 * Generate signature for ITN validation (as-received field order + '+' encoding)
 * from an already-parsed object. Prefer generateITNSignatureFromRaw when the
 * raw POST body is available — it removes any risk of order/encoding drift
 * introduced by parsing and reconstructing the object.
 */
export const generateITNSignature = (data: Record<string, any>): string => {
  return generateSignature(data, undefined, true);
};

/**
 * Generate signature for ITN validation directly from the RAW
 * application/x-www-form-urlencoded request body string, exactly as
 * PayFast sent it. This is the most reliable method: it just strips the
 * `signature` field out of the raw string and hashes what's left, with
 * no decode/re-encode round-trip that could introduce a mismatch.
 *
 * Requires the raw body to have been captured, e.g. via:
 *   express.urlencoded({ verify: (req, res, buf) => { req.rawBody = buf.toString('utf8'); } })
 */
export const generateITNSignatureFromRaw = (rawBody: string): string => {
  const pairs = rawBody
    .split('&')
    .filter(pair => !pair.startsWith('signature='));

  let pfOutput = pairs.join('&');

  if (PAYFAST_CONFIG.passphrase) {
    // Raw body is already urlencoded with '+' for spaces (standard
    // application/x-www-form-urlencoded), matching pfEncode's behaviour.
    pfOutput += `&passphrase=${pfEncode(PAYFAST_CONFIG.passphrase)}`;
  }

  return crypto.createHash('md5').update(pfOutput).digest('hex');
};

/**
 * Generate signature for checkout (specific field order + '+' encoding)
 */
export const generateCheckoutSignature = (data: Record<string, any>): string => {
  return generateSignature(data, CHECKOUT_SIGNATURE_FIELD_ORDER, false);
};

// ============================================
// ID GENERATORS
// ============================================

export const generateOrderNumber = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
};

export const generateTransactionId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `PF-${timestamp}-${random}`;
};

// ============================================
// PAYFAST PAYMENT DATA PREPARATION
// ============================================

export const preparePayFastData = (params: {
  amount: number;
  email: string;
  firstName: string;
  lastName: string;
  orderNumber: string;
  transactionId: string;
  items?: Array<{ title: string }>;
}) => {
  const { amount, email, firstName, lastName, orderNumber, transactionId, items } = params;

  const returnUrlWithRef = `${PAYFAST_CONFIG.returnUrl}${
    PAYFAST_CONFIG.returnUrl.includes('?') ? '&' : '?'
  }orderId=${encodeURIComponent(orderNumber)}`;

  const itemNames = items?.map(item => item.title).join(', ') || 'Digital Products';

  const data: Record<string, string> = {
    merchant_id: PAYFAST_CONFIG.merchantId,
    merchant_key: PAYFAST_CONFIG.merchantKey,
    return_url: returnUrlWithRef,
    cancel_url: PAYFAST_CONFIG.cancelUrl,
    notify_url: PAYFAST_CONFIG.notifyUrl,
    name_first: firstName,
    name_last: lastName,
    email_address: email,
    m_payment_id: transactionId,
    amount: amount.toFixed(2),
    item_name: `Digital Toolkit Order ${orderNumber}`,
    item_description: itemNames,
    custom_str1: orderNumber,
    custom_str2: transactionId,
    custom_str3: 'digital-toolkit',
    custom_str4: 'v1',
    email_confirmation: '1',
    confirmation_address: email,
    payment_method: 'cc',
  };

  // ✅ Use checkout signature (specific field order + '+' encoding)
  const signature = generateCheckoutSignature(data);
  data.signature = signature;

  return data;
};



// ============================================
// PAYFAST CREDIT PAYMENT DATA PREPARATION
// ============================================

export const preparePayFastDataCREDIT = (params: {
  amount: number;
  email: string;
  firstName: string;
  lastName: string;
  orderNumber: string;
  transactionId: string;
  items?: Array<{ title: string }>;
}) => {
  const { amount, email, firstName, lastName, orderNumber, transactionId, items } = params;

  const returnUrlWithRef = `${CREDIT_PAYFAST_CONFIG.returnUrl}${
    CREDIT_PAYFAST_CONFIG.returnUrl.includes('?') ? '&' : '?'
  }orderId=${encodeURIComponent(orderNumber)}`;

  const itemNames = items?.map(item => item.title).join(', ') || 'Digital Products';

  const data: Record<string, string> = {
    merchant_id: CREDIT_PAYFAST_CONFIG.merchantId,
    merchant_key: CREDIT_PAYFAST_CONFIG.merchantKey,
    return_url: returnUrlWithRef,
    cancel_url: CREDIT_PAYFAST_CONFIG.cancelUrl,
    notify_url: CREDIT_PAYFAST_CONFIG.notifyUrl,
    name_first: firstName,
    name_last: lastName,
    email_address: email,
    m_payment_id: transactionId,
    amount: amount.toFixed(2),
    item_name: `Credit plan ${orderNumber}`,
    item_description: itemNames,
    custom_str1: orderNumber,
    custom_str2: transactionId,
    custom_str3: 'credit-plan',
    custom_str4: 'v1',
    email_confirmation: '1',
    confirmation_address: email,
    payment_method: 'cc',
  };

  // ✅ Use checkout signature (specific field order + '+' encoding)
  const signature = generateCheckoutSignature(data);
  data.signature = signature;

  return data;
};



// ============================================
// PAYFAST ITN VALIDATION (server-to-server confirmation with PayFast)
// ============================================

export const validateITN = async (data: Record<string, any>): Promise<boolean> => {
  try {
    const validationData = new URLSearchParams();
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
        validationData.append(key, String(data[key]));
      }
    });

    const response = await fetch(PAYFAST_CONFIG.validateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: validationData,
    });

    const responseText = await response.text();
    console.log('🔍 ITN Validation Response:', responseText);
    return responseText === 'VALID';
  } catch (error) {
    console.error('ITN Validation Error:', error);
    return false;
  }
};

// ============================================
// ORDER STATUS HELPERS
// ============================================

export const getOrderStatusDisplay = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: 'Pending Payment',
    paid: 'Paid',
    failed: 'Payment Failed',
    cancelled: 'Cancelled',
    completed: 'Completed',
  };
  return statusMap[status] || status;
};

export const getPaymentStatusDisplay = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: 'Pending',
    partial: 'Partial Payment',
    completed: 'Paid in Full',
    failed: 'Payment Failed',
    refunded: 'Refunded',
  };
  return statusMap[status] || status;
};

// ============================================
// ORDER DATA FORMATTER
// ============================================

export const formatOrderResponse = (order: any) => {
  return {
    id: order._id,
    orderNumber: order.orderNumber,
    items: order.items,
    totalAmount: order.totalAmount,
    taxAmount: order.taxAmount,
    status: order.status,
    statusDisplay: getOrderStatusDisplay(order.status),
    billingInfo: order.billingInfo,
    downloadLinks: order.status === 'paid' ? order.downloadLinks : [],
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
};

export default {
  generateSignature,
  generateITNSignature,
  generateITNSignatureFromRaw,
  generateCheckoutSignature,
  generateOrderNumber,
  generateTransactionId,
  preparePayFastData,
  validateITN,
  getOrderStatusDisplay,
  getPaymentStatusDisplay,
  formatOrderResponse,
};