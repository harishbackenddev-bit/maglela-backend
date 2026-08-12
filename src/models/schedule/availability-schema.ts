// models/availability/availability.model.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ITimeSlot {
  id: string;
  startTime: string;
  endTime: string;
}

export interface IAvailability extends Document {
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  mode: 'recurring' | 'specific';
  selectedDays: string[];
  status: 'available' | 'blocked';
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
  timezone: string;
  timeSlots: ITimeSlot[];
  blockStartDate: Date;
  blockEndDate: Date;
  blockStartTime: string;
  blockEndTime: string;
  blockTimezone: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TimeSlotSchema = new Schema<ITimeSlot>({
  id: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
});

const AvailabilitySchema = new Schema<IAvailability>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userEmail: {
    type: String,
    required: true,
  },
  mode: {
    type: String,
    enum: ['recurring', 'specific'],
    default: 'recurring',
  },
  selectedDays: {
    type: [String],
    default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  },
  status: {
    type: String,
    enum: ['available', 'blocked'],
    default: 'available',
  },
  startDate: {
    type: Date,
    default: null,
  },
  endDate: {
    type: Date,
    default: null,
  },
  startTime: {
    type: String,
    default: '09:00',
  },
  endTime: {
    type: String,
    default: '17:00',
  },
  timezone: {
    type: String,
    default: 'Africa/Johannesburg',
  },
  timeSlots: {
    type: [TimeSlotSchema],
    default: [{ id: '1', startTime: '09:00', endTime: '17:00' }],
  },
  blockStartDate: {
    type: Date,
    default: null,
  },
  blockEndDate: {
    type: Date,
    default: null,
  },
  blockStartTime: {
    type: String,
    default: '',
  },
  blockEndTime: {
    type: String,
    default: '',
  },
  blockTimezone: {
    type: String,
    default: 'Africa/Johannesburg',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes
AvailabilitySchema.index({ userId: 1 });
AvailabilitySchema.index({ userEmail: 1 });
AvailabilitySchema.index({ isActive: 1 });

export const AvailabilityModel = mongoose.model<IAvailability>('Availability', AvailabilitySchema);