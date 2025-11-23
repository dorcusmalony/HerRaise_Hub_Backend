# Parental Consent Implementation for Minors

## Overview
The HerRaise Hub platform now supports users aged 13-45, with automatic parental consent tracking for users under 18.

## Database Changes

### User Model Fields Added
```javascript
isMinor: { type: DataTypes.BOOLEAN, defaultValue: false }
guardianName: DataTypes.STRING
parentalConsentGiven: { type: DataTypes.BOOLEAN, defaultValue: false }
parentalConsentDate: DataTypes.DATE
```

Add these fields to the User model definition in `src/config/database.js` after the `emailVerificationExpires` field.

## Registration Flow

### Frontend Sends
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "SecurePass123!",
  "dateOfBirth": "2008-05-15",
  "guardianName": "Mary Doe",
  "role": "mentee",
  "language": "en",
  "phoneNumber": "+1234567890",
  "location": { "city": "New York", "state": "NY" },
  "interests": ["leadership", "tech"],
  "educationLevel": "secondary"
}
```

### Backend Processing
1. **Age Calculation**: Calculates age from `dateOfBirth`
2. **Minor Detection**: If age < 18, marks as `isMinor: true`
3. **Guardian Validation**: Requires `guardianName` for minors
4. **Consent Recording**: Sets `parentalConsentGiven: true` and `parentalConsentDate: now()`
5. **Email Verification**: Sends verification email regardless of age

### Response
```json
{
  "success": true,
  "message": "Registration successful. Parent/guardian consent has been recorded. Please verify your email.",
  "email": "jane@example.com",
  "requiresVerification": true,
  "isMinor": true,
  "guardianName": "Mary Doe"
}
```

## Implementation Files

### New Files Created
- `src/utils/ageHelper.js` - Age calculation utility
- `src/controllers/registerHandler.js` - Register handler with parental consent logic

### Files to Update
- `src/config/database.js` - Add parental consent fields to User model
- `src/controllers/authController.js` - Use new register handler (optional, can keep existing)

## Usage

### Option 1: Use New Handler (Recommended)
Update `src/routes/authRoutes.js`:
```javascript
const { handleRegister } = require('../controllers/registerHandler');
router.post('/register', handleRegister);
```

### Option 2: Keep Existing Controller
The existing `authController.js` can be updated to include the age calculation and parental consent logic.

## Database Sync
When you restart the server with Sequelize's `alter: true` option, the new fields will be automatically added to the Users table.

## Age Groups Supported
- **13-17**: Minors (requires guardian name, parental consent recorded)
- **18+**: Adults (no guardian required)
- **45+**: Supported (no age restrictions)

## Verification Flow
1. User registers with age < 18 and guardian name
2. System records `isMinor: true`, `parentalConsentGiven: true`
3. Verification email sent to user's email
4. User verifies email to activate account
5. User can now log in and access platform

## Notes
- Guardian name is stored but not used for further verification (frontend handles guardian approval if needed)
- Parental consent is automatically given at registration for minors
- Age is calculated at registration time and stored in `dateOfBirth`
- All users (minors and adults) must verify their email before logging in
