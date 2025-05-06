// routes/pageContent.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const PageContent = require('../models/PageContent');

// Basic route to confirm page content routes are working
router.get('/', (req, res) => {
  res.json({ message: 'Page Content routes are working' });
});

// @route   GET api/page-content/pages
// @desc    Get all pages (basic info only)
// @access  Private
router.get('/pages', auth, async (req, res) => {
  try {
    // Get basic page info (no sections content)
    const pages = await PageContent.find()
      .select('pageName pageTitle description isPublished createdAt lastModifiedAt')
      .populate('createdBy', 'username')
      .populate('lastModifiedBy', 'username')
      .sort({ pageName: 1 });

    res.json(pages);
  } catch (err) {
    console.error('Error fetching pages:', err.message);
    res.status(500).json({
      message: 'Server error while fetching pages',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
  }
});

// @route   GET api/page-content/pages/:pageName
// @desc    Get page by pageName
// @access  Private
router.get('/pages/:pageName', auth, async (req, res) => {
  try {
    const page = await PageContent.findOne({ pageName: req.params.pageName })
      .populate('createdBy', 'username')
      .populate('lastModifiedBy', 'username')
      .populate('sections.lastModifiedBy', 'username');

    if (!page) {
      return res.status(404).json({ message: 'Page not found' });
    }

    res.json(page);
  } catch (err) {
    console.error('Error fetching page:', err.message);
    res.status(500).json({
      message: 'Server error while fetching page',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
  }
});

// @route   POST api/page-content/pages
// @desc    Create a new page
// @access  Private (Admin only)
router.post('/pages', [auth, roleAuth('admin')], async (req, res) => {
  try {
    const {
      pageName,
      pageTitle,
      description,
      sections,
      isPublished
    } = req.body;

    // Check if page already exists
    let page = await PageContent.findOne({ pageName });
    if (page) {
      return res.status(400).json({ message: 'Page with this name already exists' });
    }

    // Create new page
    page = new PageContent({
      pageName,
      pageTitle,
      description: description || '',
      sections: sections || [],
      isPublished: isPublished !== undefined ? isPublished : true,
      createdBy: req.user.user.id,
      lastModifiedBy: req.user.user.id
    });

    await page.save();
    
    // Populate references
    await page.populate('createdBy', 'username');
    await page.populate('lastModifiedBy', 'username');
    if (page.sections && page.sections.length > 0) {
      await page.populate('sections.lastModifiedBy', 'username');
    }

    res.json(page);
  } catch (err) {
    console.error('Error creating page:', err.message);
    res.status(500).json({
      message: 'Server error while creating page',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
  }
});

// @route   PUT api/page-content/pages/:pageName
// @desc    Update a page
// @access  Private (Admin only)
router.put('/pages/:pageName', [auth, roleAuth('admin')], async (req, res) => {
  try {
    const {
      pageTitle,
      description,
      isPublished
    } = req.body;

    // Find the page
    let page = await PageContent.findOne({ pageName: req.params.pageName });
    if (!page) {
      return res.status(404).json({ message: 'Page not found' });
    }

    // Update page metadata
    if (pageTitle) page.pageTitle = pageTitle;
    if (description !== undefined) page.description = description;
    if (isPublished !== undefined) page.isPublished = isPublished;
    
    page.lastModifiedBy = req.user.user.id;
    page.lastModifiedAt = Date.now();

    await page.save();
    
    // Populate references
    await page.populate('createdBy', 'username');
    await page.populate('lastModifiedBy', 'username');
    if (page.sections && page.sections.length > 0) {
      await page.populate('sections.lastModifiedBy', 'username');
    }

    res.json(page);
  } catch (err) {
    console.error('Error updating page:', err.message);
    res.status(500).json({
      message: 'Server error while updating page',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
  }
});

// @route   POST api/page-content/pages/:pageName/sections
// @desc    Add a section to a page
// @access  Private (Admin only)
router.post('/pages/:pageName/sections', [auth, roleAuth('admin')], async (req, res) => {
  try {
    const {
      title,
      content,
      order,
      isVisible
    } = req.body;

    // Find the page
    let page = await PageContent.findOne({ pageName: req.params.pageName });
    if (!page) {
      return res.status(404).json({ message: 'Page not found' });
    }

    // Create new section
    const newSection = {
      title,
      content,
      order: order !== undefined ? order : page.sections.length,
      isVisible: isVisible !== undefined ? isVisible : true,
      lastModifiedBy: req.user.user.id,
      lastModifiedAt: Date.now()
    };

    // Add section to page
    page.sections.push(newSection);
    page.lastModifiedBy = req.user.user.id;
    page.lastModifiedAt = Date.now();

    await page.save();
    
    // Populate references
    await page.populate('createdBy', 'username');
    await page.populate('lastModifiedBy', 'username');
    await page.populate('sections.lastModifiedBy', 'username');

    res.json(page);
  } catch (err) {
    console.error('Error adding section:', err.message);
    res.status(500).json({
      message: 'Server error while adding section',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
  }
});

// @route   PUT api/page-content/pages/:pageName/sections/:sectionId
// @desc    Update a section
// @access  Private (Admin only)
router.put('/pages/:pageName/sections/:sectionId', [auth, roleAuth('admin')], async (req, res) => {
  try {
    const {
      title,
      content,
      order,
      isVisible
    } = req.body;

    // Find the page
    let page = await PageContent.findOne({ pageName: req.params.pageName });
    if (!page) {
      return res.status(404).json({ message: 'Page not found' });
    }

    // Find the section
    const sectionIndex = page.sections.findIndex(section => section._id.toString() === req.params.sectionId);
    if (sectionIndex === -1) {
      return res.status(404).json({ message: 'Section not found' });
    }

    // Update section
    if (title) page.sections[sectionIndex].title = title;
    if (content) page.sections[sectionIndex].content = content;
    if (order !== undefined) page.sections[sectionIndex].order = order;
    if (isVisible !== undefined) page.sections[sectionIndex].isVisible = isVisible;
    
    page.sections[sectionIndex].lastModifiedBy = req.user.user.id;
    page.sections[sectionIndex].lastModifiedAt = Date.now();
    
    page.lastModifiedBy = req.user.user.id;
    page.lastModifiedAt = Date.now();

    await page.save();
    
    // Populate references
    await page.populate('createdBy', 'username');
    await page.populate('lastModifiedBy', 'username');
    await page.populate('sections.lastModifiedBy', 'username');

    res.json(page);
  } catch (err) {
    console.error('Error updating section:', err.message);
    res.status(500).json({
      message: 'Server error while updating section',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
  }
});

// @route   DELETE api/page-content/pages/:pageName/sections/:sectionId
// @desc    Delete a section
// @access  Private (Admin only)
router.delete('/pages/:pageName/sections/:sectionId', [auth, roleAuth('admin')], async (req, res) => {
  try {
    // Find the page
    let page = await PageContent.findOne({ pageName: req.params.pageName });
    if (!page) {
      return res.status(404).json({ message: 'Page not found' });
    }

    // Find the section
    const sectionIndex = page.sections.findIndex(section => section._id.toString() === req.params.sectionId);
    if (sectionIndex === -1) {
      return res.status(404).json({ message: 'Section not found' });
    }

    // Remove section
    page.sections.splice(sectionIndex, 1);
    page.lastModifiedBy = req.user.user.id;
    page.lastModifiedAt = Date.now();

    await page.save();
    
    // Populate references
    await page.populate('createdBy', 'username');
    await page.populate('lastModifiedBy', 'username');
    if (page.sections.length > 0) {
      await page.populate('sections.lastModifiedBy', 'username');
    }

    res.json(page);
  } catch (err) {
    console.error('Error deleting section:', err.message);
    res.status(500).json({
      message: 'Server error while deleting section',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
  }
});

// @route   DELETE api/page-content/pages/:pageName
// @desc    Delete a page
// @access  Private (Admin only)
router.delete('/pages/:pageName', [auth, roleAuth('admin')], async (req, res) => {
  try {
    // Find and delete the page
    const page = await PageContent.findOneAndDelete({ pageName: req.params.pageName });
    
    if (!page) {
      return res.status(404).json({ message: 'Page not found' });
    }

    res.json({ message: 'Page deleted successfully' });
  } catch (err) {
    console.error('Error deleting page:', err.message);
    res.status(500).json({
      message: 'Server error while deleting page',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
  }
});

module.exports = router;