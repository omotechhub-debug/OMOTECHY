const puppeteer = require('puppeteer');

async function testFrontendStations() {
  let browser;
  try {
    console.log('🔍 Testing Frontend Station Management...');
    
    browser = await puppeteer.launch({ 
      headless: false, // Set to true to run headless
      defaultViewport: null,
      args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    
    // Navigate to the station management page
    await page.goto('http://localhost:3000/admin/stations', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Wait for the page to load
    await page.waitForSelector('[data-testid="station-card"], .space-y-4', { timeout: 10000 });
    
    // Take a screenshot
    await page.screenshot({ path: 'station-management-test.png', fullPage: true });
    console.log('✅ Screenshot saved as station-management-test.png');
    
    // Check if managers are displayed
    const managerElements = await page.$$eval('.bg-blue-100.text-blue-800', elements => 
      elements.map(el => el.textContent.trim())
    );
    
    console.log('Found manager elements:', managerElements);
    
    // Check for any error messages
    const errorElements = await page.$$eval('.text-red-600, .border-red-200', elements => 
      elements.map(el => el.textContent.trim())
    );
    
    if (errorElements.length > 0) {
      console.log('❌ Found error elements:', errorElements);
    } else {
      console.log('✅ No error elements found');
    }
    
    // Wait a bit to see the page
    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.error('❌ Frontend test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Check if puppeteer is available
try {
  require('puppeteer');
  testFrontendStations();
} catch (error) {
  console.log('Puppeteer not available, skipping frontend test');
  console.log('You can manually check http://localhost:3000/admin/stations');
}
