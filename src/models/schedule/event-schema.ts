// models/event/event.model.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IEvent extends Document {
  title: string;
  type: 'Meeting' | 'Task' | 'Deadline' | 'Workshop' | 'Call' | 'Review' | 'Other';
  date: Date;
  startTime: string;
  endTime: string;
  location: string;
  description: string;
  reminder: string;
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['Meeting', 'Task', 'Deadline', 'Workshop', 'Call', 'Review', 'Other'],
    default: 'Meeting',
  },
  date: {
    type: Date,
    required: true,
  },
  startTime: {
    type: String,
    required: true,
  },
  endTime: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
  reminder: {
    type: String,
    default: '10 minutes',
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userEmail: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled'],
    default: 'scheduled',
  },
}, {
  timestamps: true,
});

// Indexes for faster queries
EventSchema.index({ userId: 1, date: 1 });
EventSchema.index({ userEmail: 1 });
EventSchema.index({ status: 1 });

export const EventModel = mongoose.model<IEvent>('Event', EventSchema);