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

    // Existing
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

    // New fields
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
  },
  { timestamps: true }
);

export const usersModel = model("users", usersSchema);