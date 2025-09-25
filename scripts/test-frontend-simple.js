// Using built-in fetch in Node.js 18+

async function testFrontendSimple() {
  try {
    console.log('🔍 Testing Frontend Station Management (Simple)...');
    
    // Test if the frontend page loads
    const response = await fetch('http://localhost:3000/admin/stations', {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.ok) {
      console.log('✅ Frontend page loads successfully');
      console.log('Status:', response.status);
      console.log('Content-Type:', response.headers.get('content-type'));
      
      // Check if it's a Next.js page (should contain some React/Next.js indicators)
      const html = await response.text();
      if (html.includes('Station Management') || html.includes('station')) {
        console.log('✅ Page contains station management content');
      } else {
        console.log('❌ Page does not contain expected content');
      }
      
      // Check for any error indicators
      if (html.includes('error') || html.includes('Error')) {
        console.log('⚠️  Page may contain errors');
      } else {
        console.log('✅ No obvious errors found');
      }
      
    } else {
      console.log('❌ Frontend page failed to load');
      console.log('Status:', response.status);
      console.log('Response:', await response.text());
    }
    
  } catch (error) {
    console.error('❌ Frontend test failed:', error.message);
  }
}

testFrontendSimple();
