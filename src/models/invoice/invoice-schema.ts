// models/invoice/invoice.model.ts
import { Schema, model, Model, Document } from "mongoose";

// ============================================
// INTERFACES
// ============================================

export interface IClientInfo {
  clientName: string;
  organisation?: string;
  email: string;
}

export interface IInvoiceItem {
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

export interface IInvoice extends Document {
  invoiceNumber: string;
  invoiceId?: string;
  clientInfo: IClientInfo;
  issueDate: Date;
  dueDate: Date;
  currency: string;
  paymentTerms: string;
  items: IInvoiceItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  additionalNotes: string;
  status: "draft" | "sent" | "viewed" | "paid" | "overdue" | "cancelled";
  createdBy: string;
  createdByEmail: string;
  sentAt?: Date;
  viewedAt?: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  sendInvoice(): Promise<IInvoice>;
  markAsViewed(): Promise<IInvoice>;
  markAsPaid(): Promise<IInvoice>;
}

// Static methods interface
interface IInvoiceModel extends Model<IInvoice> {
  generateInvoiceNumber(): Promise<string>;
}

// ============================================
// SCHEMAS
// ============================================

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

const InvoiceItemSchema = new Schema<IInvoiceItem>({
  itemNumber: {
    type: Number,
    required: true,
  },
  serviceType: {
    type: String,
    enum: ["AI Writing", "AI Speech", "Content Strategy", "Workshop Facilitation", "Coaching Session", "Custom Development", "Consulting Services"],
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
    default: 15,
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

// Main Invoice Schema
const InvoiceSchema = new Schema<IInvoice, IInvoiceModel>(
  {
    invoiceNumber: {
      type: String,
      unique: true,
      required: true,
    },
    invoiceId: {
      type: String,
      unique: true,
      default: function() {
        return `INV-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      }
    },
    clientInfo: {
      type: ClientInfoSchema,
      required: true,
    },
    issueDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    currency: {
      type: String,
      default: "ZAR (R)",
    },
    paymentTerms: {
      type: String,
      default: "Net 30",
    },
    items: [InvoiceItemSchema],
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
    additionalNotes: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["draft", "sent", "viewed", "paid", "overdue", "cancelled"],
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
    viewedAt: {
      type: Date,
      default: null,
    },
    paidAt: {
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

InvoiceSchema.index({ invoiceNumber: 1 });
InvoiceSchema.index({ "clientInfo.email": 1 });
InvoiceSchema.index({ status: 1 });
InvoiceSchema.index({ createdAt: -1 });
InvoiceSchema.index({ dueDate: 1 });

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================

InvoiceSchema.pre('save', function(next) {
  let subtotal = 0;
  let taxTotal = 0;
  let discountTotal = 0;

  this.items.forEach((item: any) => {
    const lineTotal = item.quantity * item.rate;
    item.lineTotal = lineTotal;
    item.taxAmount = (lineTotal * (item.taxRate || 15)) / 100;

    subtotal += lineTotal;
    taxTotal += item.taxAmount || 0;
    discountTotal += item.discount || 0;
  });

  this.subtotal = subtotal;
  this.taxTotal = taxTotal;
  this.discountTotal = discountTotal;
  this.grandTotal = subtotal + taxTotal - discountTotal;

  // Check if overdue
  if (this.dueDate && new Date() > new Date(this.dueDate) && this.status === 'sent') {
    this.status = 'overdue';
  }

  next();
});

// ============================================
// STATIC METHODS
// ============================================

InvoiceSchema.static(
  "generateInvoiceNumber",
  async function generateInvoiceNumber() {
    const year = new Date().getFullYear();

    const lastInvoice = await this.findOne({
      invoiceNumber: new RegExp(`^INV-${year}-`),
    }).sort({ invoiceNumber: -1 });

    let nextNumber = 1;

    if (lastInvoice?.invoiceNumber) {
      const match = lastInvoice.invoiceNumber.match(
        new RegExp(`^INV-${year}-(\\d+)$`)
      );

      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    return `INV-${year}-${String(nextNumber).padStart(4, "0")}`;
  }
);

// ============================================
// INSTANCE METHODS
// ============================================

InvoiceSchema.method('sendInvoice', function sendInvoice() {
  this.status = 'sent';
  this.sentAt = new Date();
  return this.save();
});

InvoiceSchema.method('markAsViewed', function markAsViewed() {
  if (this.status === 'sent') {
    this.status = 'viewed';
    this.viewedAt = new Date();
  }
  return this.save();
});

InvoiceSchema.method('markAsPaid', function markAsPaid() {
  this.status = 'paid';
  this.paidAt = new Date();
  return this.save();
});

// ============================================
// MODEL
// ============================================

export const InvoiceModel = model<IInvoice, IInvoiceModel>("invoices", InvoiceSchema);