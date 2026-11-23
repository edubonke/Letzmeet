import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, scryptSync, timingSafeEqual, randomUUID } from 'node:crypto';

export const uuid = randomUUID;
export const error = (status, code) => Object.assign(new Error(code), { status, code });
export const requiredString = (v, max = 500) => {
  if (typeof v !== 'string' || !v.trim() || v.length > max) throw error(400, 'INVALID_INPUT');
  return v.trim();
};
export const validId = v => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export const assertId = v => { if (!validId(v)) throw error(400, 'INVALID_ID'); return v; };
export const assertKeys = (o, allowed) => { if (!o || Array.isArray(o) || typeof o !== 'object' || Object.keys(o).some(x => !allowed.includes(x))) throw error(400, 'INVALID_FIELDS'); return o; };
export const hash = v => createHash('sha256').update(v).digest('hex');
export const newToken = () => randomBytes(32).toString('base64url');
export const stableEqual = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};
export const passwordHash = password => {
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) throw error(400, 'WEAK_PASSWORD');
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
};
export const passwordVerify = (password, stored) => {
  try { const [salt, digest] = stored.split(':'); return stableEqual(scryptSync(password, salt, 64).toString('hex'), digest); }
  catch { return false; }
};
export function keyFromBase64(value, label) {
  if (!value) throw new Error(`MISSING_${label}`);
  const key = Buffer.from(value, 'base64');
  if (key.length !== 32) throw new Error(`INVALID_${label}_LENGTH`);
  return key;
}
export function encrypt(key, plaintext, aad = '') {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(aad));
  const ct = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString('base64');
}
export function decrypt(key, encoded, aad = '') {
  const data = Buffer.from(encoded, 'base64');
  if (data.length < 29) throw error(500, 'CIPHERTEXT_INVALID');
  const d = createDecipheriv('aes-256-gcm', key, data.subarray(0, 12));
  d.setAuthTag(data.subarray(12, 28)); d.setAAD(Buffer.from(aad));
  return Buffer.concat([d.update(data.subarray(28)), d.final()]).toString('utf8');
}
export const sign = (secret, timestamp, body) => createHmac('sha256', secret).update(`${timestamp}.`).update(body).digest('hex');
export const nowIso = () => new Date().toISOString();
export function audit(logger, event, outcome, extra = {}) {
  // Deliberately allowlisted non-sensitive fields; never accept arbitrary request bodies.
  const safe = { ts: nowIso(), event, outcome };
  for (const k of ['requestId','route','status','elapsedMs','code']) if (extra[k] !== undefined) safe[k] = extra[k];
  logger(JSON.stringify(safe));
}
export async function bodyFrom(req, max = 8192) {
  let size = 0, chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > max) throw error(413, 'BODY_TOO_LARGE');
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  try { return { raw, data: raw ? JSON.parse(raw) : {} }; } catch { throw error(400, 'INVALID_JSON'); }
}
export function respond(res, status, data) {
  if (res.headersSent) return;
  res.writeHead(status, { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store', 'x-content-type-options':'nosniff' });
  res.end(JSON.stringify(data));
}
