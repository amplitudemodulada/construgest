const { Router } = require('express');
const db = require('../db');
const { requireAuth } = require('../utils');

const router = Router();

router.get('/', requireAuth, (req, res) => {
  let sql = 'SELECT * FROM customers WHERE 1=1';
  const params = [];
  if (req.query.search) { sql += ' AND (name LIKE ? OR document LIKE ? OR email LIKE ?)'; params.push(`%${req.query.search}%`, `%${req.query.search}%`, `%${req.query.search}%`); }
  if (req.query.customer_type) { sql += ' AND customer_type = ?'; params.push(req.query.customer_type); }
  if (req.query.is_active !== undefined) { sql += ' AND is_active = ?'; params.push(req.query.is_active === 'true' ? 1 : 0); }
  else { sql += ' AND is_active = 1'; }
  sql += ' ORDER BY name';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', requireAuth, (req, res) => {
  const c = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  c ? res.json(c) : res.status(404).json({ detail: 'Cliente não encontrado' });
});

router.post('/', requireAuth, (req, res) => {
  const { customer_type, name, document, email, phone, cellphone, city, state, credit_limit, address, number, complement, neighborhood, zip_code, company_name, ie_rg, notes, birth_date } = req.body;
  if (document) {
    const existing = db.prepare('SELECT id FROM customers WHERE document = ?').get(document);
    if (existing) return res.status(400).json({ detail: 'Documento já cadastrado' });
  }
  const r = db.prepare(`INSERT INTO customers (customer_type, name, document, email, phone, cellphone, city, state, credit_limit, address, number, complement, neighborhood, zip_code, company_name, ie_rg, notes, birth_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    customer_type || 'pf', name, document || null, email || null, phone || null, cellphone || null, city || 'São Paulo', state || 'SP', credit_limit || 0,
    address || null, number || null, complement || null, neighborhood || null, zip_code || null, company_name || null, ie_rg || null, notes || null, birth_date || null
  );
  const c = db.prepare('SELECT * FROM customers WHERE id = ?').get(r.lastInsertRowid);
  res.status(201).json(c);
});

router.put('/:id', requireAuth, (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) return res.status(404).json({ detail: 'Cliente não encontrado' });
  const keys = ['customer_type','name','document','email','phone','cellphone','city','state','credit_limit','address','number','complement','neighborhood','zip_code','company_name','ie_rg','notes','birth_date','is_active'];
  const fields = []; const vals = [];
  for (const k of keys) { if (req.body[k] !== undefined) { fields.push(`${k} = ?`); vals.push(req.body[k]); } }
  if (fields.length > 0) { vals.push(req.params.id); db.prepare(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`).run(...vals); }
  res.json(db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id));
});

router.delete('/:id', requireAuth, (req, res) => {
  db.prepare('UPDATE customers SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
