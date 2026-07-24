import mongoose from "mongoose"

const adminSchema = new mongoose.Schema({
    identifier: {
        type: String,
        // required: true,
        unique: true
    },
    role: {
        type: String,
        requried: true
    },
    name: {
        type: String,
        requried: true
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
        default: null
    },
    profilePic: {
        type: String,
        default: null
    },
    timezone: {
        type: String,
        default: null
    },
    bio: {
        type: String,
        default: null
    },


    address: { type: String },
}, { timestamps: true })

export const adminModel = mongoose.model("admin", adminSchema)