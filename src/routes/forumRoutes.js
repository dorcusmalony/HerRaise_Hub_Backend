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
  getFeedbackPosts,
  getCategories,
  getPostsByCategory,
  createPostInCategory,
  getCategoryStats
} = require('../controllers/forumController');
// Category routes
router.get('/categories', getCategories);
router.get('/categories/:category/posts', getPostsByCategory);
router.post('/categories/:category/posts', protect, createPostInCategory);
router.get('/categories/:category/stats', getCategoryStats);

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

module.exports = router;
