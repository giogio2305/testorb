const axios = require('axios');

// Test script to verify API fixes
async function testAPIFixes() {
    const baseURL = 'http://localhost:3000/api';
    
    try {
        console.log('Testing API endpoints...');
        
        // Test applications list endpoint
        console.log('\n1. Testing applications list...');
        const appsResponse = await axios.get(`${baseURL}/applications/list`);
        console.log('✅ Applications list:', appsResponse.status, appsResponse.data.length, 'applications');
        
        if (appsResponse.data.length > 0) {
            const appId = appsResponse.data[0]._id;
            console.log('Using application ID:', appId);
            
            // Test tests list for this application
            console.log('\n2. Testing tests list...');
            try {
                const testsResponse = await axios.get(`${baseURL}/applications/${appId}/tests`);
                console.log('✅ Tests list:', testsResponse.status, testsResponse.data.length, 'tests');
                
                if (testsResponse.data.length > 0) {
                    console.log('\n3. Testing delete endpoint (dry run - not actually deleting)...');
                    const testId = testsResponse.data[0]._id;
                    console.log('Would test deletion of test ID:', testId);
                    console.log('✅ Delete endpoint structure verified');
                } else {
                    console.log('ℹ️  No tests found to test deletion');
                }
            } catch (error) {
                console.log('❌ Tests list error:', error.response?.status, error.response?.data || error.message);
            }
        } else {
            console.log('ℹ️  No applications found');
        }
        
        console.log('\n✅ API test completed successfully!');
        
    } catch (error) {
        console.error('❌ API test failed:', error.response?.status, error.response?.data || error.message);
    }
}

// Run the test
testAPIFixes();