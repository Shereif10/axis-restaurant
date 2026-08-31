const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const PORT = 8765;
const ROOT = __dirname;

function startServer() {
  const mime = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.mp4': 'video/mp4',
    '.svg': 'image/svg+xml',
  };
  const server = http.createServer((req, res) => {
    let urlPath = req.url.split('?')[0];
    if (urlPath === '/') urlPath = '/index.html';
    const filePath = path.join(ROOT, urlPath);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise(resolve => {
    server.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
      resolve(server);
    });
  });
}

(async () => {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const logs = [];
  page.on('console', msg => logs.push(`console:${msg.type()}:${msg.text()}`));
  page.on('pageerror', err => logs.push(`pageerror:${err.message}`));

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Check for JS errors
  console.log('--- Console logs ---');
  logs.forEach(l => console.log(l));

  // Evaluate menu stuff
  const result = await page.evaluate(async () => {
    const out = {};
    out.url = location.href;
    out.hasGSAP = typeof gsap !== 'undefined';
    out.hasScrollTrigger = typeof ScrollTrigger !== 'undefined';
    out.menuSection = !!document.querySelector('.menu-section');
    out.rail = !!document.querySelector('.menu-rail');
    out.progress = !!document.querySelector('.menu-progress span');
    const rail = document.querySelector('.menu-rail');
    out.railScrollWidth = rail ? rail.scrollWidth : null;
    out.innerWidth = window.innerWidth;
    out.distance = rail ? rail.scrollWidth - window.innerWidth : null;
    out.scrollTriggerCount = typeof ScrollTrigger !== 'undefined' ? ScrollTrigger.getAll().length : null;
    const st = typeof ScrollTrigger !== 'undefined' ? ScrollTrigger.getById('axis-menu-horizontal') : null;
    out.hasMenuST = !!st;
    if (st) {
      out.menuST = {
        id: st.vars.id,
        start: st.start,
        end: st.end,
        pin: !!st.pin,
        scrub: st.vars.scrub,
        trigger: st.vars.trigger ? (st.vars.trigger.className || st.vars.trigger.id || 'found') : null,
      };
    }
    // Check for wheel listener
    out.hasWheelListener = false; // can't easily detect, but we can check if menu scroll works
    // Check computed styles for overflow
    const bodyStyle = getComputedStyle(document.body);
    out.bodyOverflowX = bodyStyle.overflowX;
    const htmlStyle = getComputedStyle(document.documentElement);
    out.htmlOverflowX = htmlStyle.overflowX;
    const menuSectionStyle = rail ? getComputedStyle(document.querySelector('.menu-section')) : null;
    out.menuSectionOverflow = menuSectionStyle ? menuSectionStyle.overflow : null;
    // Check for visit iframe
    out.visitIframe = !!document.querySelector('.visit-image iframe');
    // Check for errors in ScrollTrigger
    out.scrollTriggerErrors = [];
    try {
      // Try to get distance as in JS
      const distance = rail ? rail.scrollWidth - window.innerWidth : 0;
      out.distanceCalc = distance;
    } catch(e) { out.scrollTriggerErrors.push(e.message); }
    return out;
  });

  console.log('--- Evaluation ---');
  console.log(JSON.stringify(result, null, 2));

  // Try to scroll to menu and test movement
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  const menuTop = await page.evaluate(() => {
    const el = document.querySelector('.menu-section');
    return el ? el.getBoundingClientRect().top + window.scrollY : null;
  });
  console.log('menuTop', menuTop);

  if (menuTop !== null) {
    // Scroll to just before menu
    await page.evaluate((top) => window.scrollTo(0, top - 100), menuTop);
    await page.waitForTimeout(500);
    let before = await page.evaluate(() => {
      const rail = document.querySelector('.menu-rail');
      return rail ? getComputedStyle(rail).transform : null;
    });
    console.log('before transform', before);

    // Scroll down into menu (should pin and start moving)
    await page.evaluate((top) => window.scrollTo(0, top + 300), menuTop);
    await page.waitForTimeout(800);
    let after = await page.evaluate(() => {
      const rail = document.querySelector('.menu-rail');
      return {
        transform: rail ? getComputedStyle(rail).transform : null,
        progressWidth: document.querySelector('.menu-progress span') ? document.querySelector('.menu-progress span').style.width : null,
        hasIsHorizontal: document.querySelector('.menu-section')?.classList.contains('is-horizontal'),
      };
    });
    console.log('after scroll 300', after);

    // Scroll more
    await page.evaluate((top) => window.scrollTo(0, top + 800), menuTop);
    await page.waitForTimeout(800);
    let after2 = await page.evaluate(() => {
      const rail = document.querySelector('.menu-rail');
      return {
        transform: rail ? getComputedStyle(rail).transform : null,
        progressWidth: document.querySelector('.menu-progress span') ? document.querySelector('.menu-progress span').style.width : null,
      };
    });
    console.log('after scroll 800', after2);

    // Try horizontal wheel via dispatch
    const wheelResult = await page.evaluate(() => {
      const stBefore = ScrollTrigger.getById('axis-menu-horizontal');
      const pBefore = stBefore ? stBefore.progress : null;
      // Dispatch horizontal wheel
      const el = document.querySelector('.menu-section');
      const ev = new WheelEvent('wheel', { deltaX: 100, deltaY: 0, bubbles: true, cancelable: true });
      window.dispatchEvent(ev);
      return { pBefore, evDefaultPrevented: ev.defaultPrevented };
    });
    console.log('wheelResult', wheelResult);
    await page.waitForTimeout(500);
    const afterWheel = await page.evaluate(() => {
      const st = ScrollTrigger.getById('axis-menu-horizontal');
      return st ? st.progress : null;
    });
    console.log('progress after horizontal wheel', afterWheel);
  }

  // Screenshot for visual check
  await page.screenshot({ path: 'menu_debug.png', fullPage: true });
  console.log('screenshot saved menu_debug.png');

  await browser.close();
  server.close(() => console.log('server closed'));
})();
