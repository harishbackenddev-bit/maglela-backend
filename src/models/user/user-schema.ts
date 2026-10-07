import { Schema, model } from "mongoose";

const usersSchema = new Schema(
  {
    identifier: {
      type: String,
      unique: true,
    },

    role: {
      type: String,
      required: true,
      default: "user",
    },

    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    phoneNumber: {
      type: String,
      default: null,
    },

    profilePic: {
      type: String,
      default: null,
    },

    address: {
      type: String,
      default: null,
    },

    
    accountType: {
      type: String,
      default: null,
    },

    jobtitle: {
      type: String,
      default: null,
    },

    organisation: {
      type: String,
      default: null,
    },

    bio: {
      type: String,
      default: null,
    },

    language: {
      type: String,
      default: null,
    },

    theme: {
      type: String,
      default: null,
    },

    timezone: {
      type: String,
      default: null,
    },

    
    profileType: {
      type: String,
      default: null,
    },

    primaryGoal: {
      type: String,
      default: null,
    },

    organisationName: {
      type: String,
      default: "",
    },

    organisationType: {
      type: String,
      default: null,
    },

    ndaAccepted: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    twoFactorAuth: {
      type: Boolean,
      default: false,
    },

    
    
    

    
    credits: {
      type: Number,
      default: 0,
    },

    
    plan: {
      type: String,
      enum: ['free', 'basic', 'pro', 'enterprise'],
      default: 'free',
    },

    planType: {
      type: String,
      enum: ['free', 'basic', 'pro', 'enterprise'],
      default: 'free',
    },

    
    lastCreditPurchase: {
      type: Date,
      default: null,
    },

    lastPurchaseAmount: {
      type: Number,
      default: null,
    },

    lastPurchasePlan: {
      type: String,
      default: null,
    },

    lastPurchaseOrderNumber: {
      type: String,
      default: null,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export const usersModel = model("users", usersSchema);