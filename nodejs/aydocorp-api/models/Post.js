// models/Post.js
const mongoose = require('mongoose');

const ReplySchema = new mongoose.Schema({
    content: {
        type: String,
        required: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const PostSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    category: {
        type: String,
        default: 'General'
    },
    pinned: {
        type: Boolean,
        default: false
    },
    replies: [ReplySchema],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Post', PostSchema);