const { Router } = require('express');
const db = require('../db');
const { requireAuth, generateInvoiceNumber } = require('../utils');

const router = Router();

router.get('/', requireAuth, (req, res) => {
  let sql = `SELECT s.*, c.name as customer_name, u.full_name as user_name FROM sales s LEFT JOIN customers c ON s.customer_id = c.id LEFT JOIN users u ON s.user_id = u.id WHERE 1=1`;
  const params = [];
  if (req.query.start_date) { sql += ' AND s.created_at >= ?'; params.push(req.query.start_date); }
  if (req.query.end_date) { sql += ' AND s.created_at <= ?'; params.push(req.query.end_date + ' 23:59:59'); }
  if (req.query.status) { sql += ' AND s.status = ?'; params.push(req.query.status); }
  if (req.query.customer_id) { sql += ' AND s.customer_id = ?'; params.push(req.query.customer_id); }
  sql += ' ORDER BY s.created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', requireAuth, (req, res) => {
  const sale = db.prepare(`SELECT s.*, c.name as customer_name, u.full_name as user_name FROM sales s LEFT JOIN customers c ON s.customer_id = c.id LEFT JOIN users u ON s.user_id = u.id WHERE s.id = ?`).get(req.params.id);
  if (!sale) return res.status(404).json({ detail: 'Venda não encontrada' });
  sale.items = db.prepare('SELECT si.*, p.name as product_name, p.code as product_code FROM sale_items si LEFT JOIN products p ON si.product_id = p.id WHERE si.sale_id = ?').all(req.params.id);
  sale.payments = db.prepare("SELECT * FROM payments WHERE sale_id = ? AND type = 'receber'").all(req.params.id);
  res.json(sale);
});

router.post('/', requireAuth, (req, res) => {
  const { customer_id, items, discount, payment_method, installments, notes } = req.body;
  if (!items?.length) return res.status(400).json({ detail: 'Itens são obrigatórios' });

  const invoiceNumber = generateInvoiceNumber();
  let subtotal = 0;
  const saleItems = [];

  for (const item of items) {
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(item.product_id);
    if (!product) return res.status(400).json({ detail: `Produto ${item.product_id} não encontrado` });
    const qty = parseInt(item.quantity);
    if (qty > product.current_stock) return res.status(400).json({ detail: `Estoque insuficiente para ${product.name}` });
    const unitPrice = item.unit_price || product.selling_price;
    const totalPrice = qty * unitPrice;
    subtotal += totalPrice;
    saleItems.push({ product_id: product.id, quantity: qty, unit_price: unitPrice, total_price: totalPrice, current_stock: product.current_stock, name: product.name });
  }

  const disc = parseFloat(discount) || 0;
  const total = subtotal - disc;

  const r = db.prepare('INSERT INTO sales (invoice_number, customer_id, user_id, subtotal, discount, total, payment_method, installments, notes, status) VALUES (?,?,?,?,?,?,?,?,?,?)').run(
    invoiceNumber, customer_id || null, req.user.id, subtotal, disc, total, payment_method || 'dinheiro', installments || 1, notes || null, 'concluida'
  );
  const saleId = r.lastInsertRowid;

  const insItem = db.prepare('INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price) VALUES (?,?,?,?,?)');
  const updStock = db.prepare('UPDATE products SET current_stock = current_stock - ? WHERE id = ?');
  for (const si of saleItems) {
    insItem.run(saleId, si.product_id, si.quantity, si.unit_price, si.total_price);
    updStock.run(si.quantity, si.product_id);
  }

  if (payment_method === 'credito') {
    const dueDate = new Date();
    const installmentAmount = total / (installments || 1);
    const insPay = db.prepare("INSERT INTO payments (sale_id, type, description, amount, due_date, status) VALUES (?, 'receber', ?, ?, ?, 'pendente')");
    for (let i = 0; i < (installments || 1); i++) {
      const dd = new Date(dueDate);
      dd.setMonth(dd.getMonth() + i + 1);
      insPay.run(saleId, `${i+1}/${installments}`, installmentAmount, dd.toISOString().slice(0, 10));
    }
  } else {
    db.prepare("INSERT INTO payments (sale_id, type, description, amount, due_date, paid_date, status) VALUES (?,'receber','Pagamento à vista',?,datetime('now'),'pago')").run(saleId, total);
  }

  if (customer_id) {
    const prog = db.prepare('SELECT * FROM loyalty_programs WHERE is_active = 1').get();
    if (prog) {
      const points = Math.floor(total * prog.points_per_real);
      if (points > 0) db.prepare('INSERT INTO loyalty_points (customer_id, sale_id, points, type) VALUES (?,?,?,\'earn\')').run(customer_id, saleId, points);
    }
  }

  const sale = db.prepare(`SELECT s.*, c.name as customer_name, u.full_name as user_name FROM sales s LEFT JOIN customers c ON s.customer_id = c.id LEFT JOIN users u ON s.user_id = u.id WHERE s.id = ?`).get(saleId);
  sale.items = db.prepare('SELECT si.*, p.name as product_name, p.code as product_code FROM sale_items si LEFT JOIN products p ON si.product_id = p.id WHERE si.sale_id = ?').all(saleId);
  res.status(201).json(sale);
});

router.put('/:id', requireAuth, (req, res) => {
  const { status, notes } = req.body;
  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id);
  if (!sale) return res.status(404).json({ detail: 'Venda não encontrada' });
  if (status) db.prepare('UPDATE sales SET status = ? WHERE id = ?').run(status, req.params.id);
  if (notes !== undefined) db.prepare('UPDATE sales SET notes = ? WHERE id = ?').run(notes, req.params.id);
  res.json(db.prepare(`SELECT s.*, c.name as customer_name, u.full_name as user_name FROM sales s LEFT JOIN customers c ON s.customer_id = c.id LEFT JOIN users u ON s.user_id = u.id WHERE s.id = ?`).get(req.params.id));
});

router.delete('/:id', requireAuth, (req, res) => {
  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id);
  if (!sale) return res.status(404).json({ detail: 'Venda não encontrada' });
  const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(req.params.id);
  for (const item of items) {
    db.prepare('UPDATE products SET current_stock = current_stock + ? WHERE id = ?').run(item.quantity, item.product_id);
  }
  db.prepare('DELETE FROM sale_items WHERE sale_id = ?').run(req.params.id);
  db.prepare("DELETE FROM payments WHERE sale_id = ? AND type = 'receber'").run(req.params.id);
  db.prepare('DELETE FROM sales WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
