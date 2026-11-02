'use strict';
// Capture cache key: every file the page can load (src, public fonts and assets, index.html, vite config) plus the
// locked dependency tree, hashed by relative path and bytes.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
function inputFiles() {
  const files = [];
  const walk = dir => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file); else files.push(file);
  } };
  for (const dir of ['src', 'public']) if (fs.existsSync(path.join(root, dir))) walk(path.join(root, dir));
  for (const name of ['index.html', 'package.json', 'package-lock.json', 'vite.config.js', 'vite.config.mjs']) if (fs.existsSync(path.join(root, name))) files.push(path.join(root, name));
  return files.sort().map(file => path.relative(root, file).replaceAll('\\', '/'));
}
function inputHash() {
  const hash = crypto.createHash('sha256');
  for (const name of inputFiles()) { hash.update(name); hash.update('\0'); hash.update(fs.readFileSync(path.join(root, name))); hash.update('\0'); }
  return hash.digest('hex');
}
module.exports = { inputFiles, inputHash };
