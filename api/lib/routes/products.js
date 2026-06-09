const { Router } = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../utils');

const router = Router();

router.get('/categories', requireAuth, (req, res) => {
  const cats = db.prepare('SELECT * FROM categories WHERE is_active = 1 ORDER BY name').all();
  res.json(cats);
});

router.post('/categories', requireRole('admin'), (req, res) => {
  const { name, description, icon } = req.body;
  try {
    const r = db.prepare('INSERT INTO categories (name, description, icon) VALUES (?,?,?)').run(name, description || '', icon || 'box');
    const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(r.lastInsertRowid);
    res.status(201).json(cat);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ detail: 'Categoria já existe' });
    throw e;
  }
});

router.put('/categories/:id', requireRole('admin'), (req, res) => {
  const { name, description, icon } = req.body;
  db.prepare('UPDATE categories SET name = COALESCE(?,name), description = COALESCE(?,description), icon = COALESCE(?,icon) WHERE id = ?').run(name, description, icon, req.params.id);
  const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  cat ? res.json(cat) : res.status(404).json({ detail: 'Categoria não encontrada' });
});

router.delete('/categories/:id', requireRole('admin'), (req, res) => {
  db.prepare('UPDATE categories SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

router.get('/products/low-stock', requireAuth, (req, res) => {
  const items = db.prepare(`
    SELECT p.*, c.name as category_name FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = 1 AND p.current_stock <= p.min_stock
    ORDER BY (p.current_stock * 1.0 / p.max_stock) ASC
  `).all();
  res.json(items);
});

router.get('/products/barcode/:barcode', requireAuth, (req, res) => {
  const p = db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.barcode = ? AND p.is_active = 1').get(req.params.barcode);
  p ? res.json(p) : res.status(404).json({ detail: 'Produto não encontrado' });
});

router.get('/products', requireAuth, (req, res) => {
  let sql = 'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE 1=1';
  const params = [];
  if (req.query.search) { sql += ' AND (p.name LIKE ? OR p.code LIKE ?)'; params.push(`%${req.query.search}%`, `%${req.query.search}%`); }
  if (req.query.category_id) { sql += ' AND p.category_id = ?'; params.push(req.query.category_id); }
  if (req.query.low_stock === 'true') { sql += ' AND p.current_stock <= p.min_stock'; }
  if (req.query.is_active !== undefined) { sql += ' AND p.is_active = ?'; params.push(req.query.is_active === 'true' ? 1 : 0); }
  else { sql += ' AND p.is_active = 1'; }
  sql += ' ORDER BY p.name';
  const items = db.prepare(sql).all(...params);
  res.json(items);
});

router.get('/products/:id', requireAuth, (req, res) => {
  const p = db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?').get(req.params.id);
  p ? res.json(p) : res.status(404).json({ detail: 'Produto não encontrado' });
});

router.post('/products', requireRole('admin', 'estoquista'), (req, res) => {
  const { code, name, category_id, unit, cost_price, selling_price, min_stock, current_stock, max_stock, barcode, description, location, ncm_code, cest_code } = req.body;
  const existing = db.prepare('SELECT id FROM products WHERE code = ?').get(code);
  if (existing) return res.status(400).json({ detail: 'Código já existe' });
  const r = db.prepare(`INSERT INTO products (code, name, category_id, unit, cost_price, selling_price, min_stock, current_stock, max_stock, barcode, description, location, ncm_code, cest_code) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    code, name, category_id, unit || 'UN', cost_price, selling_price, min_stock || 0, current_stock || 0, max_stock || 0, barcode || null, description || '', location || null, ncm_code || null, cest_code || null
  );
  const p = db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?').get(r.lastInsertRowid);
  res.status(201).json(p);
});

router.put('/products/:id', requireRole('admin', 'estoquista'), (req, res) => {
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ detail: 'Produto não encontrado' });
  const keys = ['code','name','category_id','unit','cost_price','selling_price','min_stock','current_stock','max_stock','barcode','description','location','ncm_code','cest_code'];
  const fields = []; const vals = [];
  for (const k of keys) {
    if (req.body[k] !== undefined) { fields.push(`${k} = ?`); vals.push(req.body[k]); }
  }
  if (fields.length > 0) {
    vals.push(req.params.id);
    db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).run(...vals);
  }
  const updated = db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/products/:id', requireRole('admin', 'estoquista'), (req, res) => {
  db.prepare('UPDATE products SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

router.post('/products/:id/stock', requireRole('admin', 'estoquista'), (req, res) => {
  const { movement_type, quantity, unit_price, notes } = req.body;
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ detail: 'Produto não encontrado' });
  const qty = parseInt(quantity);
  if (movement_type === 'saida' && qty > product.current_stock) return res.status(400).json({ detail: 'Estoque insuficiente' });
  const newStock = movement_type === 'entrada' ? product.current_stock + qty : movement_type === 'saida' ? product.current_stock - qty : qty;
  const totalPrice = unit_price ? qty * parseFloat(unit_price) : null;
  db.prepare('UPDATE products SET current_stock = ? WHERE id = ?').run(newStock, req.params.id);
  const r = db.prepare('INSERT INTO stock_movements (product_id, user_id, movement_type, quantity, unit_price, total_price, notes) VALUES (?,?,?,?,?,?,?)').run(
    req.params.id, req.user.id, movement_type, qty, unit_price || null, totalPrice, notes || null
  );
  const mov = db.prepare('SELECT * FROM stock_movements WHERE id = ?').get(r.lastInsertRowid);
  res.status(201).json(mov);
});

router.get('/products/:id/stock/history', requireAuth, (req, res) => {
  const items = db.prepare('SELECT sm.*, u.full_name as user_name FROM stock_movements sm LEFT JOIN users u ON sm.user_id = u.id WHERE sm.product_id = ? ORDER BY sm.created_at DESC').all(req.params.id);
  res.json(items);
});

module.exports = router;
