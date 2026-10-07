
import { Schema, model } from "mongoose";

const SubscriptionPlanSchema = new Schema(
    {
        planId: {
            type: String,
            unique: true,
            default: function() {
                return `SUB-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
            }
        },

        
        tier: {
            type: String,
            required: true,
        },

        
        name: {
            type: String,
            required: true,
        },

        
        audience: {
            type: String,
            default: "",
        },

        
        targetAudience: {
            type: String,
            default: "",
        },

        
        monthlyPrice: {
            type: String,
            required: true,
        },
        yearlyPrice: {
            type: String,
            default: "",
        },

        
        creditsMonthly: {
            type: Number,
            required: true,
            default: 0,
        },
        creditsYearly: {
            type: Number,
            default: 0,
        },

        
        periodLabel: {
            type: String,
            default: "per month",
        },

        
        buttonLabel: {
            type: String,
            default: "Get Started",
        },
        buttonLink: {
            type: String,
            default: "/contact",
        },

        
        features: {
            type: [String],
            default: [],
        },

        
        isPopular: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },

        
        displayOrder: {
            type: Number,
            default: 0,
        },

        
        createdBy: {
            type: String,
            default: null,
        },
        updatedBy: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);


SubscriptionPlanSchema.index({ name: 1 });
SubscriptionPlanSchema.index({ tier: 1 });
SubscriptionPlanSchema.index({ isActive: 1, isPopular: 1 });
SubscriptionPlanSchema.index({ displayOrder: 1 });


export const subscriptionPlanModel = model("subscription_plans", SubscriptionPlanSchema);