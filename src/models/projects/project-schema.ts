import { Schema, model } from "mongoose";

const ProjectSchema = new Schema(
    {
        identifier: {
            type: String,
            unique: true,
        },

        userId: {
            type: String,
            default: null,
        },

        title: {
            type: String,
        },

        type: {
            type: String,
        },

        description: {
            type: String,
        },

        priority: {
            type: String,
        },


        deadline: {
            type: String,
            default: null,
        },


        proceedOption: {
            type: String,
            default: null,
        },

        attachments: {
            type: String,
            default: null,
        },
        adminnote: {
            type: String,
            default: null,
        },
        adminattachment: {
            type: String,
            default: null,
        },
        feedbacknote: {
            type: String,
            default: null,
        },
        feedbackadminattachment: {
            type: String,
            default: null,
        },
        feedbackcount: {
            type: String,
            default: null,
        },

        status: {
            type: String,
            default: "Pending",
        },
    },
    {
        timestamps: true,
    }
);

export const projectModel = model("projects", ProjectSchema);