const Resource = require('../models/resource');
const UserActivity = require('../models/UserActivity');

// @desc    Get all resources
// @route   GET /api/resources
// @access  Public
exports.getResources = async (req, res) => {
  try {
    const { type, category, language, search } = req.query;
    
    const filter = { isApproved: true };
    
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (language) filter.language = language;
    if (search) {
      // Replace MongoDB query syntax with Sequelize syntax
      filter.search = search;
    }

    const resources = await Resource.find(filter);

    res.status(200).json({
      success: true,
      count: resources.length,
      resources
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single resource
// @route   GET /api/resources/:id
// @access  Public
exports.getResource = async (req, res) => {
  try {
    // Resource.findById already returns the resource with included uploader (Sequelize include)
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    // Increment view count
    await resource.incrementView();

    // Record activity if user is authenticated
    if (req.user) {
      let activity = await UserActivity.findOne({ user: req.user.id });
      if (!activity) {
        activity = await UserActivity.create({ user: req.user.id });
      }
      await activity.recordActivity('resourcesViewed', 5); // 5 minutes per view
    }

    res.status(200).json({
      success: true,
      resource
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Upload resource
// @route   POST /api/resources
// @access  Private (Mentor/Admin)
exports.uploadResource = async (req, res) => {
  try {
    const { title, description, type, category, fileUrl, externalLink, language, tags } = req.body;

    const resource = await Resource.create({
      title,
      description,
      type,
      category,
      fileUrl,
      externalLink,
      language,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      uploadedBy: req.user.id,
      isApproved: req.user.role === 'admin' // Auto-approve for admins
    });

    res.status(201).json({
      success: true,
      resource
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Download resource
// @route   GET /api/resources/:id/download
// @access  Private
exports.downloadResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    // Increment download count
    await resource.incrementDownload();

    // Record activity
    let activity = await UserActivity.findOne({ user: req.user.id });
    if (!activity) {
      activity = await UserActivity.create({ user: req.user.id });
    }
    await activity.recordActivity('resourcesDownloaded');

    res.status(200).json({
      success: true,
      downloadUrl: resource.fileUrl
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Like/Unlike resource
// @route   POST /api/resources/:id/like
// @access  Private
exports.toggleLike = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    const likeIndex = resource.likes.indexOf(req.user.id);

    if (likeIndex > -1) {
      resource.likes.splice(likeIndex, 1);
    } else {
      resource.likes.push(req.user.id);
    }

    await resource.save();

    res.status(200).json({
      success: true,
      likes: resource.likes.length,
      isLiked: likeIndex === -1
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete resource
// @route   DELETE /api/resources/:id
// @access  Private (Admin/Owner)
exports.deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    // Check if user is admin or owner
    if (req.user.role !== 'admin' && resource.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this resource'
      });
    }

    await resource.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Resource deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Approve resource
// @route   PUT /api/resources/:id/approve
// @access  Private (Admin)
exports.approveResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    resource.isApproved = true;
    await resource.save();

    res.status(200).json({
      success: true,
      resource
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};