// models/aiContentModel.ts
import { Schema, model } from "mongoose";

// ============================================
// AI CONTENT SCHEMA (Unified for Writing & Speech)
// ============================================

const AIContentSchema = new Schema(
    {
        // Unique identifier
        identifier: {
            type: String,
            unique: true,
        },

        // User reference
        userId: {
            type: String,
            required: true,
        },

        // Content type: 'writing' or 'speech'
        contentType: {
            type: String,
            enum: ['writing', 'speech'],
            required: true,
        },

        // Basic info
        title: {
            type: String,
            required: true,
        },

        description: {
            type: String,
            default: '',
        },

        // Generated content
        content: {
            type: String,
            required: true,
        },

        // Analysis parameters (from user input)
        parameters: {
            authority: { type: Number, default: 0 },
            clarity: { type: Number, default: 0 },
            academicRigor: { type: Number, default: 0 },
            accessibility: { type: Number, default: 0 },
            narrativeDepth: { type: Number, default: 0 },
        },

        // Average score
        avgScore: {
            type: Number,
            default: 0,
        },

        // Duration (for speech)
        duration: {
            type: String,
            default: '00:00',
        },

        // Audio URL (for speech)
        audioUrl: {
            type: String,
            default: null,
        },

        // Provider info
        provider: {
            type: String,
            default: 'openai',
        },

        aiModel: {
            type: String,
            default: 'gpt-4o',
        },

        // Cost
        cost: {
            usd: { type: Number, default: 0 },
            zar: { type: Number, default: 0 },
        },

        // Character count
        charCount: {
            type: Number,
            default: 0,
        },

        // Author name
        author: {
            type: String,
            default: 'AI Assistant',
        },

        // Admin fields
        adminnote: {
            type: String,
            default: null,
        },

        adminattachment: {
            type: String,
            default: null,
        },

        // Status: Pending, Approved, Rejected, Published
        status: {
            type: String,
            enum: ['Pending', 'Approved', 'Rejected', 'Published'],
            default: 'Pending',
        },

        // Published date
        publishedAt: {
            type: Date,
            default: null,
        },

        // Additional metadata
        metadata: {
            type: Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

// Generate identifier before save
AIContentSchema.pre('save', function(next) {
    if (!this.identifier) {
        const prefix = this.contentType === 'writing' ? 'AIW' : 'AIS';
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        this.identifier = `${prefix}-${timestamp}-${random}`;
    }
    next();
});

export const aiContentModel = model("aicontents", AIContentSchema);