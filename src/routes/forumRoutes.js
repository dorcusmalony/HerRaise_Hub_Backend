const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getPosts,
  createPost,
  getPost,
  updatePost,
  deletePost,
  addComment,
  updateComment,
  deleteComment,
  togglePostLike,
  toggleCommentLike,
  createFeedbackPost,
  getFeedbackPosts
} = require('../controllers/forumController');
const {
  uploadMultiple,
  handleMultipleUpload,
  testSupabase
} = require('../controllers/uploadController');

// Post routes
router.get('/posts', getPosts);
router.post('/posts', protect, createPost);
router.get('/posts/feedback', getFeedbackPosts);
router.post('/posts/feedback', protect, createFeedbackPost);
router.get('/posts/:id', getPost);
router.put('/posts/:id', protect, updatePost);
router.delete('/posts/:id', protect, deletePost);

// Post interactions
router.post('/posts/:id/like', protect, togglePostLike);
router.post('/posts/:id/comments', protect, addComment);

// Comment routes
router.put('/comments/:id', protect, updateComment);
router.delete('/comments/:id', protect, deleteComment);
router.post('/comments/:id/like', protect, toggleCommentLike);

// File upload routes
router.post('/upload', protect, uploadMultiple, handleMultipleUpload);

// Test Supabase connection
router.get('/test-supabase', testSupabase);

module.exports = router;
