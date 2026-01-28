const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB Connected');
    
    // Drop the pendingusers collection
    try {
      await mongoose.connection.db.dropCollection('pendingusers');
      console.log('🗑️ Dropped pendingusers collection');
    } catch (error) {
      if (error.message.includes('ns not found')) {
        console.log('ℹ️ No pendingusers collection found');
      } else {
        console.error('❌ Error:', error.message);
      }
    }
    
    console.log('✅ Cleanup completed!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });
