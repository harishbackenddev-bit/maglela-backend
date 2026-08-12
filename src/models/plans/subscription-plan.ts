// models/subscription/subscription-plan.ts
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

        // Tier: Basic, Pro, Enterprise
        tier: {
            type: String,
            required: true,
        },

        // Plan Name: Individual Scholar, Department, Organisation
        name: {
            type: String,
            required: true,
        },

        // Audience description
        audience: {
            type: String,
            default: "",
        },

        // Target audience details
        targetAudience: {
            type: String,
            default: "",
        },

        // Pricing
        monthlyPrice: {
            type: String,
            required: true,
        },
        yearlyPrice: {
            type: String,
            default: "",
        },

        // Credits
        creditsMonthly: {
            type: Number,
            required: true,
            default: 0,
        },
        creditsYearly: {
            type: Number,
            default: 0,
        },

        // Period label
        periodLabel: {
            type: String,
            default: "per month",
        },

        // Call to Action
        buttonLabel: {
            type: String,
            default: "Get Started",
        },
        buttonLink: {
            type: String,
            default: "/contact",
        },

        // Features
        features: {
            type: [String],
            default: [],
        },

        // Status
        isPopular: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },

        // Display order
        displayOrder: {
            type: Number,
            default: 0,
        },

        // Created by
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

// Indexes
SubscriptionPlanSchema.index({ name: 1 });
SubscriptionPlanSchema.index({ tier: 1 });
SubscriptionPlanSchema.index({ isActive: 1, isPopular: 1 });
SubscriptionPlanSchema.index({ displayOrder: 1 });


export const subscriptionPlanModel = model("subscription_plans", SubscriptionPlanSchema);