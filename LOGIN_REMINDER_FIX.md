# Fix: Login Reminder Not Sending

## Problem
Applications have status `pending` but login check only looks for `['interested', 'in_progress']`

## Solution
In `src/controllers/authController.js`, around line 310, change:

```javascript
// OLD - doesn't find pending applications
applicationStatus: {
  [Op.in]: ['interested', 'in_progress']
}

// NEW - includes pending status
applicationStatus: {
  [Op.in]: ['interested', 'in_progress', 'pending']
}
```

## Full Code Section
```javascript
const pendingOpportunities = await OpportunityInteraction.findAll({
  where: {
    userId: user.id,
    isInterested: true,
    applicationStatus: {
      [Op.in]: ['interested', 'in_progress', 'pending']  // ← Add 'pending'
    }
  },
  include: [{
    model: Opportunity,
    where: {
      applicationDeadline: {
        [Op.between]: [now, sevenDaysFromNow]
      },
      isActive: true
    },
    attributes: ['id', 'title', 'organization', 'applicationDeadline', 'type']
  }],
  order: [[Opportunity, 'applicationDeadline', 'ASC']]
});
```

## Result
✓ Now finds applications with status `pending`
✓ Sends reminders on login
✓ Shows popup with opportunity details
