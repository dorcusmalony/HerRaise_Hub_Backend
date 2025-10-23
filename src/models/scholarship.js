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
      type: DataTypes.ENUM('scholarship', 'internship', 'competition'),
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
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    postedBy: {
      type: DataTypes.UUID,
      allowNull: false
    }
  });

  return Scholarship;
};