import { Schema, model } from "mongoose";

const clientSchema = new Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // Account Type (Fixed for clients)
    accountType: {
      type: String,
      enum: ['institutional'],
      default: 'institutional',
    },

    userType: {
      type: String,
      enum: ['enterprise'],
      default: 'enterprise',
    },

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },

    // ============================================
    // ✅ CLIENT FIELDS (From API)
    // ============================================

    projects: {
      type: Number,
      default: 0,
      min: 0,
    },

    lifetimeValue: {
      type: Number,
      default: 0,
      min: 0,
    },

    retainerType: {
      type: String,
      enum: ['monthly-overflow', 'quarterly-overflow', 'annual-overflow', 'project-based', 'fixed-monthly'],
      default: null,
    },

    notes: {
      type: String,
      default: null,
      trim: true,
    },

    // Relationships
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'users',
      required: true,
    },

    managedBy: {
      type: Schema.Types.ObjectId,
      ref: 'users',
      default: null,
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// ============================================
// ✅ VIRTUAL FIELDS
// ============================================

clientSchema.virtual('totalProjects').get(function() {
  return this.projects || 0;
});

clientSchema.virtual('totalLifetimeValue').get(function() {
  return this.lifetimeValue || 0;
});

// ============================================
// ✅ STATIC METHODS
// ============================================

clientSchema.statics.findActiveClients = function() {
  return this.find({ isActive: true });
};

clientSchema.statics.findByManager = function(managerId) {
  return this.find({ managedBy: managerId });
};

clientSchema.statics.findByCreator = function(creatorId) {
  return this.find({ createdBy: creatorId });
};

// ============================================
// ✅ INSTANCE METHODS
// ============================================

clientSchema.methods.updateProjects = function(count) {
  this.projects = count;
  return this.save();
};

clientSchema.methods.updateLifetimeValue = function(value) {
  this.lifetimeValue = value;
  return this.save();
};

clientSchema.methods.toggleStatus = function() {
  this.isActive = !this.isActive;
  return this.save();
};

// ============================================
// ✅ INDEXES
// ============================================

clientSchema.index({ email: 1 });
clientSchema.index({ createdBy: 1 });
clientSchema.index({ managedBy: 1 });
clientSchema.index({ isActive: 1 });
clientSchema.index({ retainerType: 1 });

// ============================================
// ✅ MODEL
// ============================================

export const clientsModel = model("clients", clientSchema);