const mongoose = require('mongoose');

// Define the EmailCapture schema
const emailCaptureSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Create the model for EmailCapture
const EmailCapture = mongoose.model('EmailCapture', emailCaptureSchema);

module.exports = EmailCapture;