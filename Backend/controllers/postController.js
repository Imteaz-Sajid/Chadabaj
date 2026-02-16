const Post = require('../models/Post');
const Notification = require('../models/Notification');
const { User } = require('../models/User');

// Create a new post
exports.createPost = async (req, res) => {
  try {
    const { caption, area, isAnonymous, latitude, longitude, lat, lng, address, district, upazila } = req.body;
    const userId = req.user.id; // Assuming middleware sets req.user

    // Use lat/lng if provided, otherwise fall back to latitude/longitude
    const finalLat = lat || latitude;
    const finalLng = lng || longitude;

    // Validate input - area can be derived from address if not provided
    if (!caption) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a caption'
      });
    }

    // If area is not provided but address is, extract area from address
    let finalArea = area;
    if (!finalArea && address) {
      // Extract area from address (usually the first or second part)
      const addressParts = address.split(',');
      finalArea = addressParts[0]?.trim() || 'Unknown Area';
    }

    if (!finalArea) {
      return res.status(400).json({
        success: false,
        message: 'Please provide area or select a location on the map'
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

    // Prepare post data
    const postData = {
      caption,
      image: imageUrl,
      area: finalArea,
      isAnonymous: anonymousFlag,
      author: userId,
      verifications: [],
      refutations: []
    };

    // Add coordinates if provided
    if (finalLat && finalLng) {
      const parsedLat = parseFloat(finalLat);
      const parsedLng = parseFloat(finalLng);
      
      // Validate coordinates
      if (!isNaN(parsedLat) && !isNaN(parsedLng) && parsedLat >= -90 && parsedLat <= 90 && parsedLng >= -180 && parsedLng <= 180) {
        // Use district from form if provided, otherwise try to extract from address
        let finalDistrict = district || '';
        let finalUpazila = upazila || finalArea;
        let division = '';
        
        // If district not provided from form, try to extract from address
        if (!finalDistrict && address) {
          const addressParts = address.split(',').map(p => p.trim());
          // Usually: [place, upazila, district, division, country]
          if (addressParts.length >= 3) {
            // District is usually 3rd from end (before division and country)
            finalDistrict = addressParts[addressParts.length - 3] || '';
            division = addressParts[addressParts.length - 2] || '';
            // Clean up "District" suffix if present
            finalDistrict = finalDistrict.replace(/district$/i, '').replace(/zila$/i, '').trim();
            division = division.replace(/division$/i, '').trim();
          }
        }
        
        postData.location = {
          type: 'Point',
          coordinates: [parsedLng, parsedLat], // MongoDB stores as [longitude, latitude]
          lat: parsedLat,
          lng: parsedLng,
          address: address || '',
          thana: finalArea,
          upazila: finalUpazila,
          district: finalDistrict,
          division: division
        };
        console.log(`📍 GPS coordinates added: ${parsedLat}, ${parsedLng} for area: ${finalArea}`);
        console.log(`📍 District: ${finalDistrict}, Upazila: ${finalUpazila}`);
        if (address) {
          console.log(`📍 Address: ${address}`);
        }
      } else {
        console.warn(`⚠️ Invalid coordinates provided: ${finalLat}, ${finalLng}`);
      }
    }
    
    // Also store district at top level if provided (for posts without map coordinates)
    if (district) {
      postData.district = district;
    }
    
    // Also store thana at top level (use upazila as thana)
    if (upazila) {
      postData.thana = upazila;
    }

    // Create the post
    const newPost = new Post(postData);

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
    await newPost.populate('author', 'fullName email district upazila reputation profilePicture');

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
    await post.populate('author', 'fullName email district upazila reputation profilePicture');

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
    const district = req.query.district; // Optional filter by district

    // Build filter object
    const filter = {};
    
    if (area) {
      // Case-insensitive area search
      filter.area = { $regex: area, $options: 'i' };
    }
    
    if (district) {
      // District can be in multiple places: direct field, location.district, or author.district
      filter.$or = [
        { district: district },
        { 'location.district': district }
      ];
    }

    const posts = await Post.find(filter)
      .populate('author', 'fullName email district upazila residentialArea reputation profilePicture')
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

// Get heatmap statistics data
exports.getHeatmapData = async (req, res) => {
  try {
    console.log('📊 Heatmap endpoint called by user:', req.user?.id);
    
    // Aggregate posts by area and count occurrences
    const areaStats = await Post.aggregate([
      {
        $group: {
          _id: '$area',
          count: { $sum: 1 },
          posts: { $push: { _id: '$_id', createdAt: '$createdAt' } }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $project: {
          _id: 0,
          area: '$_id',
          count: 1,
          posts: 1
        }
      }
    ]);

    // Also aggregate by district for choropleth map
    const districtStats = await Post.aggregate([
      {
        $group: {
          _id: { $ifNull: ['$district', '$location.district'] },
          count: { $sum: 1 }
        }
      },
      {
        $match: { _id: { $ne: null, $ne: '' } }
      },
      {
        $sort: { count: -1 }
      },
      {
        $project: {
          _id: 0,
          district: '$_id',
          count: 1
        }
      }
    ]);

    // Get all posts with district and location data
    const allPosts = await Post.find()
      .select('area district caption createdAt location')
      .sort({ createdAt: -1 });

    console.log(`✅ Heatmap data: ${areaStats.length} areas, ${districtStats.length} districts, ${allPosts.length} total posts`);
    console.log('📊 District stats:', districtStats);

    res.status(200).json({
      success: true,
      areaStats,
      districtStats,
      totalPosts: allPosts.length,
      posts: allPosts
    });

  } catch (error) {
    console.error('❌ Get heatmap data error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching heatmap data',
      error: error.message
    });
  }
};

// Get a single post by ID
exports.getPostById = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId)
      .populate('author', 'fullName email district upazila residentialArea reputation profilePicture')
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

// Analyze patterns for serial incident detection
exports.analyzePattern = async (req, res) => {
  try {
    const { district, thana, caption } = req.body;

    // Validate required fields
    if (!district || !thana) {
      return res.status(400).json({
        success: false,
        message: 'District and Thana are required for pattern analysis'
      });
    }

    if (!caption || caption.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Caption must be at least 3 characters for analysis'
      });
    }

    console.log(`🔍 Pattern Analysis Request: District=${district}, Thana=${thana}, Caption="${caption.substring(0, 50)}..."`);

    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Build the query - FLEXIBLE matching
    // First try to match by thana/area only (most posts have area field)
    // This is more lenient to catch existing posts without district field
    const matchingPosts = await Post.find({
      $and: [
        {
          $or: [
            { thana: { $regex: new RegExp(thana, 'i') } },
            { area: { $regex: new RegExp(thana, 'i') } },
            { 'location.thana': { $regex: new RegExp(thana, 'i') } },
            { 'location.upazila': { $regex: new RegExp(thana, 'i') } },
            // Also try partial district match for posts without thana
            { district: { $regex: new RegExp(district, 'i') } },
            { 'location.district': { $regex: new RegExp(district, 'i') } }
          ]
        },
        { createdAt: { $gte: thirtyDaysAgo } }
      ]
    })
    .populate('author', 'fullName')
    .sort({ createdAt: -1 })
    .limit(100); // Increased limit for better coverage

    console.log(`📊 Found ${matchingPosts.length} posts in area matching ${thana}/${district}`);

    // Extract crime-related keywords from caption
    const crimeKeywords = [
      'snatch', 'snatching', 'robbery', 'robbed', 'theft', 'stolen', 'steal',
      'mugging', 'mugged', 'attack', 'attacked', 'assault', 'assaulted',
      'kidnap', 'kidnapped', 'abduct', 'abducted', 'murder', 'killed',
      'rape', 'raped', 'harass', 'harassment', 'eve-teasing', 'molest',
      'fraud', 'scam', 'extortion', 'ransom', 'hijack', 'carjack',
      'burglary', 'break-in', 'dacoity', 'dacoit', 'loot', 'looted',
      'pickpocket', 'threat', 'threatened', 'violence', 'vandalism',
      'accident', 'hit', 'run', 'bike', 'mobile', 'phone', 'bag', 'purse',
      'ছিনতাই', 'ডাকাতি', 'চুরি', 'হত্যা', 'ধর্ষণ', 'অপহরণ', 'হামলা'
    ];

    // Extract keywords from user's caption
    const captionLower = caption.toLowerCase();
    const captionWords = captionLower.split(/\s+/).filter(w => w.length > 2);
    const foundKeywords = crimeKeywords.filter(keyword => 
      captionLower.includes(keyword.toLowerCase())
    );

    console.log(`🔑 Found keywords in caption: ${foundKeywords.join(', ') || 'none'}`);

    // Filter matching posts by similar keywords OR word overlap
    const relevantPosts = matchingPosts.filter(post => {
      const postCaptionLower = post.caption.toLowerCase();
      
      // Check if any of the found keywords appear in the existing post
      const hasMatchingKeyword = foundKeywords.length > 0 && foundKeywords.some(keyword => 
        postCaptionLower.includes(keyword.toLowerCase())
      );

      // Also check for general word overlap (at least 1 significant word for more matches)
      const postWords = postCaptionLower.split(/\s+/);
      const significantWords = captionWords.filter(word => word.length > 3);
      const wordOverlap = significantWords.filter(word => 
        postWords.some(pw => pw.includes(word) || word.includes(pw))
      ).length;

      // More lenient: match if keyword found OR at least 1 significant word overlap
      return hasMatchingKeyword || wordOverlap >= 1;
    });

    console.log(`✅ Relevant posts after filtering: ${relevantPosts.length}`);

    // Format top matches for response
    const topMatches = relevantPosts.slice(0, 5).map(post => ({
      _id: post._id,
      caption: post.caption.substring(0, 100) + (post.caption.length > 100 ? '...' : ''),
      area: post.area,
      createdAt: post.createdAt,
      author: post.isAnonymous ? 'Anonymous' : post.author?.fullName || 'Unknown'
    }));

    res.status(200).json({
      success: true,
      matchCount: relevantPosts.length,
      totalInArea: matchingPosts.length,
      keywords: foundKeywords,
      topMatches,
      message: relevantPosts.length > 0 
        ? `Found ${relevantPosts.length} similar incident(s) in ${thana} in the last 30 days`
        : 'No similar patterns detected'
    });

  } catch (error) {
    console.error('Pattern analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during pattern analysis',
      error: error.message
    });
  }
};
