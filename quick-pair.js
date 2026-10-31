import { randomBytes } from 'node:crypto';

// Ephemeral, capability-token pairing. No scan content is written to disk or a database.
export function createPairing(options = {}) {
  const rooms = new Map();
  const lifetime = options.lifetime ?? 10 * 60 * 1000;
  const maximum = options.maximum ?? 100;
  const token = () => randomBytes(24).toString('hex');
  const respond = (res, status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(body));
  };
  const cleanup = () => {
    const now = Date.now();
    for (const [key, room] of rooms) if (room.expires <= now) rooms.delete(key);
  };
  async function readJSON(req, maxBytes = 7000) {
    if (!(req.headers['content-type'] || '').startsWith('application/json')) throw new Error('JSON body required.');
    let body = '';
    for await (const chunk of req) {
      body += chunk;
      if (Buffer.byteLength(body) > maxBytes) throw new Error('Request too large.');
    }
    const parsed = JSON.parse(body);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid body.');
    return parsed;
  }
  function sameOrigin(req) {
    try {
      const url = new URL(req.headers.origin);
      return ['https:', 'http:'].includes(url.protocol) && url.host === req.headers.host;
    } catch { return false; }
  }
  const validToken = value => typeof value === 'string' && /^[a-f0-9]{48}$/.test(value);
  function find(value, role) {
    if (!validToken(value)) return null;
    for (const room of rooms.values()) {
      if (room[role] === value) return room;
    }
    return null;
  }
  return async function handlePairing(req, res, pathname) {
    if (!pathname.startsWith('/pair/')) return false;
    cleanup();
    const method = req.method || 'GET';
    if (!['GET', 'POST'].includes(method)) { respond(res, 405, { error: 'Method not allowed.' }); return true; }
    if (method === 'POST' && !sameOrigin(req)) { respond(res, 403, { error: 'Same-origin request required.' }); return true; }
    try {
      if (pathname === '/pair/create' && method === 'POST') {
        if (rooms.size >= maximum) { respond(res, 429, { error: 'Too many active pairing sessions. Try again later.' }); return true; }
        const owner = token(), phone = token();
        rooms.set(owner, { owner, phone, connected: false, events: [], sequence: 0, lastSend: 0, frame: null, frameSeq: 0, lastFrameAt: 0, expires: Date.now() + lifetime });
        respond(res, 201, { owner, phone, expiresIn: Math.floor(lifetime / 1000) }); return true;
      }
      if (pathname === '/pair/connect' && method === 'POST') {
        const body = await readJSON(req), room = find(body.phone, 'phone');
        if (!room) { respond(res, 404, { error: 'Pairing link is invalid or expired.' }); return true; }
        room.connected = true;
        respond(res, 200, { connected: true }); return true;
      }
      if (pathname === '/pair/send' && method === 'POST') {
        const body = await readJSON(req), room = find(body.phone, 'phone');
        if (!room || !room.connected) { respond(res, 404, { error: 'Pairing link is invalid or expired.' }); return true; }
        const value = typeof body.value === 'string' ? body.value.trim().slice(0, 256) : '';
        if (!value) { respond(res, 400, { error: 'Barcode or text is required.' }); return true; }
        if (Date.now() - room.lastSend < 600) { respond(res, 429, { error: 'Please wait between scans.' }); return true; }
        room.lastSend = Date.now(); room.expires = Date.now() + lifetime;
        room.sequence++;
        room.events.push({
          id: room.sequence, value,
          format: String(body.format || 'UNKNOWN').slice(0, 50),
          ocr: String(body.ocr || '').slice(0, 2000),
          source: String(body.source || 'phone').slice(0, 30),
          at: new Date().toISOString()
        });
        if (room.events.length > 50) room.events.shift();
        respond(res, 200, { received: true }); return true;
      }
      if (pathname === '/pair/frame' && method === 'POST') {
        const body = await readJSON(req, 155000);
        const room = find(body.phone, 'phone');
        if (!room || !room.connected) { respond(res, 404, { error: 'Phone is not connected.' }); return true; }
        const frame = body.frame;
        if (typeof frame !== 'string' || frame.length > 145000 ||
            !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]{100,}$/.test(frame)) {
          respond(res, 400, { error: 'Invalid camera frame.' }); return true;
        }
        if (Date.now() - room.lastFrameAt < 600) {
          respond(res, 429, { error: 'Frame rate limited.' }); return true;
        }
        room.lastFrameAt = Date.now();
        room.frame = frame;
        room.frameSeq++;
        room.expires = Date.now() + lifetime;
        respond(res, 200, { received: true });
        return true;
      }
      if (pathname === '/pair/poll' && method === 'GET') {
        const url = new URL(req.url, 'http://localhost');
        const room = find(url.searchParams.get('owner'), 'owner');
        if (!room) { respond(res, 404, { error: 'Pairing session expired.' }); return true; }
        const after = Number(url.searchParams.get('after') || 0);
        const afterFrame = Number(url.searchParams.get('afterFrame') || 0);
        respond(res, 200, { connected: room.connected, expiresIn: Math.max(0, Math.floor((room.expires - Date.now()) / 1000)), events: room.events.filter(event => event.id > (Number.isFinite(after) ? after : 0)), frameSeq: room.frameSeq, frame: room.frameSeq > (Number.isFinite(afterFrame) ? afterFrame : 0) ? room.frame : null });
        return true;
      }
      if (pathname === '/pair/close' && method === 'POST') {
        const body = await readJSON(req);
        if (validToken(body.owner)) rooms.delete(body.owner);
        respond(res, 200, { closed: true }); return true;
      }
      respond(res, 404, { error: 'Not found.' });
    } catch (error) {
      respond(res, error instanceof SyntaxError ? 400 : 400, { error: 'Invalid pairing request.' });
    }
    return true;
  };
}
