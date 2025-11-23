// CHANGE THIS LINE (around line 310):

// OLD:
applicationStatus: {
  [Op.in]: ['interested', 'in_progress']
}

// NEW:
applicationStatus: {
  [Op.in]: ['interested', 'in_progress', 'pending']
}

// This is in the login function, in the OpportunityInteraction.findAll() query
