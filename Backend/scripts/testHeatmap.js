const axios = require('axios');

async function testHeatmapEndpoint() {
  try {
    console.log('Testing heatmap endpoint without authentication...\n');
    
    // First test without auth to see the error
    try {
      const response = await axios.get('http://localhost:5000/api/posts/heatmap');
      console.log('Response (without auth):', response.data);
    } catch (error) {
      console.log('Expected error without auth:', error.response?.status, error.response?.data);
    }
    
    console.log('\n---\n');
    console.log('To test with authentication, you need to:');
    console.log('1. Login through the frontend (http://localhost:3000)');
    console.log('2. Copy your token from localStorage');
    console.log('3. Add it to this script');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testHeatmapEndpoint();
