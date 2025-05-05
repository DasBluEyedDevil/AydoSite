const mongoose = require('mongoose');

const RankSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    level: {
        type: Number,
        required: true
    },
    paygrade: {
        type: String,
        required: true
    },
    responsibilities: {
        type: [String],
        default: []
    },
    requirements: {
        type: [String],
        default: []
    }
});

const CertificationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    requirements: {
        type: [String],
        default: []
    },
    benefits: {
        type: [String],
        default: []
    }
});

const TrainingGuideSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    forRank: {
        type: String,
        default: 'All'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
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

const CareerPathSchema = new mongoose.Schema({
    department: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        required: true
    },
    ranks: [RankSchema],
    certifications: [CertificationSchema],
    trainingGuides: [TrainingGuideSchema],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('CareerPath', CareerPathSchema);