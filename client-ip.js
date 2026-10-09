import { isIP } from 'node:net';

// Default-deny forwarded headers. Trust is enabled only for explicitly configured
// immediate peers. Configure from verified ingress infrastructure, not request data.
export function clientIP(req, trustedProxyIPs = process.env.TRUSTED_PROXY_IPS || '') {
  const peer = normalizeIP(req.socket?.remoteAddress);
  if (!peer) return 'unknown';
  const trusted = new Set(String(trustedProxyIPs).split(',').map(normalizeIP).filter(Boolean));
  if (!trusted.has(peer)) return peer;
  const hops = String(req.headers['x-forwarded-for'] || '').split(',').map(normalizeIP);
  if (!hops.length || hops.some(ip => !ip)) return peer;
  // Starting at the gateway, discard known trusted proxy hops. The closest
  // untrusted hop is the effective client, never an arbitrary leftmost value.
  for (let i = hops.length - 1; i >= 0; i--) {
    if (!trusted.has(hops[i])) return hops[i];
  }
  return hops[0];
}

function normalizeIP(value) {
  if (typeof value !== 'string') return '';
  const ip = value.trim();
  if (isIP(ip)) return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
  return '';
}
