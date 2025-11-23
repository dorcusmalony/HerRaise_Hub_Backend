const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING },
    role: { type: DataTypes.ENUM('mentee', 'mentor', 'admin'), defaultValue: 'mentee' },
    profilePicture: DataTypes.STRING,
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    totalPoints: { type: DataTypes.INTEGER, defaultValue: 0 },
    level: { type: DataTypes.INTEGER, defaultValue: 1 },
    resetPasswordToken: DataTypes.STRING,
    resetPasswordExpire: DataTypes.DATE,
    language: { type: DataTypes.STRING, defaultValue: 'en', allowNull: false },
    phoneNumber: { type: DataTypes.STRING, defaultValue: '+211900000000', allowNull: false },
    location: { type: DataTypes.JSONB, defaultValue: { city: 'Unknown', state: 'Unknown' } },
    dateOfBirth: { type: DataTypes.DATE, defaultValue: () => { const d = new Date(); d.setFullYear(d.getFullYear() - 18); return d; } },
    interests: { type: DataTypes.JSONB, defaultValue: ['personal growth', 'career development'] },
    educationLevel: { type: DataTypes.STRING, defaultValue: 'secondary', allowNull: false },
    yearsOfExperience: { type: DataTypes.INTEGER, defaultValue: 0 },
    isVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
    verificationDate: DataTypes.DATE,
    emailVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
    emailVerificationToken: DataTypes.STRING,
    emailVerificationExpires: DataTypes.DATE,
    isMinor: { type: DataTypes.BOOLEAN, defaultValue: false },
    guardianName: DataTypes.STRING,
    parentalConsentGiven: { type: DataTypes.BOOLEAN, defaultValue: false },
    parentalConsentDate: DataTypes.DATE
  }, { timestamps: true });

  return User;
};
