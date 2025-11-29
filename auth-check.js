// Quick Supabase Auth Check Script
// Run this in browser console to test connection

console.log('🔍 Starting Supabase Auth Check...');

// Check environment variables
const supabaseUrl = 'https://yxhwuljemflgentlsntd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4aHd1bGplbWZsZ2VudGxzbnRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNDI3NDMsImV4cCI6MjA2NTkxODc0M30.ii3puQ-vKkG4KS02KTU2hUR-3QwF0x30H_iPKpbbQwQ';

console.log('📋 Config:', {
  url: supabaseUrl,
  keyLength: supabaseKey.length,
  hasKey: !!supabaseKey
});

// Test basic connectivity
async function testConnection() {
  try {
    console.log('🌐 Testing basic connectivity...');
    
    const response = await fetch(supabaseUrl + '/rest/v1/', {
      method: 'HEAD',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    console.log('✅ Basic connection:', response.status, response.statusText);
    
    // Test auth endpoint
    console.log('🔐 Testing auth endpoint...');
    const authResponse = await fetch(supabaseUrl + '/auth/v1/settings', {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    console.log('✅ Auth endpoint:', authResponse.status, authResponse.statusText);
    
    if (authResponse.ok) {
      const authData = await authResponse.json();
      console.log('📊 Auth settings:', authData);
    }
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
  }
}

// Test auth with dummy credentials
async function testAuth() {
  try {
    console.log('🔑 Testing authentication...');
    
    const authResponse = await fetch(supabaseUrl + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword'
      })
    });
    
    console.log('🔐 Auth response:', authResponse.status, authResponse.statusText);
    
    if (!authResponse.ok) {
      const errorData = await authResponse.text();
      console.log('📋 Auth error details:', errorData);
    }
    
  } catch (error) {
    console.error('❌ Auth test failed:', error);
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    
    // Check for specific error types
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      console.error('🚨 NETWORK ERROR: This looks like a connection issue');
      console.error('Possible causes:');
      console.error('- Network connectivity problems');
      console.error('- CORS issues');
      console.error('- Firewall blocking requests');
      console.error('- DNS resolution problems');
    }
  }
}

// Run tests
testConnection().then(() => {
  return testAuth();
}).then(() => {
  console.log('✅ Auth check complete');
}).catch(error => {
  console.error('❌ Auth check failed:', error);
});
