// Using built-in fetch in Node.js 18+

async function testInventoryManagement() {
  try {
    console.log('🔍 Testing Inventory Management Page...');
    
    // Test if the inventory management page loads
    const response = await fetch('http://localhost:3000/admin/inventory-management', {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.ok) {
      console.log('✅ Inventory management page loads successfully');
      console.log('Status:', response.status);
      console.log('Content-Type:', response.headers.get('content-type'));
      
      // Check if it's a Next.js page (should contain some React/Next.js indicators)
      const html = await response.text();
      if (html.includes('Inventory Management') || html.includes('inventory')) {
        console.log('✅ Page contains inventory management content');
      } else {
        console.log('❌ Page does not contain expected content');
      }
      
      // Check for any error indicators
      if (html.includes('error') || html.includes('Error') || html.includes('Cannot read properties')) {
        console.log('❌ Page contains error indicators');
      } else {
        console.log('✅ No obvious errors found');
      }
      
    } else {
      console.log('❌ Inventory management page failed to load');
      console.log('Status:', response.status);
      console.log('Response:', await response.text());
    }
    
  } catch (error) {
    console.error('❌ Inventory management test failed:', error.message);
  }
}

testInventoryManagement();
