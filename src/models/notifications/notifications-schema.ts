import { Schema, model } from "mongoose";

const notificationSchema = new Schema(
  {
    identifier: {
      type: String,
      unique: true,
    },
    userId: {
      type: String,
      default: null,
    },
    project_updates: {
      type: Boolean,
      default: false,
    },
    billing_alerts: {
      type: Boolean,
      default: false,
    },
    expert_bookings: {
      type: Boolean,
      default: false,
    },
    product_news: {
      type: Boolean,
      default: false,
    },
    weekly_digest: {
      type: Boolean,
      default: false,
    },
    workshop_reminders: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const notificationsModel = model(
  "notifications",
  notificationSchema
);