const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ForumPost = sequelize.define('ForumPost', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    title_ar: {
      type: DataTypes.STRING
    },
    content_ar: {
      type: DataTypes.TEXT
    },
    type: {
      type: DataTypes.ENUM('discussion', 'question', 'announcement'),
      defaultValue: 'discussion'
    },
    category: {
      type: DataTypes.ENUM('mental-health', 'leadership', 'education-study', 'equality-rights', 'career-skills', 'womens-health')
    },
    tags: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    attachments: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    likes: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    views: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    viewers: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    authorId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    isLocked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'forum_posts',
    timestamps: true
  });

  return ForumPost;
};