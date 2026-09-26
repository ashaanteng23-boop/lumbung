const { getDb } = require('../lib/mongodb');
const { isAuthenticated } = require('../lib/auth');

const FIELDS = [
  'id', 'title', 'slug', 'category', 'subject', 'grade', 'educationLevel',
  'fileType', 'fileName', 'fileSize', 'fileUrl', 'externalUrl', 'description',
  'keywords', 'downloadCount', 'createdAt'
];

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

function sanitize(item = {}) {
  return FIELDS.reduce((result, field) => {
    if (item[field] !== undefined) result[field] = item[field];
    return result;
  }, {});
}

function publicItem(item) {
  const { _id, ...result } = item;
  return result;
}

function requireEditor(req, res) {
  if (isAuthenticated(req)) return true;
  json(res, 401, { error: 'Login editor diperlukan.' });
  return false;
}

module.exports = async function handler(req, res) {
  try {
    const db = await getDb();
    const collection = db.collection('media');

    if (req.method === 'GET') {
      const items = await collection.find({}).sort({ createdAt: -1 }).toArray();
      return json(res, 200, items.map(publicItem));
    }

    if (req.method === 'PATCH' && req.query?.action === 'download') {
      const id = req.query?.id;
      if (!id) return json(res, 400, { error: 'Parameter id wajib diisi.' });
      await collection.updateOne({ id }, { $inc: { downloadCount: 1 } });
      return json(res, 200, { updated: id });
    }

    if (!requireEditor(req, res)) return;

    if (req.method === 'PUT') {
      const items = bodyOf(req);
      if (!Array.isArray(items)) return json(res, 400, { error: 'Body harus berupa array media.' });

      await collection.deleteMany({});
      const documents = items.map(sanitize).filter((item) => item.id);
      if (documents.length) await collection.insertMany(documents);
      return json(res, 200, { saved: documents.length });
    }

    if (req.method === 'POST') {
      const item = sanitize(bodyOf(req));
      if (!item.id) return json(res, 400, { error: 'Media harus memiliki id.' });
      await collection.updateOne({ id: item.id }, { $set: item }, { upsert: true });
      return json(res, 201, item);
    }

    if (req.method === 'DELETE') {
      const id = req.query?.id;
      if (!id) return json(res, 400, { error: 'Parameter id wajib diisi.' });
      await collection.deleteOne({ id });
      return json(res, 200, { deleted: id });
    }

    res.setHeader('Allow', 'GET, POST, PUT, PATCH, DELETE');
    return json(res, 405, { error: 'Method tidak didukung.' });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: error.message || 'Database tidak dapat diakses.' });
  }
};
