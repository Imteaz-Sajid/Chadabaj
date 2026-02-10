const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { authenticate } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

// All routes require authentication
router.use(authenticate);

// Create a new post (with image upload)
router.post('/', upload.single('image'), postController.createPost);

// Get all posts (with optional area filter and pagination)
router.get('/', postController.getPosts);

// Get heatmap statistics data
router.get('/heatmap', postController.getHeatmapData);

// Get a specific post by ID
router.get('/:postId', postController.getPostById);

// Vote on a post
router.post('/:postId/vote', postController.votePost);

module.exports = router;
