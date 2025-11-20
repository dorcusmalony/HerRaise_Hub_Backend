const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ShareZone = sequelize.define('ShareZone', {
    _id: { 
      type: DataTypes.UUID, 
      defaultValue: DataTypes.UUIDV4, 
      primaryKey: true 
    },
    title: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    content: { 
      type: DataTypes.TEXT 
    },
    category: { 
      type: DataTypes.ENUM('essays', 'projects', 'videos', 'resumes', 'cover-letters'), 
      allowNull: false 
    },
    fileUrl: { 
      type: DataTypes.TEXT 
    },
    externalLinks: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    linkType: {
      type: DataTypes.ENUM('file', 'google_drive', 'onedrive', 'dropbox', 'external'),
      defaultValue: 'file'
    },
    author: { 
      type: DataTypes.UUID, 
      allowNull: false 
    }
  }, { 
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  });

  return ShareZone;
};