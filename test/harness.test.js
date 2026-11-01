import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { serve } from '../scripts/browser.cjs';

test('an occupied capture port rejects without leaking the Vite watcher', async () => {
  const blocker = http.createServer();
  blocker.listen(0, '127.0.0.1');
  await once(blocker, 'listening');
  try {
    await assert.rejects(serve({ port: blocker.address().port }), /already in use/);
  } finally {
    await new Promise(resolve => blocker.close(resolve));
  }
});
