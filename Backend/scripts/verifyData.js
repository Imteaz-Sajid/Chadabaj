require('dotenv').config();
const mongoose = require('mongoose');
const Location = require('../models/Location');

async function verify() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');

    const count = await Location.countDocuments();
    console.log(`📊 Total locations: ${count}`);

    const districts = await Location.distinct('district');
    console.log(`📍 Unique districts: ${districts.length}`);
    console.log(`Districts: ${districts.sort().slice(0, 10).join(', ')}...`);

    const sample = await Location.findOne();
    console.log('\n📝 Sample record:');
    console.log(sample);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verify();
