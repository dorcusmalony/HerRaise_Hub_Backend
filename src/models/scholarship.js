const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Scholarship = sequelize.define('Scholarship', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('scholarship', 'internship', 'competition', 'conference'),
      allowNull: false
    },
    deadline: {
      type: DataTypes.DATE,
      allowNull: false
    },
    amount: {
      type: DataTypes.STRING
    },
    eligibility: {
      type: DataTypes.TEXT
    },
    applicationUrl: {
      type: DataTypes.STRING
    },
    location: {
      type: DataTypes.STRING
    },
    organization: {
      type: DataTypes.STRING
    },
    requirements: {
      type: DataTypes.TEXT
    },
    benefits: {
      type: DataTypes.TEXT
    },
    applicationDeadline: {
      type: DataTypes.DATE
    },
    startDate: {
      type: DataTypes.DATE
    },
    endDate: {
      type: DataTypes.DATE
    },
    tags: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      defaultValue: 'medium'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    isFeatured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    viewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    applicationCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    postedBy: {
      type: DataTypes.UUID,
      allowNull: false
    }
  });

  return Scholarship;
};