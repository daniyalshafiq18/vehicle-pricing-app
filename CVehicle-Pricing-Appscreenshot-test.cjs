const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  try {
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'landing-page.png', fullPage: true });
    console.log('Screenshot saved to landing-page.png');
  } catch(e) {
    console.error('Error:', e.message);
  }
  await browser.close();
})();
