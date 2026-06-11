import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

try {
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'app-screenshot.png', fullPage: false });
  console.log('SCREENSHOT OK');
  
  const title = await page.title();
  console.log('Title:', title);
  
  const bodyText = await page.textContent('body');
  console.log('Body:', bodyText.substring(0, 800).replace(/\s+/g, ' ').trim());
  
} catch (e) {
  console.error('Error:', e.message);
  try {
    await page.screenshot({ path: 'app-error.png' });
  } catch(_) {}
  console.error('Full error:', e.stack);
}
await browser.close();
