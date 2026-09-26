const { handleUpload } = require('@vercel/blob/client');
const { isAuthenticated } = require('../lib/auth');

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
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method tidak didukung.' });
  }
  if (!isAuthenticated(req)) return json(res, 401, { error: 'Login editor diperlukan.' });
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return json(res, 500, { error: 'BLOB_READ_WRITE_TOKEN belum dikonfigurasi di Vercel.' });
  }

  try {
    const blobResponse = await handleUpload({
      body: bodyOf(req),
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          'application/pdf', 'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/zip', 'video/mp4', 'image/jpeg', 'image/png', 'image/webp'
        ],
        addRandomSuffix: true,
        tokenPayload: JSON.stringify({ purpose: 'lumbung-edukatif-media' })
      }),
      onUploadCompleted: async ({ blob }) => {
        console.log('Blob upload completed:', blob.pathname);
      }
    });
    return json(res, 200, blobResponse);
  } catch (error) {
    console.error(error);
    return json(res, 400, { error: error.message || 'Token upload gagal dibuat.' });
  }
};
