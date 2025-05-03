// routes/forum.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Post = require('../models/Post');
// Remove or comment out this line since it's not used in this file:
// const User = require('../models/User');

// Basic route to confirm forum routes are working
router.get('/', (req, res) => {
  res.json({ message: 'Forum routes are working' });
});

// @route   GET api/forum/posts
// @desc    Get all posts
// @access  Private
router.get('/posts', auth, async (req, res) => {
    try {
        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .populate('author', 'username');
        
        res.json(posts);
    } catch (err) {
        console.error('Error fetching posts:', err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/forum/posts
// @desc    Create a new post
// @access  Private
router.post('/posts', auth, async (req, res) => {
    try {
        const { title, content, category } = req.body;
        
        const newPost = new Post({
            title,
            content,
            category: category || 'General',
            author: req.user.user.id,
            pinned: false
        });
        
        const post = await newPost.save();
        await post.populate('author', 'username');
        
        res.json(post);
    } catch (err) {
        console.error('Error creating post:', err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/forum/posts/:id
// @desc    Get post by ID
// @access  Private
router.get('/posts/:id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate('author', 'username')
            .populate({
                path: 'replies',
                populate: {
                    path: 'author',
                    select: 'username'
                }
            });
            
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        
        res.json(post);
    } catch (err) {
        console.error('Error fetching post:', err.message);
        
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Post not found' });
        }
        
        res.status(500).send('Server error');
    }
});

module.exports = router;