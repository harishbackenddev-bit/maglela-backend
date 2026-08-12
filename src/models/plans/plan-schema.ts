import { Schema, model } from "mongoose";

const CreditPlanSchema = new Schema(
    {
        planId: {
            type: String,
            unique: true,
            default: function() {
                return `PLAN-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
            }
        },

        name: {
            type: String,
            required: true,
        },

        billingType: {
            type: String,
            enum: ["One-time", "Recurring", "Monthly", "Yearly"],
            default: "One-time",
        },

        credits: {
            type: Number,
            required: true,
            default: 100,
        },

        price: {
            type: Number,
            required: true,
            default: 0,
        },

        description: {
            type: String,
            default: "",
        },

        features: {
            type: [String],
            default: [],
        },

        accentColor: {
            type: String,
            default: "#4f6ef7",
        },

        isPopular: {
            type: Boolean,
            default: false,
        },

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

export const creditPlanModel = model("credit_plans", CreditPlanSchema);