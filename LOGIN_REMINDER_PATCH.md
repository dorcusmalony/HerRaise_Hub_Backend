# Login Reminder Patch

## File: src/controllers/authController.js

### Step 1: Add import at the top
```javascript
const { sendIncompleteApplicationReminders } = require('../utils/applicationReminder');
```

### Step 2: In the login function, after email verification check (around line 280), add:

```javascript
    // Check if email is verified
    if (!user.emailVerified) {
      return res.status(401).json({
        success: false,
        message: 'Please verify your email before logging in',
        requiresVerification: true,
        email: user.email
      });
    }

    // SEND INCOMPLETE APPLICATION REMINDERS
    try {
      await sendIncompleteApplicationReminders(user.id);
    } catch (reminderError) {
      console.log('Failed to send application reminders:', reminderError.message);
    }

    const token = generateToken(user.id);
```

## What This Does

When user logs in:
1. Checks for all draft/incomplete applications
2. For each incomplete app, sends notification:
   - Title: "📝 Complete Your Application"
   - Message: "You have an incomplete application for [opportunity] at [organization]. X days left to submit!"
3. Notifications appear immediately in user's notification feed

## Result

User sees reminders like:
- "You have an incomplete application for Marketing Internship at TechCorp. 5 days left to submit!"
- "You have an incomplete application for Scholarship Program at University. 2 days left to submit!"
