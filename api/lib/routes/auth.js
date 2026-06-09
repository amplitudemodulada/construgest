const { Router } = require('express');
const db = require('../db');
const { verifyPassword, hashPassword, createAccessToken, requireAuth, requireRole } = require('../utils');

const router = Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ detail: 'Username e password são obrigatórios' });
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);
  if (!user || !verifyPassword(password, user.hashed_password)) return res.status(401).json({ detail: 'Credenciais inválidas' });
  const token = createAccessToken({ user_id: user.id, role: user.role });
  const { hashed_password, ...userData } = user;
  res.json({ access_token: token, token_type: 'bearer', user: userData });
});

router.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});

router.get('/users', requireRole('admin'), (req, res) => {
  const users = db.prepare('SELECT id, username, email, full_name, role, is_active, phone, created_at FROM users ORDER BY id').all();
  res.json(users);
});

router.post('/users', requireRole('admin'), (req, res) => {
  const { username, email, full_name, password, role, phone } = req.body;
  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (existing) return res.status(400).json({ detail: 'Username ou email já existe' });
  const hashed = hashPassword(password);
  const r = db.prepare('INSERT INTO users (username, email, full_name, hashed_password, role, phone) VALUES (?,?,?,?,?,?)').run(username, email, full_name, hashed, role || 'visualizador', phone || null);
  const user = db.prepare('SELECT id, username, email, full_name, role, is_active, phone, created_at FROM users WHERE id = ?').get(r.lastInsertRowid);
  res.status(201).json(user);
});

router.put('/users/:id', requireRole('admin'), (req, res) => {
  const fields = [];
  const vals = [];
  for (const key of ['username', 'email', 'full_name', 'role', 'is_active', 'phone']) {
    if (req.body[key] !== undefined) { fields.push(`${key} = ?`); vals.push(req.body[key]); }
  }
  if (req.body.password) { fields.push('hashed_password = ?'); vals.push(hashPassword(req.body.password)); }
  if (fields.length === 0) return res.status(400).json({ detail: 'Nenhum campo para atualizar' });
  vals.push(req.params.id);
  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...vals);
  const user = db.prepare('SELECT id, username, email, full_name, role, is_active, phone, created_at FROM users WHERE id = ?').get(req.params.id);
  user ? res.json(user) : res.status(404).json({ detail: 'Usuário não encontrado' });
});

router.delete('/users/:id', requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id);
  if (id === req.user.id) return res.status(400).json({ detail: 'Não pode excluir a si mesmo' });
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.status(204).end();
});

module.exports = router;
