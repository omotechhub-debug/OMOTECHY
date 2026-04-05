// Using built-in fetch in Node.js 18+

async function testStationsPage() {
  try {
    console.log('🔍 Testing Stations Management Page...');
    
    // Test if the stations page loads
    const response = await fetch('http://localhost:3000/admin/stations', {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.ok) {
      console.log('✅ Stations page loads successfully');
      console.log('Status:', response.status);
      console.log('Content-Type:', response.headers.get('content-type'));
      
      // Check if it's a Next.js page (should contain some React/Next.js indicators)
      const html = await response.text();
      if (html.includes('Station Management') || html.includes('Stations')) {
        console.log('✅ Page contains station management content');
      } else {
        console.log('❌ Page does not contain expected content');
      }
      
      // Check that station management functionality is present
      if (html.includes('Add Station') || html.includes('Create New Station')) {
        console.log('✅ Station creation functionality is present');
      }
      
      if (html.includes('managers') || html.includes('manager')) {
        console.log('✅ Manager-related functionality is present');
      }
      
      if (html.includes('Assign Managers') || html.includes('managers')) {
        console.log('✅ Manager assignment functionality is present');
      }
      
      // Check for any error indicators
      if (html.includes('error') || html.includes('Error')) {
        console.log('⚠️  Page may contain errors');
      } else {
        console.log('✅ No obvious errors found');
      }
      
    } else {
      console.log('❌ Stations page failed to load');
      console.log('Status:', response.status);
      console.log('Response:', await response.text());
    }
    
  } catch (error) {
    console.error('❌ Stations page test failed:', error.message);
  }
}

testStationsPage();
