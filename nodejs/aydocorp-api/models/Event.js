const mongoose = require('mongoose');

const AttendeeSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['attending', 'maybe', 'declined'],
        default: 'attending'
    },
    joinedAt: {
        type: Date,
        default: Date.now
    }
});

const EventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    eventType: {
        type: String,
        enum: ['mission', 'training', 'social', 'meeting', 'other'],
        default: 'other'
    },
    location: {
        type: String,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date
    },
    isRecurring: {
        type: Boolean,
        default: false
    },
    recurrencePattern: {
        type: String,
        default: ''
    },
    organizer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    attendees: [AttendeeSchema],
    maxAttendees: {
        type: Number,
        default: 0 // 0 means unlimited
    },
    requirements: {
        type: String,
        default: ''
    },
    isPrivate: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Event', EventSchema);