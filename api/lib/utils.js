const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');

const SECRET_KEY = process.env.SECRET_KEY || 'construgest-super-secret-key-change-in-production';
const ALGORITHM = 'HS256';
const ACCESS_TOKEN_EXPIRE = 480; // minutes

function verifyPassword(plain, hashed) {
  return bcrypt.compareSync(plain, hashed);
}

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

function createAccessToken(data) {
  return jwt.sign({ sub: data.user_id, role: data.role }, SECRET_KEY, { algorithm: ALGORITHM, expiresIn: `${ACCESS_TOKEN_EXPIRE}m` });
}

function getCurrentUser(token) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, SECRET_KEY, { algorithms: [ALGORITHM] });
    return db.prepare('SELECT id, username, email, full_name, role, is_active, phone, created_at FROM users WHERE id = ? AND is_active = 1').get(decoded.sub) || null;
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  const user = getCurrentUser(token);
  if (!user) return res.status(401).json({ detail: 'Não autenticado' });
  req.user = user;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    requireAuth(req, res, () => {
      if (!roles.includes(req.user.role)) return res.status(403).json({ detail: 'Sem permissão' });
      next();
    });
  };
}

function generateInvoiceNumber() {
  const d = new Date();
  const ts = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}${String(d.getSeconds()).padStart(2,'0')}`;
  const rand = String(Math.floor(Math.random() * 900) + 100);
  return `NF-${ts}-${rand}`;
}

function generateOrderNumber() {
  const d = new Date();
  const ts = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}${String(d.getSeconds()).padStart(2,'0')}`;
  const rand = String(Math.floor(Math.random() * 900) + 100);
  return `PC-${ts}-${rand}`;
}

function generateQuoteNumber() {
  const d = new Date();
  const ts = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}${String(d.getSeconds()).padStart(2,'0')}`;
  const rand = String(Math.floor(Math.random() * 900) + 100);
  return `ORC-${ts}-${rand}`;
}

module.exports = { verifyPassword, hashPassword, createAccessToken, getCurrentUser, requireAuth, requireRole, generateInvoiceNumber, generateOrderNumber, generateQuoteNumber, SECRET_KEY };
