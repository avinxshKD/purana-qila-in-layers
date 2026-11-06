'use strict';
/**
 * launch() keeps Puppeteer's fresh temporary profile by default.
 * Opt in with launch({ profile: 'museum' }) to persist caches in
 * output/.edge-profiles/museum. Names are lowercase tool slugs (a-z,0-9,_,-).
 * Use a different name per tool and never open the same profile concurrently:
 * DOM-only runs do not take the GPU lock and may overlap GPU capture.
 * Each capture tool must pass its own pixel-identity check before opting in.
 */
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');
const root = path.resolve(__dirname, '..');

function executable() {
  if (process.env.BROWSER_PATH) {
    if (!fs.existsSync(process.env.BROWSER_PATH)) throw new Error(`BROWSER_PATH does not exist: ${process.env.BROWSER_PATH}`);
    return process.env.BROWSER_PATH;
  }
  const choices = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ];
  const found = choices.find(p => fs.existsSync(p));
  if (!found) throw new Error('No Edge or Chrome found. Set BROWSER_PATH.');
  return found;
}

async function launch({ software = false, dumpio = false, profile, args: extraArgs = [], headless = true } = {}) {
  let userDataDir;
  if (profile !== undefined) {
    if (typeof profile !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(profile) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/.test(profile)) {
      throw new TypeError('profile must be a safe lowercase tool slug, 1–64 characters');
    }
    userDataDir = path.join(root, 'output', '.edge-profiles', profile);
    fs.mkdirSync(userDataDir, { recursive: true });
  }
  const browser = await puppeteer.launch({
    executablePath: executable(), headless, protocolTimeout: 300000, dumpio,
    ...(userDataDir === undefined ? {} : { userDataDir }),
    args: ['--force-color-profile=srgb', '--hide-scrollbars', '--no-first-run',
      ...(software ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : []), ...extraArgs]
  });
  const child = browser.process();
  browser.on('disconnected', () => console.log(`[capture browser disconnected] pid=${child.pid}`));
  child.once('exit', (code, signal) => console.log(`[capture browser exit] pid=${child.pid} code=${code} signal=${signal}`));
  return browser;
}

async function serve({ port = 5178, middleware } = {}) {
  const { createServer } = await import('vite');
  // Without explicit entries Vite's dependency scan crawls every HTML file under root, including
  // the multi-GB output/ snapshots, which stalls first navigation past test timeouts.
  const server = await createServer({ root, server: { host: '127.0.0.1', port, strictPort: true, hmr: false, watch: { ignored: ['**/output/**', '**/tools/**'] } },
    optimizeDeps: { entries: ['*.html'] }, logLevel: 'warn',
    plugins: middleware ? [{ name: 'capture-transport', configureServer(server) { server.middlewares.use(middleware); } }] : [] });
  try {
    await server.listen();
  } catch (error) {
    await server.close();
    throw error;
  }
  const boundPort = server.httpServer.address().port;
  return { url: `http://127.0.0.1:${boundPort}`, port: boundPort, close: () => server.close() };
}

async function openPage(browser, url, options = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  page.setDefaultTimeout(300000);
  const errors = [];
  page.on('pageerror', e => { errors.push(e.message); console.error('[page]', e.message); });
  page.on('error', e => { errors.push(e.message); console.error('[renderer crash]', e.message); });
  page.on('framenavigated', frame => { if (frame === page.mainFrame()) console.log(`[navigation] ${frame.url()}`); });
  page.on('console', msg => { if (msg.type() === 'error') { errors.push(msg.text()); console.error('[browser]', msg.text()); } });
  const query = new URLSearchParams({ capture: '', ...options });
  await page.goto(`${url}/?${query}`);
  await page.waitForFunction(() => window.strata?.ready);
  if (errors.length) throw new Error(errors.join('\n'));
  return page;
}

module.exports = { root, executable, launch, serve, openPage };
