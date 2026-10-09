import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clientIP } from '../client-ip.js';

const req = (peer, forwarded) => ({
  socket: { remoteAddress: peer },
  headers: { 'x-forwarded-for': forwarded }
});
test('untrusted peers cannot override identity with forwarded headers', () => {
  assert.equal(clientIP(req('203.0.113.9', '198.51.100.1'), ''), '203.0.113.9');
  assert.equal(clientIP(req('203.0.113.9', '198.51.100.1'), '10.0.0.4'), '203.0.113.9');
  assert.equal(clientIP(req('::ffff:127.0.0.1', '198.51.100.1'), ''), '127.0.0.1');
});
test('trusted ingress uses closest untrusted hop, not forged leftmost hop', () => {
  assert.equal(clientIP(req('10.0.0.4', '192.0.2.9, 198.51.100.7'), '10.0.0.4'), '198.51.100.7');
  assert.equal(clientIP(req('10.0.0.4', '192.0.2.9, 198.51.100.7, 10.0.0.8'), '10.0.0.4,10.0.0.8'), '198.51.100.7');
});
test('invalid forwarding values fall back to socket peer', () => {
  for (const value of ['', 'not-an-ip', '192.0.2.3, junk', '198.51.100.2:443']) {
    assert.equal(clientIP(req('10.0.0.4', value), '10.0.0.4'), '10.0.0.4');
  }
});
