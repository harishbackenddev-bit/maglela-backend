// models/invoice/quote.model.ts
import { Schema, model, Model, Document } from "mongoose";

// ============================================
// INTERFACES
// ============================================

export interface IClientInfo {
  clientName: string;
  organisation?: string;
  email: string;
}

export interface ILineItem {
  itemNumber: number;
  serviceType: string;
  description: string;
  quantity: number;
  rate: number;
  lineTotal: number;
  taxRate?: number;
  taxAmount?: number;
  discount?: number;
}

export interface IQuote extends Document {
  quoteNumber: string;
  quoteId?: string;
  clientInfo: IClientInfo;
  quoteDate: Date;
  validUntil: Date;
  items: ILineItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  currency: string;
  additionalNotes: string;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired" | "invoiced";
  createdBy: string;
  createdByEmail: string;
  sentAt: Date | null;
  acceptedAt: Date | null;
  rejectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  sendQuote(): Promise<IQuote>;
  acceptQuote(): Promise<IQuote>;
  rejectQuote(): Promise<IQuote>;
}

// Static methods interface
interface IQuoteModel extends Model<IQuote> {
  generateQuoteNumber(): Promise<string>;
}

// ============================================
// SCHEMAS
// ============================================

// Client Information Schema
const ClientInfoSchema = new Schema<IClientInfo>({
  clientName: {
    type: String,
    required: true,
  },
  organisation: {
    type: String,
    default: "",
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
  },
});

// Line Item Schema with Tax
const LineItemSchema = new Schema<ILineItem>({
  itemNumber: {
    type: Number,
    required: true,
  },
  serviceType: {
    type: String,
    default: "AI Writing",
  },
  description: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 1,
  },
  rate: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  lineTotal: {
    type: Number,
    required: true,
    default: 0,
  },
  taxRate: {
    type: Number,
    default: 15, // 15% VAT default
  },
  taxAmount: {
    type: Number,
    default: 0,
  },
  discount: {
    type: Number,
    default: 0,
  },
});

// Main Quote Schema
const QuoteSchema = new Schema<IQuote, IQuoteModel>(
  {
    quoteNumber: {
      type: String,
      unique: true,
      required: true,
    },
    quoteId: {
      type: String,
      unique: true,
      default: function() {
        return `QT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      }
    },
    clientInfo: {
      type: ClientInfoSchema,
      required: true,
    },
    quoteDate: {
      type: Date,
      default: Date.now,
    },
    validUntil: {
      type: Date,
      required: true,
    },
    items: [LineItemSchema],
    subtotal: {
      type: Number,
      required: true,
      default: 0,
    },
    taxTotal: {
      type: Number,
      default: 0,
    },
    discountTotal: {
      type: Number,
      default: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
      default: 0,
    },
    currency: {
      type: String,
      default: "ZAR",
    },
    additionalNotes: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["draft", "sent", "accepted", "rejected", "expired", "invoiced"],
      default: "draft",
    },
    createdBy: {
      type: String,
      required: true,
    },
    createdByEmail: {
      type: String,
      required: true,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES
// ============================================

QuoteSchema.index({ quoteNumber: 1 });
QuoteSchema.index({ "clientInfo.email": 1 });
QuoteSchema.index({ status: 1 });
QuoteSchema.index({ createdAt: -1 });

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================

QuoteSchema.pre('save', function(next) {
  let subtotal = 0;
  let taxTotal = 0;
  let discountTotal = 0;

  this.items.forEach((item: any) => {
    // Calculate line total
    const lineTotal = item.quantity * item.rate;
    item.lineTotal = lineTotal;

    // Calculate tax for this item
    const taxRate = item.taxRate || 15;
    const taxAmount = (lineTotal * taxRate) / 100;
    item.taxAmount = taxAmount;

    // Calculate discount for this item
    const discount = item.discount || 0;

    subtotal += lineTotal;
    taxTotal += taxAmount;
    discountTotal += discount;
  });

  this.subtotal = subtotal;
  this.taxTotal = taxTotal;
  this.discountTotal = discountTotal;
  this.grandTotal = subtotal + taxTotal - discountTotal;

  next();
});

// ============================================
// STATIC METHODS
// ============================================

QuoteSchema.static('generateQuoteNumber', async function generateQuoteNumber() {
  const year = new Date().getFullYear();
  const count = await this.countDocuments();
  return `QT-${year}-${String(count + 1).padStart(4, '0')}`;
});

// ============================================
// INSTANCE METHODS
// ============================================

QuoteSchema.method('sendQuote', function sendQuote() {
  this.status = 'sent';
  this.sentAt = new Date();
  return this.save();
});

QuoteSchema.method('acceptQuote', function acceptQuote() {
  this.status = 'accepted';
  this.acceptedAt = new Date();
  return this.save();
});

QuoteSchema.method('rejectQuote', function rejectQuote() {
  this.status = 'rejected';
  this.rejectedAt = new Date();
  return this.save();
});

// ============================================
// MODEL
// ============================================

export const QuoteModel = model<IQuote, IQuoteModel>("quotes", QuoteSchema);