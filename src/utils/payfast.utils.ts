
import crypto from 'crypto';
import { PAYFAST_CONFIG, CREDIT_PAYFAST_CONFIG, INVOICE_PAYFAST_CONFIG } from '../config/payfast.config';






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


const pfEncode = (value: string): string => {
  return encodeURIComponent(value).replace(/%20/g, '+');
};


export const generateSignature = (
  data: Record<string, any>,
  fieldOrder?: string[],
  isITN: boolean = false
): string => {
  
  let validKeys: string[];

  if (isITN) {
    
    validKeys = Object.keys(data).filter(key => key !== 'signature');
  } else {
    
    validKeys = Object.keys(data).filter(
      key =>
        key !== 'signature' &&
        data[key] !== '' &&
        data[key] !== null &&
        data[key] !== undefined
    );
  }

  
  let orderedKeys: string[];
  if (isITN) {
    
    
    
    orderedKeys = validKeys;
  } else if (fieldOrder) {
    
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
    
    const stringValue = value !== undefined && value !== null ? String(value).trim() : '';

    if (pfOutput !== '') {
      pfOutput += '&';
    }
    pfOutput += `${key}=${pfEncode(stringValue)}`;
  }

  
  if (PAYFAST_CONFIG.passphrase) {
    pfOutput += `&passphrase=${pfEncode(PAYFAST_CONFIG.passphrase)}`;
  }

  
  return crypto.createHash('md5').update(pfOutput).digest('hex');
};


export const generateITNSignature = (data: Record<string, any>): string => {
  return generateSignature(data, undefined, true);
};


export const generateITNSignatureFromRaw = (rawBody: string): string => {
  const pairs = rawBody
    .split('&')
    .filter(pair => !pair.startsWith('signature='));

  let pfOutput = pairs.join('&');

  if (PAYFAST_CONFIG.passphrase) {
    
    
    pfOutput += `&passphrase=${pfEncode(PAYFAST_CONFIG.passphrase)}`;
  }

  return crypto.createHash('md5').update(pfOutput).digest('hex');
};


export const generateCheckoutSignature = (data: Record<string, any>): string => {
  return generateSignature(data, CHECKOUT_SIGNATURE_FIELD_ORDER, false);
};





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

  const returnUrlWithRef = `${PAYFAST_CONFIG.returnUrl}${PAYFAST_CONFIG.returnUrl.includes('?') ? '&' : '?'
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

  
  const signature = generateCheckoutSignature(data);
  data.signature = signature;

  return data;
};







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

  const returnUrlWithRef = `${CREDIT_PAYFAST_CONFIG.returnUrl}${CREDIT_PAYFAST_CONFIG.returnUrl.includes('?') ? '&' : '?'
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

  
  const signature = generateCheckoutSignature(data);
  data.signature = signature;

  return data;
};



export const preparePayFastDataInvoice = (params: {
  amount: number;
  email: string;
  firstName: string;
  lastName: string;
  orderNumber: string;
  transactionId: string;
  items?: Array<{ title: string }>;
}) => {
  const { amount, email, firstName, lastName, orderNumber, transactionId, items } = params;

  const returnUrlWithRef = `${INVOICE_PAYFAST_CONFIG.returnUrl}${INVOICE_PAYFAST_CONFIG.returnUrl.includes('?') ? '&' : '?'
    }orderId=${encodeURIComponent(orderNumber)}`;

  const itemNames = items?.map(item => item.title).join(', ') || 'Digital Products';

  const data: Record<string, string> = {
    merchant_id: INVOICE_PAYFAST_CONFIG.merchantId,
    merchant_key: INVOICE_PAYFAST_CONFIG.merchantKey,
    return_url: returnUrlWithRef,
    cancel_url: INVOICE_PAYFAST_CONFIG.cancelUrl,
    notify_url: INVOICE_PAYFAST_CONFIG.notifyUrl,
    name_first: firstName,
    name_last: lastName,
    email_address: email,
    m_payment_id: transactionId,
    amount: amount.toFixed(2),
    item_name: `Invoice Number - ${orderNumber}`,
    item_description: itemNames,
    custom_str1: orderNumber,
    custom_str2: transactionId,
    custom_str3: 'credit-plan',
    custom_str4: 'v1',
    email_confirmation: '1',
    confirmation_address: email,
    payment_method: 'cc',
  };

  
  const signature = generateCheckoutSignature(data);
  data.signature = signature;

  return data;
};





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