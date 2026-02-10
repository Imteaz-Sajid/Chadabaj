const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  caption: {
    type: String,
    required: [true, 'Caption is required'],
    trim: true,
    maxlength: [500, 'Caption cannot exceed 500 characters']
  },
  image: {
    type: String,
    required: [true, 'Image URL is required']
  },
  area: {
    type: String,
    required: [true, 'Area is required'],
    trim: true
  },
  district: {
    type: String,
    trim: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: undefined
    },
    lat: {
      type: Number
    },
    lng: {
      type: Number
    },
    address: {
      type: String,
      trim: true
    },
    thana: String,
    upazila: String,
    district: String,
    division: String
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  verifications: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  refutations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

// Add indexes for better query performance
postSchema.index({ area: 1, createdAt: -1 });
postSchema.index({ author: 1 });
postSchema.index({ 'location.coordinates': '2dsphere' }); // Geospatial index for location queries

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
