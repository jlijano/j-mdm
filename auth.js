import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const derive = promisify(scrypt);
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await derive(password, salt, 64);
  return `scrypt:${salt}:${key.toString('hex')}`;
}
export function createAuth(options = {}) {
  const email = (options.adminEmail || process.env.SUPER_ADMIN_EMAIL || '').toLowerCase();
  const hash = options.passwordHash || process.env.SUPER_ADMIN_PASSWORD_HASH || '';
  const secure = options.secureCookies ?? (process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER));
  const ttl = options.sessionTTL ?? 8 * 60 * 60 * 1000;
  const sessions = new Map(), attempts = new Map();
  const publicPaths = new Set(['/login', '/login.js', '/login.css', '/style.css', '/icon.svg']);
  function json(res, code, data) { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); }
  function redirect(res, location) { res.writeHead(303, { Location: location }); res.end(); }
  function token(req) { return /(?:^|;\s*)mdm_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1]; }
  function key(token) { return createHash('sha256').update(token).digest('hex'); }
  function session(req) {
    const value = token(req); if (!value) return null;
    const entry = sessions.get(key(value));
    if (!entry || entry.expires <= Date.now()) { sessions.delete(key(value)); return null; }
    return entry;
  }
  function cookie(value, maxAge) { return `mdm_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? '; Secure' : ''}`; }
  function sameOrigin(req) {
    try { const origin = new URL(req.headers.origin); return origin.host === req.headers.host && ['http:', 'https:'].includes(origin.protocol); }
    catch { return false; }
  }
  async function body(req) {
    if (!(req.headers['content-type'] || '').startsWith('application/json')) throw new Error('Invalid body');
    let text = ''; for await (const chunk of req) { text += chunk; if (Buffer.byteLength(text) > 4096) throw new Error('Body too large'); }
    const value = JSON.parse(text); if (!value || typeof value !== 'object') throw new Error('Invalid body'); return value;
  }
  return {
    publicPaths, session,
    async handle(req, res, pathname) {
      if (pathname.startsWith('/api/auth/')) {
        if (pathname === '/api/auth/me' && req.method === 'GET') {
          const entry = session(req); json(res, entry ? 200 : 401, entry ? { user: { email, role: 'Super Admin' } } : { message: 'Please sign in.' }); return true;
        }
        if (!['/api/auth/login', '/api/auth/logout'].includes(pathname)) { json(res, 404, { message: 'Not found.' }); return true; }
        if (req.method !== 'POST') { json(res, 405, { message: 'Method not allowed.' }); return true; }
        if (!sameOrigin(req)) { json(res, 403, { message: 'This request is not allowed.' }); return true; }
        if (pathname.endsWith('/logout')) {
          const value = token(req); if (value) sessions.delete(key(value));
          res.setHeader('Set-Cookie', cookie('', 0)); json(res, 200, { ok: true }); return true;
        }
        if (!email || !/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(hash)) { json(res, 503, { message: 'Sign-in is not configured. Contact your administrator.' }); return true; }
        const now = Date.now();
        for (const [id, value] of attempts) if (value.until <= now) attempts.delete(id);
        for (const [id, value] of sessions) if (value.expires <= now) sessions.delete(id);
        const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress).split(',').at(-1).trim();
        const state = attempts.get(ip) || { count: 0, until: now + 15 * 60 * 1000 };
        if (state.count >= 5 || attempts.size >= 10000 || sessions.size >= 1000) { res.setHeader('Retry-After', '900'); json(res, 429, { message: 'Too many sign-in attempts. Please try again in 15 minutes.' }); return true; }
        state.count++; attempts.set(ip, state);
        try {
          const input = await body(req);
          if (typeof input.email !== 'string' || typeof input.password !== 'string' || input.password.length > 256) throw new Error('Invalid input');
          const [, salt, expected] = hash.split(':');
          const actual = await derive(input.password, salt, 64);
          if (!timingSafeEqual(actual, Buffer.from(expected, 'hex')) || input.email.trim().toLowerCase() !== email) { json(res, 401, { message: 'Email or password is incorrect.' }); return true; }
          attempts.delete(ip);
          const previous = token(req); if (previous) sessions.delete(key(previous));
          const value = randomBytes(32).toString('hex'); sessions.set(key(value), { expires: now + ttl, role: 'Super Admin' });
          res.setHeader('Set-Cookie', cookie(value, Math.floor(ttl / 1000))); json(res, 200, { ok: true, redirect: '/dashboard' });
        } catch { json(res, 400, { message: 'Enter a valid email and password.' }); }
        return true;
      }
      if (pathname === '/') { redirect(res, session(req) ? '/dashboard' : '/login'); return true; }
      if (pathname === '/login' && session(req)) { redirect(res, '/dashboard'); return true; }
      return false;
    },
    deny(req, res, pathname) {
      if (publicPaths.has(pathname) || session(req)) return false;
      redirect(res, '/login'); return true;
    }
  };
}
