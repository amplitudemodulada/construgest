const { Router } = require('express');
const db = require('../db');
const { requireAuth } = require('../utils');

const router = Router();

router.get('/', requireAuth, (req, res) => {
  let sql = 'SELECT * FROM suppliers WHERE 1=1';
  const params = [];
  if (req.query.search) { sql += ' AND (company_name LIKE ? OR cnpj LIKE ? OR contact_name LIKE ?)'; params.push(`%${req.query.search}%`, `%${req.query.search}%`, `%${req.query.search}%`); }
  if (req.query.is_active !== undefined) { sql += ' AND is_active = ?'; params.push(req.query.is_active === 'true' ? 1 : 0); }
  else { sql += ' AND is_active = 1'; }
  sql += ' ORDER BY company_name';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', requireAuth, (req, res) => {
  const s = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
  s ? res.json(s) : res.status(404).json({ detail: 'Fornecedor não encontrado' });
});

router.post('/', requireAuth, (req, res) => {
  const { company_name, trade_name, cnpj, ie, email, phone, cellphone, address, number, complement, neighborhood, city, state, zip_code, notes, contact_name, contact_phone } = req.body;
  if (cnpj) {
    const existing = db.prepare('SELECT id FROM suppliers WHERE cnpj = ?').get(cnpj);
    if (existing) return res.status(400).json({ detail: 'CNPJ já cadastrado' });
  }
  const r = db.prepare(`INSERT INTO suppliers (company_name, trade_name, cnpj, ie, email, phone, cellphone, address, number, complement, neighborhood, city, state, zip_code, notes, contact_name, contact_phone) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    company_name, trade_name || null, cnpj || null, ie || null, email || null, phone || null, cellphone || null,
    address || null, number || null, complement || null, neighborhood || null, city || 'São Paulo', state || 'SP',
    zip_code || null, notes || null, contact_name || null, contact_phone || null
  );
  res.status(201).json(db.prepare('SELECT * FROM suppliers WHERE id = ?').get(r.lastInsertRowid));
});

router.put('/:id', requireAuth, (req, res) => {
  const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
  if (!supplier) return res.status(404).json({ detail: 'Fornecedor não encontrado' });
  const keys = ['company_name','trade_name','cnpj','ie','email','phone','cellphone','address','number','complement','neighborhood','city','state','zip_code','notes','contact_name','contact_phone','is_active'];
  const fields = []; const vals = [];
  for (const k of keys) { if (req.body[k] !== undefined) { fields.push(`${k} = ?`); vals.push(req.body[k]); } }
  if (fields.length > 0) { vals.push(req.params.id); db.prepare(`UPDATE suppliers SET ${fields.join(', ')} WHERE id = ?`).run(...vals); }
  res.json(db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id));
});

router.delete('/:id', requireAuth, (req, res) => {
  db.prepare('UPDATE suppliers SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
