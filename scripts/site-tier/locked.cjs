'use strict';
// Runs one command while holding the shared GPU lock (scripts/gpu-lock.cjs), for CPU-heavy jobs that must take turns
// with GPU work (pack builds, long test runs). CPU jobs do not wait for AC; pass --gpu for browser/GPU work.
// Usage: node scripts/site-tier/locked.cjs <owner> [--gpu] -- <command> [args...]
// The lock is reclaimed by others after 10 minutes, so a job should finish well inside that.
const { spawn } = require('node:child_process');
const { withGpu } = require('../gpu-lock.cjs');

const argv = process.argv.slice(2), sep = argv.indexOf('--');
if (sep < 1 || sep === argv.length - 1) { console.error('usage: locked.cjs <owner> [--gpu] -- <command> [args...]'); process.exit(2); }
const owner = argv[0], gpu = argv.slice(1, sep).includes('--gpu'), [command, ...args] = argv.slice(sep + 1);
withGpu(owner, () => new Promise((resolve, reject) => {
  const started = Date.now(), child = spawn(command, args, { stdio: 'inherit', windowsHide: true });
  child.on('error', reject);
  child.on('exit', (code, signal) => { console.error(`[locked] ${owner}: exit ${code ?? signal} after ${Date.now() - started} ms`); resolve(code ?? 1); });
}), { requireAc: gpu }).then(code => process.exit(code), error => { console.error(error); process.exit(1); });
