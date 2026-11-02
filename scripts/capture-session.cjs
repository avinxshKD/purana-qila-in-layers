'use strict';
const fs = require('node:fs');
const { serve } = require('./browser.cjs');
const { sha256 } = require('./media.cjs');
function difference(a, b) {
  if (a.length !== b.length) throw new Error('Raw frame lengths differ');
  let differingPixels = 0, maxChannelDifference = 0;
  for (let i = 0; i < a.length; i += 4) {
    let changed = false;
    for (let c = 0; c < 4; c++) { const d = Math.abs(a[i + c] - b[i + c]); changed ||= d !== 0; maxChannelDifference = Math.max(maxChannelDifference, d); }
    differingPixels += Number(changed);
  }
  return { equal: differingPixels === 0, differingPixels, maxChannelDifference, pixelsCompared: a.length / 4 };
}
async function captureSession({ port = 5178 } = {}) {
  const slots = new Map();
  const server = await serve({ port, middleware(req, res, next) {
    const match = /^\/__capture\/([a-zA-Z0-9_-]+)$/.exec(req.url);
    if (!match) return next();
    const slot = slots.get(match[1]);
    if (req.method !== 'POST' || !slot) { res.writeHead(404).end(); return; }
    const chunks = []; let size = 0;
    req.on('data', chunk => { size += chunk.length; if (size > 3840 * 2160 * 4 + 4096) req.destroy(); else chunks.push(chunk); });
    req.on('end', () => {
      try {
        const bytes = Buffer.concat(chunks), result = { bytes: bytes.length, sha256: sha256(bytes) };
        if (slot.compareTo) result.difference = difference(fs.readFileSync(slot.compareTo), bytes);
        fs.writeFileSync(slot.file, bytes);
        res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(result));
      } catch (error) { res.writeHead(500).end(error.message); }
    });
  } });
  async function capture(page, slot, file, { raw = false, compareTo, year = 38, seconds = 4, renderOptions } = {}) {
    if (!/^[a-zA-Z0-9_-]+$/.test(slot)) throw new Error('Invalid capture slot');
    slots.set(slot, { file, compareTo });
    return page.evaluate(async ({ slot, raw, year, seconds, renderOptions }) => {
      window.strata.render(year, seconds, renderOptions);
      const body = raw ? window.strata.readPixelsForTransport() : await window.strata.blobForTransport();
      const response = await fetch(`/__capture/${slot}`, { method: 'POST', body });
      if (!response.ok) throw new Error(await response.text()); return response.json();
    }, { slot, raw, year, seconds, renderOptions });
  }
  return { ...server, capture };
}
module.exports = { captureSession, difference };
