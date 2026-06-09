const { Router } = require('express');
const db = require('../db');
const { requireAuth, requireRole, generateOrderNumber } = require('../utils');

const router = Router();

router.get('/', requireAuth, (req, res) => {
  let sql = `SELECT po.*, s.company_name as supplier_name, u.full_name as user_name FROM purchases po LEFT JOIN suppliers s ON po.supplier_id = s.id LEFT JOIN users u ON po.user_id = u.id WHERE 1=1`;
  const params = [];
  if (req.query.start_date) { sql += ' AND po.created_at >= ?'; params.push(req.query.start_date); }
  if (req.query.end_date) { sql += ' AND po.created_at <= ?'; params.push(req.query.end_date + ' 23:59:59'); }
  if (req.query.status) { sql += ' AND po.status = ?'; params.push(req.query.status); }
  if (req.query.supplier_id) { sql += ' AND po.supplier_id = ?'; params.push(req.query.supplier_id); }
  sql += ' ORDER BY po.created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', requireAuth, (req, res) => {
  const po = db.prepare(`SELECT po.*, s.company_name as supplier_name, u.full_name as user_name FROM purchases po LEFT JOIN suppliers s ON po.supplier_id = s.id LEFT JOIN users u ON po.user_id = u.id WHERE po.id = ?`).get(req.params.id);
  if (!po) return res.status(404).json({ detail: 'Compra não encontrada' });
  po.items = db.prepare('SELECT pi.*, p.name as product_name, p.code as product_code FROM purchase_items pi LEFT JOIN products p ON pi.product_id = p.id WHERE pi.purchase_id = ?').all(req.params.id);
  po.payments = db.prepare("SELECT * FROM payments WHERE purchase_id = ? AND type = 'pagar'").all(req.params.id);
  res.json(po);
});

router.post('/', requireRole('admin', 'estoquista'), (req, res) => {
  const { supplier_id, items, discount, notes } = req.body;
  if (!items?.length) return res.status(400).json({ detail: 'Itens são obrigatórios' });

  const orderNumber = generateOrderNumber();
  let subtotal = 0;
  const poItems = [];

  for (const item of items) {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
    if (!product) return res.status(400).json({ detail: `Produto ${item.product_id} não encontrado` });
    const qty = parseInt(item.quantity);
    const unitPrice = parseFloat(item.unit_price);
    const totalPrice = qty * unitPrice;
    subtotal += totalPrice;
    poItems.push({ product_id: item.product_id, quantity: qty, unit_price: unitPrice, total_price: totalPrice });
  }

  const disc = parseFloat(discount) || 0;
  const total = subtotal - disc;

  const r = db.prepare('INSERT INTO purchases (order_number, supplier_id, user_id, subtotal, discount, total, notes) VALUES (?,?,?,?,?,?,?)').run(
    orderNumber, supplier_id || null, req.user.id, subtotal, disc, total, notes || null
  );
  const poId = r.lastInsertRowid;

  const insItem = db.prepare('INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_price, total_price) VALUES (?,?,?,?,?)');
  const updStock = db.prepare('UPDATE products SET current_stock = current_stock + ? WHERE id = ?');
  for (const pi of poItems) {
    insItem.run(poId, pi.product_id, pi.quantity, pi.unit_price, pi.total_price);
    updStock.run(pi.quantity, pi.product_id);
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);
  db.prepare("INSERT INTO payments (purchase_id, type, description, amount, due_date, status) VALUES (?,'pagar','Compra ' || ?,?,?,'pendente')").run(poId, orderNumber, total, dueDate.toISOString().slice(0, 10));

  const po = db.prepare(`SELECT po.*, s.company_name as supplier_name, u.full_name as user_name FROM purchases po LEFT JOIN suppliers s ON po.supplier_id = s.id LEFT JOIN users u ON po.user_id = u.id WHERE po.id = ?`).get(poId);
  po.items = db.prepare('SELECT pi.*, p.name as product_name, p.code as product_code FROM purchase_items pi LEFT JOIN products p ON pi.product_id = p.id WHERE pi.purchase_id = ?').all(poId);
  res.status(201).json(po);
});

router.put('/:id', requireRole('admin', 'estoquista'), (req, res) => {
  const { status, notes } = req.body;
  const po = db.prepare('SELECT * FROM purchases WHERE id = ?').get(req.params.id);
  if (!po) return res.status(404).json({ detail: 'Compra não encontrada' });
  if (status) db.prepare("UPDATE purchases SET status = ? WHERE id = ?").run(status, req.params.id);
  if (notes !== undefined) db.prepare("UPDATE purchases SET notes = ? WHERE id = ?").run(notes, req.params.id);
  res.json(db.prepare(`SELECT po.*, s.company_name as supplier_name, u.full_name as user_name FROM purchases po LEFT JOIN suppliers s ON po.supplier_id = s.id LEFT JOIN users u ON po.user_id = u.id WHERE po.id = ?`).get(req.params.id));
});

router.put('/:id/receive', requireRole('admin', 'estoquista'), (req, res) => {
  const po = db.prepare('SELECT * FROM purchases WHERE id = ?').get(req.params.id);
  if (!po) return res.status(404).json({ detail: 'Compra não encontrada' });
  db.prepare("UPDATE purchases SET status = 'recebido' WHERE id = ?").run(req.params.id);
  res.json(db.prepare(`SELECT po.*, s.company_name as supplier_name, u.full_name as user_name FROM purchases po LEFT JOIN suppliers s ON po.supplier_id = s.id LEFT JOIN users u ON po.user_id = u.id WHERE po.id = ?`).get(req.params.id));
});

router.put('/:id/cancel', requireRole('admin', 'estoquista'), (req, res) => {
  const po = db.prepare('SELECT * FROM purchases WHERE id = ?').get(req.params.id);
  if (!po) return res.status(404).json({ detail: 'Compra não encontrada' });
  const items = db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ?').all(req.params.id);
  for (const item of items) {
    db.prepare('UPDATE products SET current_stock = current_stock - ? WHERE id = ?').run(item.quantity, item.product_id);
  }
  db.prepare("UPDATE purchases SET status = 'cancelado' WHERE id = ?").run(req.params.id);
  res.json(db.prepare(`SELECT po.*, s.company_name as supplier_name, u.full_name as user_name FROM purchases po LEFT JOIN suppliers s ON po.supplier_id = s.id LEFT JOIN users u ON po.user_id = u.id WHERE po.id = ?`).get(req.params.id));
});

router.delete('/:id', requireRole('admin'), (req, res) => {
  const po = db.prepare('SELECT * FROM purchases WHERE id = ?').get(req.params.id);
  if (!po) return res.status(404).json({ detail: 'Compra não encontrada' });
  const items = db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ?').all(req.params.id);
  for (const item of items) {
    db.prepare('UPDATE products SET current_stock = current_stock - ? WHERE id = ?').run(item.quantity, item.product_id);
  }
  db.prepare('DELETE FROM purchase_items WHERE purchase_id = ?').run(req.params.id);
  db.prepare("DELETE FROM payments WHERE purchase_id = ? AND type = 'pagar'").run(req.params.id);
  db.prepare('DELETE FROM purchases WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
