const {
  clearSessionCookie,
  createSession,
  getAuthConfig,
  isAuthenticated,
  setSessionCookie
} = require('../lib/auth');

function json(res, status, payload) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.end(JSON.stringify(payload));
}

function bodyOf(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      return json(res, 200, { authenticated: isAuthenticated(req) });
    }

    if (req.method === 'DELETE') {
      clearSessionCookie(res);
      return json(res, 200, { authenticated: false });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST, DELETE');
      return json(res, 405, { error: 'Method tidak didukung.' });
    }

    const { username, password } = bodyOf(req);
    const config = getAuthConfig();
    if (username !== config.username || password !== config.password) {
      return json(res, 401, { error: 'Username atau password editor salah.' });
    }

    setSessionCookie(res, createSession(config.username, config.secret));
    return json(res, 200, { authenticated: true, username: config.username });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: error.message || 'Konfigurasi autentikasi belum lengkap.' });
  }
};
