const Post = require('../models/Post');
const Notification = require('../models/Notification');
const { User } = require('../models/User');

// Create a new post
exports.createPost = async (req, res) => {
  try {
    const { caption, area, isAnonymous } = req.body;
    const userId = req.user.id; // Assuming middleware sets req.user

    // Validate input
    if (!caption || !area) {
      return res.status(400).json({
        success: false,
        message: 'Please provide caption and area'
      });
    }

    // Check if image was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image'
      });
    }

    // Get the Cloudinary URL from the uploaded file
    const imageUrl = req.file.path;

    // Normalize anonymous flag (handles boolean and string from form-data)
    const anonymousFlag = isAnonymous === true || isAnonymous === 'true';

    // Create the post
    const newPost = new Post({
      caption,
      image: imageUrl,
      area,
      isAnonymous: anonymousFlag,
      author: userId,
      verifications: [],
      refutations: []
    });

    await newPost.save();

    // Find all users in the same residential area
    const usersInArea = await User.find({
      residentialArea: area,
      _id: { $ne: userId } // Exclude the author
    });

    // Create notifications for all users in the area
    const notifications = usersInArea.map(user => ({
      recipient: user._id,
      post: newPost._id,
      message: `New report in your area: ${caption.substring(0, 50)}${caption.length > 50 ? '...' : ''}`
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    // Populate author details before sending response
    await newPost.populate('author', 'fullName email district upazila reputation');

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      post: newPost,
      notificationsSent: notifications.length
    });

  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating post',
      error: error.message
    });
  }
};

// Vote on a post (verify or refute)
exports.votePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { voteType } = req.body; // 'verify' or 'refute'
    const userId = req.user.id;

    // Validate input
    if (!voteType || !['verify', 'refute'].includes(voteType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vote type. Must be "verify" or "refute"'
      });
    }

    // Find the post
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Ensure user can only vote on posts from their own area
    const voter = await User.findById(userId);

    if (!voter) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Please login again.'
      });
    }

    // We treat user's residentialArea as their notification/voting area
    if (!voter.residentialArea || voter.residentialArea !== post.area) {
      return res.status(403).json({
        success: false,
        message: 'You can only verify or refute incidents reported in your own area.'
      });
    }

    // Check if user has already voted
    const alreadyVerified = post.verifications.some(id => id.toString() === userId);
    const alreadyRefuted = post.refutations.some(id => id.toString() === userId);
    
    if (alreadyVerified || alreadyRefuted) {
      return res.status(400).json({
        success: false,
        message: 'You have already voted on this post. Each user can vote only once.'
      });
    }

    // Get the post author to update their reputation
    const author = await User.findById(post.author);
    if (!author) {
      return res.status(404).json({
        success: false,
        message: 'Post author not found'
      });
    }

    // Calculate reputation change
    let reputationChange = 0;

    // Case A: New Verify (+1)
    if (voteType === 'verify') {
      reputationChange = 1;
      post.verifications.push(userId);
    }
    // Case B: New Refute (-3)
    else if (voteType === 'refute') {
      reputationChange = -3;
      post.refutations.push(userId);
    }

    // Update author's reputation (min 0, max 100)
    author.reputation = Math.max(0, Math.min(100, author.reputation + reputationChange));
    await author.save();

    await post.save();

    // Populate author details with updated reputation
    await post.populate('author', 'fullName email district upazila reputation');

    res.status(200).json({
      success: true,
      message: `Post ${voteType === 'verify' ? 'verified' : 'refuted'} successfully`,
      post,
      stats: {
        verifications: post.verifications.length,
        refutations: post.refutations.length,
        authorReputation: author.reputation
      }
    });

  } catch (error) {
    console.error('Vote post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while voting on post',
      error: error.message
    });
  }
};

// Get all posts (with pagination)
exports.getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const area = req.query.area; // Optional filter by area

    const filter = area ? { area } : {};

    const posts = await Post.find(filter)
      .populate('author', 'fullName email district upazila residentialArea reputation')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPosts = await Post.countDocuments(filter);

    res.status(200).json({
      success: true,
      posts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalPosts / limit),
        totalPosts,
        postsPerPage: limit
      }
    });

  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching posts',
      error: error.message
    });
  }
};

// Get a single post by ID
exports.getPostById = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId)
      .populate('author', 'fullName email district upazila residentialArea reputation')
      .populate('verifications', 'fullName')
      .populate('refutations', 'fullName');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    res.status(200).json({
      success: true,
      post
    });

  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching post',
      error: error.message
    });
  }
};
