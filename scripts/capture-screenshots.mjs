import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'images', 'screenshots', 'prayer-city');
const baseUrl = 'https://prayercityhtx.com';

const shots = [
  { name: 'hero', url: baseUrl, viewport: { width: 1440, height: 900 }, fullPage: false },
  { name: 'homepage', url: baseUrl, viewport: { width: 1440, height: 900 }, fullPage: true },
  { name: 'signup', url: `${baseUrl}/volunteer/`, viewport: { width: 1440, height: 900 }, fullPage: true },
  { name: 'gallery', url: `${baseUrl}/gallery.html`, viewport: { width: 1440, height: 900 }, fullPage: true },
];

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ deviceScaleFactor: 2 });

for (const shot of shots) {
  const page = await context.newPage();
  await page.setViewportSize(shot.viewport);
  try {
    await page.goto(shot.url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1500);
    const file = path.join(outDir, `${shot.name}.png`);
    await page.screenshot({
      path: file,
      fullPage: shot.fullPage,
      type: 'png',
    });
    console.log(`Saved ${file}`);
  } catch (err) {
    console.error(`Failed ${shot.name}:`, err.message);
  } finally {
    await page.close();
  }
}

await browser.close();
