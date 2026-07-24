// models/orders/order-schema.ts
import { Schema, model } from "mongoose";

const OrderSchema = new Schema(
    {
        orderNumber: {
            type: String,
            required: true,
            unique: true
        },
        userEmail: {
            type: String,
            required: true,
            index: true
        },
        transactionId: {
            type: String,
            index: true
        },
        items: [{
            productId: {
                type: String,
                required: true
            },
            title: {
                type: String,
                required: true
            },
            price: {
                type: Number,
                required: true
            },
            quantity: {
                type: Number,
                required: true,
                min: 1
            },
            subtotal: {
                type: Number,
                required: true
            },
            // ✅ Add file fields for PDF mapping
            fileUrl: {
                type: String,
                default: ''
            },
            fileName: {
                type: String,
                default: ''
            }
        }],
        totalAmount: {
            type: Number,
            required: true
        },
        taxAmount: {
            type: Number,
            default: 0
        },
        status: {
            type: String,
            enum: ['pending', 'paid', 'failed', 'cancelled', 'completed'],
            default: 'pending'
        },
        paymentMethod: {
            type: String,
            default: 'payfast'
        },
        billingInfo: {
            firstName: {
                type: String,
                required: true
            },
            lastName: {
                type: String,
                required: true
            },
            email: {
                type: String,
                required: true
            },
            organisation: {
                type: String,
                default: ''
            },
            streetAddress: {
                type: String,
                required: false
            },
            city: {
                type: String,
                required: true
            },
            postalCode: {
                type: String,
                required: true
            },
            country: {
                type: String,
                required: true
            }
        },
        payfast: {
            paymentId: {
                type: String
            },
            signature: {
                type: String
            },
            transactionId: {
                type: String
            },
            status: {
                type: String
            }
        },
        downloadLinks: [{
            productId: {
                type: String
            },
            link: {
                type: String
            },
            fileName: {
                type: String // ✅ Add fileName for download
            },
            expiresAt: {
                type: Date
            }
        }]
    },
    {
        timestamps: true
    }
);

// Generate order number before saving
OrderSchema.pre('save', function(next) {
    if (!this.orderNumber) {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        this.orderNumber = `ORD-${timestamp}-${random}`;
    }
    next();
});

export const orderModel = model("orders", OrderSchema);