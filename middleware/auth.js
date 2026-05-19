const jwt = require('jsonwebtoken');
const { getDb } = require('../database');

const JWT_SECRET = 'ccc-app-secret-key-2026';

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, is_admin: user.is_admin },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }
  try {
    const decoded = verifyToken(header.slice(7));
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

function adminRequired(req, res, next) {
  authRequired(req, res, () => {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: '权限不足，需要管理员权限' });
    }
    next();
  });
}

module.exports = { JWT_SECRET, signToken, verifyToken, authRequired, adminRequired };
