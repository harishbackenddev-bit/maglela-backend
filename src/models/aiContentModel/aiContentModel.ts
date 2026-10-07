
import { Schema, model } from "mongoose";





const AIContentSchema = new Schema(
    {
        
        identifier: {
            type: String,
            unique: true,
        },

        
        userId: {
            type: String,
            required: true,
        },

        
        contentType: {
            type: String,
            enum: ['writing', 'speech'],
            required: true,
        },

        
        title: {
            type: String,
            required: true,
        },

        description: {
            type: String,
            default: '',
        },

        
        content: {
            type: String,
            required: true,
        },

        
        parameters: {
            authority: { type: Number, default: 0 },
            clarity: { type: Number, default: 0 },
            academicRigor: { type: Number, default: 0 },
            accessibility: { type: Number, default: 0 },
            narrativeDepth: { type: Number, default: 0 },
        },

        
        avgScore: {
            type: Number,
            default: 0,
        },

        
        duration: {
            type: String,
            default: '00:00',
        },

        
        audioUrl: {
            type: String,
            default: null,
        },

        
        provider: {
            type: String,
            default: 'openai',
        },

        aiModel: {
            type: String,
            default: 'gpt-4o',
        },

        
        cost: {
            usd: { type: Number, default: 0 },
            zar: { type: Number, default: 0 },
        },

        
        charCount: {
            type: Number,
            default: 0,
        },

        
        author: {
            type: String,
            default: 'AI Assistant',
        },

        
        adminnote: {
            type: String,
            default: null,
        },

        adminattachment: {
            type: String,
            default: null,
        },

        
        status: {
            type: String,
            enum: ['Pending', 'Approved', 'Rejected', 'Published'],
            default: 'Pending',
        },

        
        publishedAt: {
            type: Date,
            default: null,
        },

        
        metadata: {
            type: Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);


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