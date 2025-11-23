// Add these fields to the User model definition in database.js
// Insert after emailVerificationExpires field:

/*
    isMinor: { type: DataTypes.BOOLEAN, defaultValue: false },
    guardianName: DataTypes.STRING,
    parentalConsentGiven: { type: DataTypes.BOOLEAN, defaultValue: false },
    parentalConsentDate: DataTypes.DATE
*/

// This will be added to the User model around line 220 in database.js
