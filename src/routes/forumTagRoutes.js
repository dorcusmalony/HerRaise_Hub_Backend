const express = require('express');
const router = express.Router();
const { models } = require('../config/database');
const { Op } = require('sequelize');

// @desc    Get users who can be tagged in a category
// @route   GET /api/forum/categories/:category/taggable-users
// @access  Private
router.get('/categories/:category/taggable-users', async (req, res) => {
  try {
    const { category } = req.params;
    const { search = '' } = req.query;

    // Get users who have posted or commented in this category
    const userIds = await models.ForumPost.findAll({
      where: {
        [Op.or]: [
          { category },
          { category: null }
        ]
      },
      attributes: ['authorId'],
      include: [{
        model: models.ForumComment,
        attributes: ['authorId']
      }]
    });

    // Extract unique user IDs
    const uniqueUserIds = new Set();
    userIds.forEach(post => {
      uniqueUserIds.add(post.authorId);
      post.ForumComments?.forEach(comment => {
        uniqueUserIds.add(comment.authorId);
      });
    });

    // Get user details
    const users = await models.User.findAll({
      where: {
        id: Array.from(uniqueUserIds),
        name: {
          [Op.iLike]: `%${search}%`
        }
      },
      attributes: ['id', 'name', 'profilePicture'],
      limit: 10
    });

    res.json({
      success: true,
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;