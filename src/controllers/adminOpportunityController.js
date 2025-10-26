const db = require('../config/database');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

// Get all opportunities with filters and pagination
exports.getOpportunities = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      type, 
      status, 
      priority, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    // Apply filters
    if (type) where.type = type;
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;
    if (priority) where.priority = priority;
    
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { organization: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { Scholarship, User } = db.models;
    const { rows: opportunities, count } = await Scholarship.findAndCountAll({
      where,
      include: [{ 
        model: User, 
        attributes: ['id', 'name', 'email'] 
      }],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      opportunities,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new opportunity
exports.createOpportunity = async (req, res) => {
  try {
    const { Scholarship } = db.models;
    const opportunityData = {
      ...req.body,
      postedBy: req.user.id
    };

    const opportunity = await Scholarship.create(opportunityData);
    
    res.status(201).json({
      success: true,
      opportunity
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update opportunity
exports.updateOpportunity = async (req, res) => {
  try {
    const { id } = req.params;
    const { Scholarship } = db.models;

    const opportunity = await Scholarship.findByPk(id);
    if (!opportunity) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    await opportunity.update(req.body);
    
    res.json({
      success: true,
      opportunity
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete opportunity
exports.deleteOpportunity = async (req, res) => {
  try {
    const { id } = req.params;
    const { Scholarship } = db.models;

    const opportunity = await Scholarship.findByPk(id);
    if (!opportunity) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    await opportunity.destroy();
    
    res.json({
      success: true,
      message: 'Opportunity deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Toggle opportunity status
exports.toggleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { Scholarship } = db.models;

    const opportunity = await Scholarship.findByPk(id);
    if (!opportunity) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    await opportunity.update({ isActive: !opportunity.isActive });
    
    res.json({
      success: true,
      opportunity
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Toggle featured status
exports.toggleFeatured = async (req, res) => {
  try {
    const { id } = req.params;
    const { Scholarship } = db.models;

    const opportunity = await Scholarship.findByPk(id);
    if (!opportunity) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    await opportunity.update({ isFeatured: !opportunity.isFeatured });
    
    res.json({
      success: true,
      opportunity
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get opportunity statistics
exports.getStats = async (req, res) => {
  try {
    const { Scholarship } = db.models;

    const stats = await Promise.all([
      Scholarship.count(),
      Scholarship.count({ where: { isActive: true } }),
      Scholarship.count({ where: { type: 'scholarship' } }),
      Scholarship.count({ where: { type: 'internship' } }),
      Scholarship.count({ where: { type: 'competition' } }),
      Scholarship.count({ where: { type: 'conference' } }),
      Scholarship.count({ where: { isFeatured: true } }),
      Scholarship.sum('viewCount'),
      Scholarship.sum('applicationCount')
    ]);

    res.json({
      success: true,
      stats: {
        total: stats[0],
        active: stats[1],
        scholarships: stats[2],
        internships: stats[3],
        competitions: stats[4],
        conferences: stats[5],
        featured: stats[6],
        totalViews: stats[7] || 0,
        totalApplications: stats[8] || 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Bulk operations
exports.bulkUpdate = async (req, res) => {
  try {
    const { ids, action, data } = req.body;
    const { Scholarship } = db.models;

    let updateData = {};
    
    switch (action) {
      case 'activate':
        updateData.isActive = true;
        break;
      case 'deactivate':
        updateData.isActive = false;
        break;
      case 'feature':
        updateData.isFeatured = true;
        break;
      case 'unfeature':
        updateData.isFeatured = false;
        break;
      case 'update':
        updateData = data;
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    await Scholarship.update(updateData, {
      where: { id: { [Op.in]: ids } }
    });

    res.json({
      success: true,
      message: `${ids.length} opportunities updated successfully`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Register a new admin account (admin-only)
exports.registerAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    const User = db.models.User;
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already in use.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'admin'
    });

    res.status(201).json({
      success: true,
      message: 'Admin account created successfully.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};