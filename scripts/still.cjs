'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { root, serve, launch, openPage } = require('./browser.cjs');
async function main() {
  const server = await serve();
  let browser;
  try {
    browser = await launch();
    const page = await openPage(browser, server.url);
    console.log(await page.evaluate(() => window.strata.device()));
    const data = await page.evaluate(() => window.strata.png().split(',')[1]);
    const directory = path.join(root, 'output', 'tech-test');
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'preview.png'), Buffer.from(data, 'base64'));
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
