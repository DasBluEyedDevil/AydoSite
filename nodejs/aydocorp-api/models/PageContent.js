// models/PageContent.js
const mongoose = require('mongoose');

const SectionSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    order: {
        type: Number,
        default: 0
    },
    isVisible: {
        type: Boolean,
        default: true
    },
    lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    lastModifiedAt: {
        type: Date,
        default: Date.now
    }
});

const PageContentSchema = new mongoose.Schema({
    pageName: {
        type: String,
        required: true,
        unique: true
    },
    pageTitle: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    sections: [SectionSchema],
    isPublished: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    lastModifiedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('PageContent', PageContentSchema);