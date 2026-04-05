// Using built-in fetch in Node.js 18+

async function testUsersPage() {
  try {
    console.log('🔍 Testing Users Management Page...');
    
    // Test if the users page loads
    const response = await fetch('http://localhost:3000/admin/users', {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.ok) {
      console.log('✅ Users page loads successfully');
      console.log('Status:', response.status);
      console.log('Content-Type:', response.headers.get('content-type'));
      
      // Check if it's a Next.js page (should contain some React/Next.js indicators)
      const html = await response.text();
      if (html.includes('User Management') || html.includes('Users')) {
        console.log('✅ Page contains user management content');
      } else {
        console.log('❌ Page does not contain expected content');
      }
      
      // Check that "Promote to Manager" is NOT present
      if (html.includes('Promote to Manager')) {
        console.log('❌ "Promote to Manager" button is still present - this should be removed');
      } else {
        console.log('✅ "Promote to Manager" button has been successfully removed');
      }
      
      // Check for other expected functionality
      if (html.includes('Promote to Admin')) {
        console.log('✅ "Promote to Admin" functionality is still present');
      }
      
      if (html.includes('Demote to User')) {
        console.log('✅ "Demote to User" functionality is still present');
      }
      
      if (html.includes('Permissions')) {
        console.log('✅ "Permissions" functionality is still present');
      }
      
      // Check for any error indicators
      if (html.includes('error') || html.includes('Error')) {
        console.log('⚠️  Page may contain errors');
      } else {
        console.log('✅ No obvious errors found');
      }
      
    } else {
      console.log('❌ Users page failed to load');
      console.log('Status:', response.status);
      console.log('Response:', await response.text());
    }
    
  } catch (error) {
    console.error('❌ Users page test failed:', error.message);
  }
}

testUsersPage();
