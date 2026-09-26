const { getDb } = require('../lib/mongodb');

function reject(res, status, message) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.end(JSON.stringify({ error: message }));
}

function safeFileName(name = 'media-edukatif') {
  const cleaned = String(name)
    .replace(/[\\/:*?"<>|\x00-\x1F]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'media-edukatif';
}

function isAllowedRemoteUrl(value) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    const hostname = url.hostname.toLowerCase();
    return !(
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname.endsWith('.local') ||
      hostname === '169.254.169.254'
    );
  } catch {
    return false;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return reject(res, 405, 'Method tidak didukung.');
  }

  try {
    const id = req.query?.id;
    if (!id) return reject(res, 400, 'Parameter id wajib diisi.');

    const db = await getDb();
    const item = await db.collection('media').findOne({ id });
    if (!item || !item.fileUrl) return reject(res, 404, 'File media tidak ditemukan.');
    if (!isAllowedRemoteUrl(item.fileUrl)) return reject(res, 400, 'URL file tidak valid.');

    const upstream = await fetch(item.fileUrl, { redirect: 'follow' });
    if (!upstream.ok) return reject(res, 502, `Sumber file mengembalikan HTTP ${upstream.status}.`);

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const contentLength = upstream.headers.get('content-length');
    res.status(200);
    res.setHeader('Content-Type', contentType);
    if (contentLength) res.setHeader('Content-Length', contentLength);
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName(item.fileName)}"`);
    res.setHeader('Cache-Control', 'private, max-age=60');

    const buffer = Buffer.from(await upstream.arrayBuffer());
    return res.end(buffer);
  } catch (error) {
    console.error(error);
    return reject(res, 500, 'File gagal disiapkan untuk diunduh.');
  }
};
