import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile, symlink, unlink } from 'node:fs/promises';
import { createServer } from '../server.js';
import { hashPassword } from '../auth.js';

let server, base, cookie;
before(async () => {
  server = createServer({ adminEmail: 'test@example.com', passwordHash: await hashPassword('test-password'), secureCookies: false });
  await new Promise(resolve => server.listen(0, '0.0.0.0', resolve));
  assert.equal(server.address().address, '0.0.0.0');
  base = `http://127.0.0.1:${server.address().port}`;
  const login = await fetch(base + '/api/auth/login', {method:'POST', headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({email:'test@example.com',password:'test-password'})});
  assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];
});
after(async () => { await new Promise(resolve => server.close(resolve)); });

test('health and scanner assets return their original bytes and correct MIME types', async () => {
  const health = await fetch(`${base}/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: 'ok' });
  const files = {
    '/dashboard': ['index.html', 'text/html'],
    '/assets/scanner': ['index.html', 'text/html'],
    '/app.js': ['app.js', 'text/javascript'],
    '/style.css': ['style.css', 'text/css'],
    '/icon.svg': ['icon.svg', 'image/svg+xml'],
    '/manifest.webmanifest': ['manifest.webmanifest', 'application/manifest+json'],
    '/vendor/zxing.min.js': ['vendor/zxing.min.js', 'text/javascript']
  };
  for (const [url, [file, type]] of Object.entries(files)) {
    const response = await fetch(base + url, {headers:{Cookie:cookie}});
    assert.equal(response.status, 200, url);
    assert.ok(response.headers.get('content-type').startsWith(type), url);
    assert.equal(response.headers.get('permissions-policy'), null);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), await readFile(new URL(`../dist/${file}`, import.meta.url)));
  }
});

function rawRequest(url) {
  return new Promise((resolve, reject) => {
    http.get(base + url, res => { res.resume(); res.on('end', () => resolve(res.statusCode)); }).on('error', reject);
  });
}
test('missing assets, configuration and traversal are inaccessible', async () => {
  for (const url of ['/missing.js', '/package.json', '/server.js', '/render.yaml', '/README.md',
    '/.env', '/.git/config', '/.openai/hosting.json', '/vendor/', '/%2e%2e/package.json',
    '/%2e%2e%5cpackage.json', '/vendor/%2e%2e/%2e%2e/package.json', '/app.js:secret']) {
    assert.equal(await rawRequest(url), 404, url);
  }
  assert.equal(await rawRequest('/%ZZ'), 400);
  assert.equal((await fetch(base + '/app.js', { method: 'POST', body: 'no uploads' })).status, 405);
  const head = await fetch(base + '/app.js', { method: 'HEAD',headers:{Cookie:cookie} });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
});

test('symlinks cannot expose files outside dist', async t => {
  const link = new URL('../dist/test-outside.txt', import.meta.url);
  try { await symlink(new URL('../package.json', import.meta.url), link); }
  catch (error) { if (error.code === 'EPERM') return t.skip('Windows does not permit creating symlinks'); throw error; }
  try { assert.equal(await rawRequest('/test-outside.txt'), 404); }
  finally { await unlink(link); }
});
