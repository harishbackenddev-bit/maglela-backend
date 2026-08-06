// models/orders/plan-order-schema.ts
import { Schema, model, Document } from "mongoose";

// ============================================
// INTERFACE
// ============================================

export interface IPlanOrder extends Document {
    orderNumber: string;
    userEmail: string;
    userId?: Schema.Types.ObjectId;
    orderType: 'plan' | 'product' | 'store';

    // Plan Details
    planId: string;
    planName: string;
    planType: 'basic' | 'pro' | 'enterprise';
    credits: number;
    price: number;
    billingCycle: 'monthly' | 'yearly';
    planFeatures?: string[];

    // Payment
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    discountCode?: string;
    totalAmount: number;
    currency: string;
    status: 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'refunded' | 'completed';
    paymentMethod: 'payfast' | 'credit_card' | 'paypal' | 'bank_transfer';
    transactionId?: string;

    // Billing Info (Full details like order schema)
    billingInfo: {
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
        company?: string;
        organisation?: string;
        streetAddress?: string;
        city?: string;
        postalCode?: string;
        country?: string;
        taxNumber?: string;
    };

    // PayFast Response
    payfast: {
        paymentId?: string;
        transactionId?: string;
        status?: string;
        amount?: number;
        signature?: string;
        response?: any;
    };

    // Credit Tracking
    creditDetails: {
        creditsPurchased: number;
        creditsBefore?: number;
        creditsAfter?: number;
        expiryDate?: Date;
        usedCredits?: number;
        remainingCredits?: number;
    };

    // User Info Snapshot
    user: {
        name?: string;
        email?: string;
        currentPlan?: string;
        currentCredits?: number;
    };

    // Status History
    statusHistory?: Array<{
        status: string;
        timestamp: Date;
        note?: string;
        updatedBy?: string;
    }>;

    // Notes
    notes?: string;

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
    paidAt?: Date;
    cancelledAt?: Date;
    refundedAt?: Date;
}

// ============================================
// SCHEMA
// ============================================

const PlanOrderSchema = new Schema(
    {
        // Order Identification
        orderNumber: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        userEmail: {
            type: String,
            required: true,
            index: true,
            trim: true,
            lowercase: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'users',
            index: true,
        },
        orderType: {
            type: String,
            enum: ['plan', 'product', 'store'],
            default: 'plan',
            required: true,
        },

        // Plan Details
        planId: {
            type: String,
            required: true,
        },
        planName: {
            type: String,
            required: true,
        },
        planType: {
            type: String,
            enum: ['basic', 'pro', 'enterprise'],
            required: true,
        },
        credits: {
            type: Number,
            required: true,
            min: 0,
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
        billingCycle: {
            type: String,
            enum: ['monthly', 'yearly'],
            required: true,
        },
        planFeatures: {
            type: [String],
            default: [],
        },

        // Payment Details
        subtotal: {
            type: Number,
            required: true,
            min: 0,
        },
        taxAmount: {
            type: Number,
            default: 0,
        },
        discountAmount: {
            type: Number,
            default: 0,
        },
        discountCode: {
            type: String,
            trim: true,
        },
        totalAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        currency: {
            type: String,
            default: 'ZAR',
        },
        status: {
            type: String,
            enum: ['pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded', 'completed'],
            default: 'pending',
            index: true,
        },
        paymentMethod: {
            type: String,
            enum: ['payfast', 'credit_card', 'paypal', 'bank_transfer'],
            default: 'payfast',
        },
        transactionId: {
            type: String,
            index: true,
            trim: true,
        },

        // Billing Info (Full details like order schema)
        billingInfo: {
            firstName: {
                type: String,
                required: true,
                trim: true,
            },
            lastName: {
                type: String,
                required: true,
                trim: true,
            },
            email: {
                type: String,
                required: true,
                trim: true,
                lowercase: true,
            },
            phone: {
                type: String,
                trim: true,
            },
            company: {
                type: String,
                trim: true,
            },
            organisation: {
                type: String,
                trim: true,
            },
            streetAddress: {
                type: String,
                trim: true,
            },
            city: {
                type: String,
                trim: true,
            },
            postalCode: {
                type: String,
                trim: true,
            },
            country: {
                type: String,
                trim: true,
            },
            taxNumber: {
                type: String,
                trim: true,
            },
        },

        // PayFast Response
        payfast: {
            paymentId: {
                type: String,
                trim: true,
            },
            transactionId: {
                type: String,
                trim: true,
            },
            status: {
                type: String,
                trim: true,
            },
            amount: {
                type: Number,
            },
            signature: {
                type: String,
                trim: true,
            },
            response: {
                type: Schema.Types.Mixed,
            },
        },

        // Credit Tracking
        creditDetails: {
            creditsPurchased: {
                type: Number,
                required: true,
                min: 0,
            },
            creditsBefore: {
                type: Number,
                default: 0,
            },
            creditsAfter: {
                type: Number,
                default: 0,
            },
            expiryDate: {
                type: Date,
            },
            usedCredits: {
                type: Number,
                default: 0,
            },
            remainingCredits: {
                type: Number,
                default: 0,
            },
        },

        // User Info Snapshot
        user: {
            name: {
                type: String,
                trim: true,
            },
            email: {
                type: String,
                trim: true,
                lowercase: true,
            },
            currentPlan: {
                type: String,
            },
            currentCredits: {
                type: Number,
                default: 0,
            },
        },

        // Status History
        statusHistory: [
            {
                status: {
                    type: String,
                    enum: ['pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded', 'completed'],
                },
                timestamp: {
                    type: Date,
                    default: Date.now,
                },
                note: {
                    type: String,
                    trim: true,
                },
                updatedBy: {
                    type: String,
                    trim: true,
                },
            },
        ],

        // Notes
        notes: {
            type: String,
            trim: true,
        },

        // Timestamps
        paidAt: {
            type: Date,
        },
        cancelledAt: {
            type: Date,
        },
        refundedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// ============================================
// INDEXES FOR PERFORMANCE
// ============================================

PlanOrderSchema.index({ userEmail: 1, createdAt: -1 });
PlanOrderSchema.index({ orderNumber: 1, userEmail: 1 });
PlanOrderSchema.index({ status: 1, createdAt: -1 });
PlanOrderSchema.index({ transactionId: 1, status: 1 });
PlanOrderSchema.index({ 'planType': 1, status: 1 });

// ============================================
// MIDDLEWARE
// ============================================

// Generate order number before saving
PlanOrderSchema.pre('save', function (next) {
    if (!this.orderNumber) {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        this.orderNumber = `PLN-${timestamp}-${random}`;
    }

    // Calculate remaining credits
    if (this.creditDetails) {
        this.creditDetails.remainingCredits = 
            this.creditDetails.creditsPurchased - (this.creditDetails.usedCredits || 0);
    }

    next();
});

// Auto-add status history on status change
PlanOrderSchema.pre('findOneAndUpdate', function (next) {
    const update = this.getUpdate() as any;
    if (update.status) {
        const statusHistory = {
            status: update.status,
            timestamp: new Date(),
            note: update.note || `Status changed to ${update.status}`,
        };

        if (!update.$push) {
            update.$push = {};
        }
        update.$push.statusHistory = statusHistory;

        // Set timestamps based on status
        if (update.status === 'paid') {
            update.paidAt = new Date();
        } else if (update.status === 'cancelled') {
            update.cancelledAt = new Date();
        } else if (update.status === 'refunded') {
            update.refundedAt = new Date();
        }
    }
    next();
});

// ============================================
// VIRTUAL PROPERTIES
// ============================================

PlanOrderSchema.virtual('isPaid').get(function () {
    return this.status === 'paid';
});

PlanOrderSchema.virtual('isPending').get(function () {
    return this.status === 'pending';
});

PlanOrderSchema.virtual('isCancelled').get(function () {
    return this.status === 'cancelled';
});

PlanOrderSchema.virtual('creditsRemaining').get(function () {
    return this.creditDetails?.remainingCredits || 0;
});

PlanOrderSchema.virtual('formattedTotal').get(function () {
    return new Intl.NumberFormat('en-ZA', {
        style: 'currency',
        currency: 'ZAR',
    }).format(this.totalAmount);
});

// ============================================
// METHODS
// ============================================

PlanOrderSchema.methods = {
    // Update credit usage
    async useCredits(amount: number) {
        if (!this.creditDetails) return false;

        const remaining = this.creditDetails.remainingCredits || 0;
        if (remaining < amount) return false;

        this.creditDetails.usedCredits = (this.creditDetails.usedCredits || 0) + amount;
        this.creditDetails.remainingCredits = remaining - amount;
        await this.save();
        return true;
    },

    // Check if credits are expired
    isCreditsExpired(): boolean {
        if (!this.creditDetails?.expiryDate) return false;
        return new Date() > this.creditDetails.expiryDate;
    },

    // Get remaining validity days
    getRemainingDays(): number | null {
        if (!this.creditDetails?.expiryDate) return null;
        const diff = this.creditDetails.expiryDate.getTime() - new Date().getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    },
};

// ============================================
// STATIC METHODS
// ============================================

PlanOrderSchema.statics = {
    // Find orders by user email
    async findByUserEmail(email: string) {
        return this.find({ userEmail: email }).sort({ createdAt: -1 });
    },

    // Find active orders (paid and not expired)
    async findActiveOrders(email: string) {
        return this.find({
            userEmail: email,
            status: 'paid',
            'creditDetails.expiryDate': { $gt: new Date() },
        }).sort({ createdAt: -1 });
    },

    // Get total credits purchased by user
    async getTotalCreditsPurchased(email: string) {
        const result = await this.aggregate([
            { $match: { userEmail: email, status: 'paid' } },
            { $group: { _id: null, total: { $sum: '$credits' } } },
        ]);
        return result.length > 0 ? result[0].total : 0;
    },

    // Get monthly/yearly breakdown
    async getBillingBreakdown(email: string) {
        return this.aggregate([
            { $match: { userEmail: email, status: 'paid' } },
            {
                $group: {
                    _id: '$billingCycle',
                    count: { $sum: 1 },
                    total: { $sum: '$totalAmount' },
                    credits: { $sum: '$credits' },
                },
            },
        ]);
    },
};

// ============================================
// MODEL
// ============================================

export const planOrderModel = model<IPlanOrder>('plan_orders', PlanOrderSchema);