import http from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import { clientIP } from './client-ip.js';

const token = process.env.DIAG_TOKEN;
if (!token || token.length < 32) throw new Error('DIAG_TOKEN must be at least 32 characters');
const tag = value => createHmac('sha256', token).update(String(value ?? '')).digest('hex').slice(0, 16);
const normalized = x => typeof x === 'string' && isIP(x.trim()) ? x.trim() : null;
const port = Number(process.env.PORT || 3000);
const trusted = process.env.TRUSTED_PROXY_IPS || '';
const server = http.createServer((req, res) => {
 res.setHeader('Cache-Control', 'no-store');
 res.setHeader('X-Content-Type-Options', 'nosniff');
 if (req.method !== 'GET' || req.url.split('?')[0] !== '/diag') { res.writeHead(404); res.end(); return; }
 const provided = req.headers.authorization?.replace(/^Bearer /, '') || '';
 const a = Buffer.from(provided), b = Buffer.from(token);
 if (a.length !== b.length || !timingSafeEqual(a, b)) { res.writeHead(403); res.end(); return; }
 const peer = normalized(req.socket?.remoteAddress);
 const xff = String(req.headers['x-forwarded-for'] || '');
 const hops = xff.split(',').map(x=>x.trim());
 const result = {
  peerTag: tag(peer), effectiveTag: tag(clientIP(req,trusted)),
  forwardedPresent: !!xff, forwardedHops: xff ? hops.length : 0,
  forwardedWellFormed: !!xff && hops.every(x => isIP(x) !== 0),
  forwardedLastTag: xff && isIP(hops.at(-1)) ? tag(hops.at(-1)) : null,
  peerTrusted: !!peer && trusted.split(',').some(x => x.trim() === peer),
  note: 'HMAC pseudonyms; no raw IPs or headers are returned'
 };
 res.writeHead(200, {'Content-Type':'application/json'}); res.end(JSON.stringify(result));
});
server.listen(port, '0.0.0.0');
