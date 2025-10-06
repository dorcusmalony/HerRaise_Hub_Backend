const mongooseBadge = require('../models/badges');

const badges = [
  {
    name: 'Early Bird',
    description: 'Active for 30 minutes daily for 7 consecutive days',
    icon: '🌅',
    criteria: {
      type: 'activity-time',
      threshold: 30
    },
    points: 50
  },
  {
    name: 'Dedicated Learner',
    description: 'Active for 30 minutes daily for 30 consecutive days',
    icon: '📚',
    criteria: {
      type: 'activity-time',
      threshold: 30
    },
    points: 200
  },
  {
    name: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: '🔥',
    criteria: {
      type: 'streak',
      threshold: 7
    },
    points: 30
  },
  {
    name: 'Month Master',
    description: 'Maintain a 30-day streak',
    icon: '⭐',
    criteria: {
      type: 'streak',
      threshold: 30
    },
    points: 150
  },
  {
    name: 'Resource Explorer',
    description: 'View or download 20 resources',
    icon: '🗺️',
    criteria: {
      type: 'resources',
      threshold: 20
    },
    points: 40
  },
  {
    name: 'Knowledge Seeker',
    description: 'View or download 100 resources',
    icon: '🎓',
    criteria: {
      type: 'resources',
      threshold: 100
    },
    points: 150
  },
  {
    name: 'Goal Setter',
    description: 'Create or update 5 goals',
    icon: '🎯',
    criteria: {
      type: 'goals',
      threshold: 5
    },
    points: 30
  },
  {
    name: 'Goal Achiever',
    description: 'Create or update 20 goals',
    icon: '🏆',
    criteria: {
      type: 'goals',
      threshold: 20
    },
    points: 100
  },
  {
    name: 'Community Voice',
    description: 'Create 10 posts',
    icon: '💬',
    criteria: {
      type: 'posts',
      threshold: 10
    },
    points: 50
  },
  {
    name: 'Helpful Mentor',
    description: 'Add 50 comments',
    icon: '🤝',
    criteria: {
      type: 'comments',
      threshold: 50
    },
    points: 75
  }
];

const seedBadges = async () => {
  try {
    const dbModule = require('../config/database');

    // If using Sequelize (Postgres) and models exported, use them
    if (dbModule.models && dbModule.models.Badge) {
      const { Badge } = dbModule.models;
      await Badge.destroy({ where: {}, truncate: true, cascade: true });
      // Bulk create (criteria stored as JSON)
      await Badge.bulkCreate(badges.map(b => ({
        name: b.name,
        description: b.description,
        icon: b.icon,
        criteria: b.criteria,
        points: b.points
      })));
      console.log('✅ Badges seeded successfully (Postgres)');
      return;
    }

    // Fallback to Mongoose Badge
    await mongooseBadge.deleteMany();
    await mongooseBadge.insertMany(badges);
    console.log('✅ Badges seeded successfully (MongoDB)');
  } catch (error) {
    console.error('❌ Error seeding badges:', error);
  }
};

module.exports = seedBadges;