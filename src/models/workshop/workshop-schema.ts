import { Schema, model } from "mongoose";

const workshopSchema = new Schema(
    {
        identifier: {
            type: String,
            unique: true,
        },

        userId: {
            type: String,
            default: null,
        },

        serviceType: {
            type: String,
        },

        attendanceType: {
            type: String,
        },

        duration: {
            type: String,
        },

        participants: {
            type: String,
        },

        // Workshop Date
        date: {
            type: String, // Example: "2026-06-30"
            default: null,
        },

        // Workshop Time
        time: {
            type: String, // Example: "10:30 AM"
            default: null,
        },

        firstName: {
            type: String,
            default: null,
        },

        lastName: {
            type: String,
            default: null,
        },

        email: {
            type: String,
            default: null,
        },

        phone: {
            type: String,
            default: null,
        },

        organisation: {
            type: String,
            default: null,
        },

        specialRequests: {
            type: String,
            default: null,
        },

        status: {
            type: String,
            default: "Pending",
        },

        isActive: {
            type: Boolean,
            default: true,
        },
        adminNotes: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

export const workshopModel = model("workshops", workshopSchema);