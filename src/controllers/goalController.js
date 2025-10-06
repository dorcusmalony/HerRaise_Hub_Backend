const Goal = require('../models/goal');
const UserActivity = require('../models/UserActivity');

// @desc    Create a new goal
// @route   POST /api/goals
// @access  Private (Mentee)
exports.createGoal = async (req, res) => {
  try {
    const { title, description, type, category, targetDate, milestones } = req.body;

    const goal = await Goal.create({
      user: req.user.id,
      title,
      description,
      type,
      category,
      targetDate,
      milestones: milestones || []
    });

    // Record activity
    let activity = await UserActivity.findOne({ user: req.user.id });
    if (!activity) {
      activity = await UserActivity.create({ user: req.user.id });
    }
    await activity.recordActivity('goalsUpdated');

    res.status(201).json({
      success: true,
      goal
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all goals for logged-in user
// @route   GET /api/goals
// @access  Private
exports.getMyGoals = async (req, res) => {
  try {
    const { status, type } = req.query;
    
    let filter = { user: req.user.id };
    
    if (status) filter.status = status;
    if (type) filter.type = type;

    const goals = await Goal.find(filter)
      .populate('mentorComments.mentor', 'name profilePicture')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: goals.length,
      goals
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single goal
// @route   GET /api/goals/:id
// @access  Private
exports.getGoal = async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id)
      .populate('mentorComments.mentor', 'name profilePicture role');

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    // Check ownership or mentor access
    if (goal.user.toString() !== req.user.id && req.user.role !== 'mentor' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this goal'
      });
    }

    res.status(200).json({
      success: true,
      goal
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update goal
// @route   PUT /api/goals/:id
// @access  Private (Owner)
exports.updateGoal = async (req, res) => {
  try {
    let goal = await Goal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    // Check ownership
    if (goal.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this goal'
      });
    }

    const { title, description, type, category, targetDate, status, progress, milestones } = req.body;

    goal = await Goal.findByIdAndUpdate(
      req.params.id,
      { title, description, type, category, targetDate, status, progress, milestones },
      { new: true, runValidators: true }
    );

    // If goal is completed, set completedAt
    if (status === 'completed' && !goal.completedAt) {
      goal.completedAt = Date.now();
      await goal.save();
    }

    // Record activity
    const activity = await UserActivity.findOne({ user: req.user.id });
    if (activity) {
      await activity.recordActivity('goalsUpdated');
    }

    res.status(200).json({
      success: true,
      goal
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete goal
// @route   DELETE /api/goals/:id
// @access  Private (Owner)
exports.deleteGoal = async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    // Check ownership
    if (goal.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this goal'
      });
    }

    await goal.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Goal deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Add mentor comment to goal
// @route   POST /api/goals/:id/comments
// @access  Private (Mentor/Admin)
exports.addMentorComment = async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    const { comment } = req.body;

    goal.mentorComments.push({
      mentor: req.user.id,
      comment
    });

    await goal.save();

    await goal.populate('mentorComments.mentor', 'name profilePicture role');

    res.status(200).json({
      success: true,
      goal
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update milestone status
// @route   PUT /api/goals/:id/milestones/:milestoneId
// @access  Private (Owner)
exports.updateMilestone = async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    // Check ownership
    if (goal.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this goal'
      });
    }

    const milestone = goal.milestones.id(req.params.milestoneId);
    
    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: 'Milestone not found'
      });
    }

    const { isCompleted } = req.body;
    
    milestone.isCompleted = isCompleted;
    if (isCompleted) {
      milestone.completedAt = Date.now();
    } else {
      milestone.completedAt = null;
    }

    // Update overall progress safely (guard against zero milestones)
    const totalMilestones = goal.milestones.length || 1;
    const completedMilestones = goal.milestones.filter(m => m.isCompleted).length;
    goal.progress = Math.round((completedMilestones / totalMilestones) * 100);

    await goal.save();

    // Automated encouragement/reminder logic
    let encouragement = null;
    try {
      if (goal.reminders && goal.reminders.enabled) {
        const now = new Date();
        const lastSent = goal.reminders.lastSent;
        const freqMap = { daily: 1, weekly: 7, 'bi-weekly': 14, monthly: 30 };
        const freqDays = freqMap[goal.reminders.frequency] || 7;
        const daysSince = lastSent ? Math.floor((now - new Date(lastSent)) / (1000 * 60 * 60 * 24)) : Infinity;

        // Send encouragement if enough days have passed OR milestone just completed
        if (isCompleted || daysSince >= freqDays) {
          encouragement = generateEncouragementMessage(goal);
          goal.reminders.lastSent = now;
          await goal.save();
        }
      }
    } catch (e) {
      // do not block success if encouragement logic fails
      console.error('Encouragement logic error:', e.message);
    }

    res.status(200).json({
      success: true,
      goal,
      encouragement // may be null when nothing sent
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all goals for mentors to review
// @route   GET /api/goals/mentor/review
// @access  Private (Mentor/Admin)
exports.getGoalsForReview = async (req, res) => {
  try {
    const goals = await Goal.find({ isPublic: true })
      .populate('user', 'name profilePicture')
      .populate('mentorComments.mentor', 'name profilePicture')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: goals.length,
      goals
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// helper: generate an encouragement message based on progress
function generateEncouragementMessage(goal) {
  if (!goal) return null;

  const progress = goal.progress || 0;
  if (progress >= 100) {
    return `🎉 Congratulations! You completed the goal "${goal.title}". Consider setting a new challenge!`;
  } else if (progress >= 75) {
    return `🌟 Great job! You're ${progress}% of the way to "${goal.title}". Keep pushing — you're almost there.`;
  } else if (progress >= 50) {
    return `💪 Nice progress! You're halfway through "${goal.title}" at ${progress}%. Stay consistent and you'll make it.`;
  } else if (progress > 0) {
    return `👍 You're making progress on "${goal.title}" (${progress}%). Keep it up — small steps add up.`;
  } else {
    return `👋 A reminder for your goal "${goal.title}". Try completing a small task today to move it forward.`;
  }
}

// New controller: manual trigger to send a reminder/encouragement for a goal
exports.sendGoalReminder = async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    // Only owner or mentors/admins can trigger manual reminders
    if (goal.user.toString() !== req.user.id && req.user.role !== 'mentor' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to send a reminder for this goal'
      });
    }

    // If reminders are disabled, return informative message but still generate encouragement
    const encouragement = generateEncouragementMessage(goal);
    if (goal.reminders) {
      goal.reminders.lastSent = Date.now();
      await goal.save();
    }

    res.status(200).json({
      success: true,
      message: 'Reminder sent',
      encouragement
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};