const crypto = require('crypto');

const COOKIE_NAME = 'lumbung_editor_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function getAuthConfig() {
  const username = process.env.EDITOR_USERNAME || 'editor';
  const password = process.env.EDITOR_PASSWORD;
  const secret = process.env.AUTH_SECRET;

  if (!password || !secret) {
    throw new Error('EDITOR_PASSWORD dan AUTH_SECRET wajib dikonfigurasi.');
  }

  return { username, password, secret };
}

function sign(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

function createSession(username, secret) {
  const payload = Buffer.from(`${username}:${Date.now()}`).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

function parseCookies(header = '') {
  return header.split(';').reduce((cookies, part) => {
    const separator = part.indexOf('=');
    if (separator === -1) return cookies;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    cookies[key] = decodeURIComponent(value);
    return cookies;
  }, {});
}

function isAuthenticated(req) {
  try {
    const { secret } = getAuthConfig();
    const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
    if (!token) return false;

    const [payload, signature] = token.split('.');
    if (!payload || !signature) return false;

    const expected = sign(payload, secret);
    const validSignature = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
    if (!validSignature) return false;

    const decoded = Buffer.from(payload, 'base64url').toString('utf8');
    const timestamp = Number(decoded.slice(decoded.lastIndexOf(':') + 1));
    return Number.isFinite(timestamp) && Date.now() - timestamp < SESSION_MAX_AGE * 1000;
  } catch {
    return false;
  }
}

function setSessionCookie(res, token) {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
  );
}

module.exports = {
  COOKIE_NAME,
  createSession,
  clearSessionCookie,
  getAuthConfig,
  isAuthenticated,
  setSessionCookie
};
