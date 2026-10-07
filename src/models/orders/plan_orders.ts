
import { Schema, model, Document } from "mongoose";





export interface IPlanOrder extends Document {
    orderNumber: string;
    userEmail: string;
    userId?: Schema.Types.ObjectId;
    orderType: 'plan' | 'product' | 'store';

    
    planId: string;
    planName: string;
    planType: 'basic' | 'pro' | 'enterprise';
    credits: number;
    price: number;
    billingCycle: 'monthly' | 'yearly';
    planFeatures?: string[];

    
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    discountCode?: string;
    totalAmount: number;
    currency: string;
    status: 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'refunded' | 'completed';
    paymentMethod: 'payfast' | 'credit_card' | 'paypal' | 'bank_transfer';
    transactionId?: string;

    
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

    
    payfast: {
        paymentId?: string;
        transactionId?: string;
        status?: string;
        amount?: number;
        signature?: string;
        response?: any;
    };

    
    creditDetails: {
        creditsPurchased: number;
        creditsBefore?: number;
        creditsAfter?: number;
        expiryDate?: Date;
        usedCredits?: number;
        remainingCredits?: number;
    };

    
    user: {
        name?: string;
        email?: string;
        currentPlan?: string;
        currentCredits?: number;
    };

    
    statusHistory?: Array<{
        status: string;
        timestamp: Date;
        note?: string;
        updatedBy?: string;
    }>;

    
    notes?: string;

    
    createdAt: Date;
    updatedAt: Date;
    paidAt?: Date;
    cancelledAt?: Date;
    refundedAt?: Date;
}





const PlanOrderSchema = new Schema(
    {
        
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

        
        notes: {
            type: String,
            trim: true,
        },

        
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





PlanOrderSchema.index({ userEmail: 1, createdAt: -1 });
PlanOrderSchema.index({ orderNumber: 1, userEmail: 1 });
PlanOrderSchema.index({ status: 1, createdAt: -1 });
PlanOrderSchema.index({ transactionId: 1, status: 1 });
PlanOrderSchema.index({ 'planType': 1, status: 1 });






PlanOrderSchema.pre('save', function (next) {
    if (!this.orderNumber) {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        this.orderNumber = `PLN-${timestamp}-${random}`;
    }

    
    if (this.creditDetails) {
        this.creditDetails.remainingCredits = 
            this.creditDetails.creditsPurchased - (this.creditDetails.usedCredits || 0);
    }

    next();
});


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





PlanOrderSchema.methods = {
    
    async useCredits(amount: number) {
        if (!this.creditDetails) return false;

        const remaining = this.creditDetails.remainingCredits || 0;
        if (remaining < amount) return false;

        this.creditDetails.usedCredits = (this.creditDetails.usedCredits || 0) + amount;
        this.creditDetails.remainingCredits = remaining - amount;
        await this.save();
        return true;
    },

    
    isCreditsExpired(): boolean {
        if (!this.creditDetails?.expiryDate) return false;
        return new Date() > this.creditDetails.expiryDate;
    },

    
    getRemainingDays(): number | null {
        if (!this.creditDetails?.expiryDate) return null;
        const diff = this.creditDetails.expiryDate.getTime() - new Date().getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    },
};





PlanOrderSchema.statics = {
    
    async findByUserEmail(email: string) {
        return this.find({ userEmail: email }).sort({ createdAt: -1 });
    },

    
    async findActiveOrders(email: string) {
        return this.find({
            userEmail: email,
            status: 'paid',
            'creditDetails.expiryDate': { $gt: new Date() },
        }).sort({ createdAt: -1 });
    },

    
    async getTotalCreditsPurchased(email: string) {
        const result = await this.aggregate([
            { $match: { userEmail: email, status: 'paid' } },
            { $group: { _id: null, total: { $sum: '$credits' } } },
        ]);
        return result.length > 0 ? result[0].total : 0;
    },

    
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





export const planOrderModel = model<IPlanOrder>('plan_orders', PlanOrderSchema);