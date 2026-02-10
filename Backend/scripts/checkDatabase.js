const mongoose = require('mongoose');
const Post = require('../models/Post');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkDatabase() {
  try {
    // Use the environment variable or default connection string
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/chadabaj';
    console.log('Connecting to MongoDB Atlas...');
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');
    
    // Count total posts
    const totalPosts = await Post.countDocuments();
    console.log(`Total posts in database: ${totalPosts}`);
    
    if (totalPosts === 0) {
      console.log('\n⚠️  No posts found in the database!');
      console.log('The statistics page will be empty until posts are created.');
    } else {
      // Get sample posts
      const samplePosts = await Post.find().limit(5).select('area caption createdAt');
      console.log('\nSample posts:');
      samplePosts.forEach((post, index) => {
        console.log(`${index + 1}. Area: ${post.area}, Caption: ${post.caption?.substring(0, 50)}...`);
      });
      
      // Get area statistics
      const areaStats = await Post.aggregate([
        {
          $group: {
            _id: '$area',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $limit: 5
        }
      ]);
      
      console.log('\nTop 5 areas by post count:');
      areaStats.forEach((stat, index) => {
        console.log(`${index + 1}. ${stat._id}: ${stat.count} posts`);
      });
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Database check complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkDatabase();
