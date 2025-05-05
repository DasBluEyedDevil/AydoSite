const mongoose = require('mongoose');

const AttachmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    fileType: {
        type: String,
        required: true
    },
    filePath: {
        type: String,
        required: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    }
});

const OperationSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['document', 'diagram', 'tactical-plan', 'procedure', 'other'],
        default: 'document'
    },
    classification: {
        type: String,
        enum: ['public', 'internal', 'confidential', 'restricted'],
        default: 'internal'
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    attachments: [AttachmentSchema],
    relatedOperations: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Operation'
    }],
    version: {
        type: String,
        default: '1.0'
    },
    status: {
        type: String,
        enum: ['draft', 'active', 'archived', 'deprecated'],
        default: 'active'
    },
    accessRoles: {
        type: [String],
        default: ['admin'] // Default access to admins only
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

module.exports = mongoose.model('Operation', OperationSchema);