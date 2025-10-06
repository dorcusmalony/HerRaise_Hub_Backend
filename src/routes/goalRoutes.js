const express = require('express');
const router = express.Router();
const {
  createGoal,
  getMyGoals,
  getGoal,
  updateGoal,
  deleteGoal,
  addMentorComment,
  updateMilestone,
  getGoalsForReview,
  sendGoalReminder // added
} = require('../controllers/goalController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(protect, getMyGoals)
  .post(protect, authorize('mentee', 'mentor'), createGoal);

router.route('/mentor/review')
  .get(protect, authorize('mentor', 'admin'), getGoalsForReview);

router.route('/:id')
  .get(protect, getGoal)
  .put(protect, updateGoal)
  .delete(protect, deleteGoal);

router.route('/:id/comments')
  .post(protect, authorize('mentor', 'admin'), addMentorComment);

router.route('/:id/milestones/:milestoneId')
  .put(protect, updateMilestone);

// New route: manual reminder / encouragement trigger
router.route('/:id/remind')
  .post(protect, sendGoalReminder);

module.exports = router;