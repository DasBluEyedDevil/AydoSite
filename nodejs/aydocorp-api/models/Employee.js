const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    fullName: {
        type: String,
        required: true
    },
    photo: {
        type: String,
        default: 'default-profile.jpg'
    },
    backgroundStory: {
        type: String,
        default: ''
    },
    rank: {
        type: String,
        default: 'Recruit'
    },
    department: {
        type: String,
        default: 'General'
    },
    joinDate: {
        type: Date,
        default: Date.now
    },
    specializations: {
        type: [String],
        default: []
    },
    certifications: {
        type: [String],
        default: []
    },
    contactInfo: {
        discord: String,
        rsiHandle: String,
        email: String
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastActive: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Employee', EmployeeSchema);