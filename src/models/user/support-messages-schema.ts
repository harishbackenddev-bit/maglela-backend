import { Schema, model } from "mongoose";

const supportMessageSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },

    
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
    },

    phoneNumber: {
      type: String,
      default: null,
    },

    organisation: {
      type: String,
      default: null,
    },

    profileType: {
      type: String,
      default: null,
    },

    
    subject: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    
    status: {
      type: String,
      enum: ["pending", "in-progress", "resolved"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

export const supportMessageModel = model(
  "support_messages",
  supportMessageSchema
);