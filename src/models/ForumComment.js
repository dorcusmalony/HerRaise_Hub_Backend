const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ForumComment = sequelize.define('ForumComment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    content_ar: {
      type: DataTypes.TEXT
    },
    postId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    authorId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    parentCommentId: {
      type: DataTypes.UUID
    },
    likes: {
      type: DataTypes.JSON,
      defaultValue: []
    }
  }, {
    tableName: 'forum_comments',
    timestamps: true
  });

  return ForumComment;
};