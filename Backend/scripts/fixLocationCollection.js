require('dotenv').config();
const mongoose = require('mongoose');

async function fixCollection() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected Successfully');

    // Drop the entire locations collection to remove old indexes
    const db = mongoose.connection.db;
    try {
      await db.dropCollection('locations');
      console.log('🗑️  Dropped locations collection');
    } catch (error) {
      console.log('Collection does not exist or already dropped');
    }

    console.log('✅ Collection reset completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixCollection();
