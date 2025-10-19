const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getPosts,
  createPost,
  getPost,
  updatePost,
  deletePost
} = require('../controllers/forumController');

router.get('/posts', getPosts);
router.post('/posts', protect, createPost);
router.get('/posts/:id', getPost);
router.put('/posts/:id', protect, updatePost);
router.delete('/posts/:id', protect, deletePost);

module.exports = router;
