import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createPairing } from '../quick-pair.js';

test('pairing lets an invited phone send codes, denies unknown tokens and expires', async () => {
  const pair = createPairing({ lifetime: 4000 });
  const server = http.createServer(async (req, res) => {
    if (!await pair(req, res, req.url.split('?')[0])) {res.writeHead(404);res.end();}
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const post = async (path, body, origin=base) => {
    const result = await fetch(base+path,{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
    return {status:result.status, body:await result.json()};
  };
  const get = async url => {const r=await fetch(base+url);return {status:r.status,body:await r.json()};};
  try {
    const a=await post('/pair/create',{});
    assert.equal(a.status,201);
    assert.match(a.body.owner,/^[a-f0-9]{48}$/);
    assert.match(a.body.phone,/^[a-f0-9]{48}$/);
    assert.notEqual(a.body.owner,a.body.phone);
    assert.equal((await get('/pair/poll?owner=wrong')).status,404);
    assert.equal((await post('/pair/connect',{phone:a.body.phone},'https://other.invalid')).status,403);
    assert.equal((await post('/pair/send',{phone:a.body.phone,value:'8CC123'},base)).status,404);
    assert.equal((await post('/pair/connect',{phone:a.body.phone})).status,200);
    assert.equal((await post('/pair/send',{phone:a.body.phone,value:'8CC123',format:'CODE128'})).status,200);
    const events=await get('/pair/poll?owner='+a.body.owner+'&after=0');
    assert.equal(events.status,200);
    assert.equal(events.body.connected,true);
    assert.equal(events.body.events[0].value,'8CC123');
    assert.deepEqual((await get('/pair/poll?owner='+a.body.owner+'&after=1')).body.events,[]);
    assert.equal((await post('/pair/close',{owner:a.body.owner})).status,200);
    assert.equal((await get('/pair/poll?owner='+a.body.owner)).status,404);
  } finally {await new Promise(resolve=>server.close(resolve));}
});
