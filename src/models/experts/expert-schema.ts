import { Schema, model } from "mongoose";

const expertSchema = new Schema({
    identifier: {
        type: String,
        // required: true,
        unique: true
    },
    name: {
        type: String,
    },
    email: {
        type: String,
        unique: true,
    },
    phoneNumber: {
        type: String,
        default: null
    },
    profilePic: {
        type: String,
        default: null
    },
    hourly_rate: {
        type: String,
        default: null
    },
    whatsapp_number: {
        type: String,
        default: null
    },
    linkedin: {
        type: String,
        default: null
    },
    bio: {
        type: String,
        default: null
    },
    expertise: [{
        type: String
    }],

    isActive: {
        type: Boolean,
        default: true
    },


}, { timestamps: true })


export const expertsModel = model("experts", expertSchema)
