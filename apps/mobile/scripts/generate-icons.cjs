// Renders the app icon, Android adaptive icon and splash glyph to PNG with Playwright.
// Run: node scripts/generate-icons.cjs
const { chromium } = require('playwright');

const LIME = '#C8F25A';
const INK = '#141418';
// Bookmark ("saved") with a play triangle: save a workout, then play it.
const glyph = (scale = 1) => `
  <g transform="translate(512 512) scale(${scale}) translate(-512 -512)">
    <path d="M330 250 h364 a40 40 0 0 1 40 40 v470 l-222 -128 l-222 128 v-470 a40 40 0 0 1 40 -40z" fill="${INK}"/>
    <path d="M462 352 l140 84 l-140 84z" fill="${LIME}" stroke="${LIME}" stroke-width="22" stroke-linejoin="round"/>
  </g>`;

const files = {
  'assets/icon.png': `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="${LIME}"/>${glyph(1)}</svg>`,
  'assets/adaptive-icon.png': `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">${glyph(0.72)}</svg>`,
  'assets/splash-icon.png': `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><circle cx="512" cy="512" r="400" fill="${LIME}"/>${glyph(0.8)}</svg>`,
};

(async () => {
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: 1 });
for (const [out, svg] of Object.entries(files)) {
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
  await page.locator('svg').screenshot({ path: out, omitBackground: true });
  console.log('wrote', out);
}
await browser.close();
})();

