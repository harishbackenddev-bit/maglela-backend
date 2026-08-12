// models/orders/invoice_orders.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoiceOrder extends Document {
    orderNumber: string;
    userEmail: string;
    userId: mongoose.Types.ObjectId;
    orderType: string;
    
    // Invoice Details
    invoiceId: mongoose.Types.ObjectId;
    invoiceNumber: string;
    invoiceAmount: number;
    description: string;
    
    // Payment Details
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
    currency: string;
    status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
    paymentMethod: string;
    transactionId: string;
    
    // Billing Info
    billingInfo: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        company: string;
        organisation: string;
        streetAddress: string;
        city: string;
        postalCode: string;
        country: string;
        taxNumber: string;
    };
    
    // Invoice Items
    items: Array<{
        description: string;
        quantity: number;
        rate: number;
        lineTotal: number;
        serviceType?: string;
    }>;
    
    // User Info Snapshot
    user: {
        name: string;
        email: string;
    };
    
    // Status History
    statusHistory: Array<{
        status: string;
        timestamp: Date;
        note: string;
    }>;
    
    // PayFast Response
    payfast: {
        paymentId?: string;
        transactionId?: string;
        status?: string;
        amount?: number;
    };
    
    // Timestamps
    paidAt: Date | null;
    cancelledAt: Date | null;
    refundedAt: Date | null;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const InvoiceOrderSchema = new Schema<IInvoiceOrder>({
    orderNumber: {
        type: String,
        required: true,
        unique: true,
    },
    userEmail: {
        type: String,
        required: true,
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    orderType: {
        type: String,
        default: 'invoice',
        enum: ['invoice'],
    },
    
    // Invoice Details
    invoiceId: {
        type: Schema.Types.ObjectId,
        ref: 'Invoice',
        required: true,
    },
    invoiceNumber: {
        type: String,
        required: true,
    },
    invoiceAmount: {
        type: Number,
        required: true,
    },
    description: {
        type: String,
        default: 'Invoice Payment',
    },
    
    // Payment Details
    subtotal: {
        type: Number,
        required: true,
    },
    taxAmount: {
        type: Number,
        default: 0,
    },
    discountAmount: {
        type: Number,
        default: 0,
    },
    totalAmount: {
        type: Number,
        required: true,
    },
    currency: {
        type: String,
        default: 'ZAR',
    },
    status: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'cancelled', 'refunded'],
        default: 'pending',
    },
    paymentMethod: {
        type: String,
        default: 'payfast',
    },
    transactionId: {
        type: String,
        required: true,
    },
    
    // Billing Info
    billingInfo: {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String, default: '' },
        company: { type: String, default: '' },
        organisation: { type: String, default: '' },
        streetAddress: { type: String, default: '' },
        city: { type: String, default: '' },
        postalCode: { type: String, default: '' },
        country: { type: String, default: '' },
        taxNumber: { type: String, default: '' },
    },
    
    // Invoice Items
    items: [{
        description: { type: String, required: true },
        quantity: { type: Number, required: true },
        rate: { type: Number, required: true },
        lineTotal: { type: Number, required: true },
        serviceType: { type: String },
    }],
    
    // User Info Snapshot
    user: {
        name: { type: String, required: true },
        email: { type: String, required: true },
    },
    
    // Status History
    statusHistory: [{
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        note: { type: String },
    }],
    
    // PayFast Response
    payfast: {
        paymentId: { type: String },
        transactionId: { type: String },
        status: { type: String },
        amount: { type: Number },
    },
    
    // Timestamps
    paidAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    refundedAt: { type: Date, default: null },
    notes: { type: String },
}, {
    timestamps: true,
});

// Indexes for faster queries
InvoiceOrderSchema.index({ orderNumber: 1 });
InvoiceOrderSchema.index({ transactionId: 1 });
InvoiceOrderSchema.index({ userEmail: 1 });
InvoiceOrderSchema.index({ invoiceId: 1 });
InvoiceOrderSchema.index({ status: 1 });

export const invoiceOrderModel = mongoose.model<IInvoiceOrder>('InvoiceOrder', InvoiceOrderSchema);