import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../dist/' + path, import.meta.url), 'utf8');

test('standalone scanner and library load the same workspace navigation assets', async () => {
  for (const page of ['quick.html', 'quick-assets.html']) {
    const html = await read(page);
    assert.match(html, /href="\/workspace-shell\.css"/, page);
    assert.match(html, /src="\/workspace-shell\.js"/, page);
    assert.match(html, /class="quick-shell"/, page);
    assert.match(html, /src="\/workspace-theme\.js"/, page);
  }
});

test('navigation uses fixed top and left shell with responsive drawer controls', async () => {
  const css = await read('workspace-shell.css');
  const js = await read('workspace-shell.js');
  assert.match(css, /#ws-header\{position:sticky/);
  assert.match(css, /#ws-sidebar\{position:fixed/);
  assert.match(css, /@media\(max-width:900px\)/);
  assert.match(js, /aria-controls="ws-sidebar"/);
  assert.match(js, /aria-current/);
  assert.match(js, /ws-nav-open/);
  assert.match(js, /event\.key === 'Escape'/);
  assert.match(js, /response\.ok \? response\.json\(\) : null/);
  assert.match(js, /node\.hidden = false/);
  assert.match(js, /document\.body\.classList\.contains\('quick-shell'\)/);
});

test('protected admin workspace navigation remains intact for RBAC enforcement', async () => {
  const html = await read('index.html');
  const navigation = await read('navigation.js');
  assert.match(html, /id="main-nav"/);
  assert.match(html, /id="mobile-nav"/);
  assert.match(html, /id="menu-toggle"/);
  assert.match(navigation, /window\.jmdmSetPage/);
  assert.doesNotMatch(navigation, /\/api\/auth\/me.*bypass/);
});
