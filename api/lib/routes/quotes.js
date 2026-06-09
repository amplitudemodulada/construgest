const { Router } = require('express');
const db = require('../db');
const { requireAuth, generateQuoteNumber } = require('../utils');

const router = Router();

router.get('/', requireAuth, (req, res) => {
  let sql = `SELECT q.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone, u.full_name as user_name FROM quotes q LEFT JOIN customers c ON q.customer_id = c.id LEFT JOIN users u ON q.user_id = u.id WHERE 1=1`;
  const params = [];
  if (req.query.start_date) { sql += ' AND q.created_at >= ?'; params.push(req.query.start_date); }
  if (req.query.end_date) { sql += ' AND q.created_at <= ?'; params.push(req.query.end_date + ' 23:59:59'); }
  if (req.query.status) { sql += ' AND q.status = ?'; params.push(req.query.status); }
  if (req.query.customer_id) { sql += ' AND q.customer_id = ?'; params.push(req.query.customer_id); }
  sql += ' ORDER BY q.created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', requireAuth, (req, res) => {
  const quote = db.prepare(`SELECT q.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone, c.address, c.number as customer_number, c.neighborhood, c.city, c.state, c.document as customer_document, u.full_name as user_name FROM quotes q LEFT JOIN customers c ON q.customer_id = c.id LEFT JOIN users u ON q.user_id = u.id WHERE q.id = ?`).get(req.params.id);
  if (!quote) return res.status(404).json({ detail: 'Orçamento não encontrado' });
  quote.items = db.prepare('SELECT qi.*, p.name as product_name, p.code as product_code, p.unit FROM quote_items qi LEFT JOIN products p ON qi.product_id = p.id WHERE qi.quote_id = ?').all(req.params.id);
  res.json(quote);
});

router.post('/', requireAuth, (req, res) => {
  const { customer_id, items, discount, discount_type, valid_until, notes } = req.body;
  if (!items?.length) return res.status(400).json({ detail: 'Itens são obrigatórios' });

  const quoteNumber = generateQuoteNumber();
  let subtotal = 0;
  const quoteItems = [];

  for (const item of items) {
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(item.product_id);
    if (!product) return res.status(400).json({ detail: `Produto ${item.product_id} não encontrado` });
    const qty = parseInt(item.quantity);
    const unitPrice = item.unit_price || product.selling_price;
    const totalPrice = qty * unitPrice;
    subtotal += totalPrice;
    quoteItems.push({ product_id: product.id, quantity: qty, unit_price: unitPrice, total_price: totalPrice, name: product.name });
  }

  const discRaw = parseFloat(discount) || 0;
  const disc = discount_type === 'percentual' ? subtotal * (discRaw / 100) : discRaw;
  const total = subtotal - disc;

  const r = db.prepare('INSERT INTO quotes (quote_number, customer_id, user_id, subtotal, discount, total, valid_until, notes) VALUES (?,?,?,?,?,?,?,?)').run(
    quoteNumber, customer_id || null, req.user.id, subtotal, disc, total, valid_until || null, notes || null
  );
  const quoteId = r.lastInsertRowid;

  const insItem = db.prepare('INSERT INTO quote_items (quote_id, product_id, quantity, unit_price, total_price) VALUES (?,?,?,?,?)');
  for (const qi of quoteItems) {
    insItem.run(quoteId, qi.product_id, qi.quantity, qi.unit_price, qi.total_price);
  }

  const quote = db.prepare(`SELECT q.*, c.name as customer_name, u.full_name as user_name FROM quotes q LEFT JOIN customers c ON q.customer_id = c.id LEFT JOIN users u ON q.user_id = u.id WHERE q.id = ?`).get(quoteId);
  quote.items = db.prepare('SELECT qi.*, p.name as product_name, p.code as product_code, p.unit FROM quote_items qi LEFT JOIN products p ON qi.product_id = p.id WHERE qi.quote_id = ?').all(quoteId);
  res.status(201).json(quote);
});

router.put('/:id', requireAuth, (req, res) => {
  const { status, notes, valid_until } = req.body;
  const quote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(req.params.id);
  if (!quote) return res.status(404).json({ detail: 'Orçamento não encontrado' });
  if (status) db.prepare('UPDATE quotes SET status = ? WHERE id = ?').run(status, req.params.id);
  if (notes !== undefined) db.prepare('UPDATE quotes SET notes = ? WHERE id = ?').run(notes, req.params.id);
  if (valid_until !== undefined) db.prepare('UPDATE quotes SET valid_until = ? WHERE id = ?').run(valid_until, req.params.id);
  const updated = db.prepare(`SELECT q.*, c.name as customer_name, u.full_name as user_name FROM quotes q LEFT JOIN customers c ON q.customer_id = c.id LEFT JOIN users u ON q.user_id = u.id WHERE q.id = ?`).get(req.params.id);
  updated.items = db.prepare('SELECT qi.*, p.name as product_name, p.code as product_code, p.unit FROM quote_items qi LEFT JOIN products p ON qi.product_id = p.id WHERE qi.quote_id = ?').all(req.params.id);
  res.json(updated);
});

router.post('/:id/convert', requireAuth, (req, res) => {
  const quote = db.prepare(`SELECT q.*, c.name as customer_name FROM quotes q LEFT JOIN customers c ON q.customer_id = c.id WHERE q.id = ?`).get(req.params.id);
  if (!quote) return res.status(404).json({ detail: 'Orçamento não encontrado' });
  if (quote.status === 'convertido') return res.status(400).json({ detail: 'Orçamento já convertido em venda' });

  const items = db.prepare('SELECT * FROM quote_items WHERE quote_id = ?').all(req.params.id);
  if (!items.length) return res.status(400).json({ detail: 'Orçamento sem itens' });

  const invoiceNumber = require('../utils').generateInvoiceNumber();
  const saleItems = [];
  for (const item of items) {
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(item.product_id);
    if (!product) return res.status(400).json({ detail: `Produto ID ${item.product_id} não encontrado` });
    if (item.quantity > product.current_stock) return res.status(400).json({ detail: `Estoque insuficiente para ${product.name}` });
    saleItems.push({ product_id: product.id, quantity: item.quantity, unit_price: item.unit_price, total_price: item.total_price, current_stock: product.current_stock });
  }

  const { payment_method, installments } = req.body;
  const r = db.prepare('INSERT INTO sales (invoice_number, customer_id, user_id, subtotal, discount, total, payment_method, installments, notes, status) VALUES (?,?,?,?,?,?,?,?,?,?)').run(
    invoiceNumber, quote.customer_id, req.user.id, quote.subtotal, quote.discount, quote.total, payment_method || 'pix', installments || 1, `Convertido do orçamento ${quote.quote_number}`, 'concluida'
  );
  const saleId = r.lastInsertRowid;

  const insItem = db.prepare('INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price) VALUES (?,?,?,?,?)');
  const updStock = db.prepare('UPDATE products SET current_stock = current_stock - ? WHERE id = ?');
  for (const si of saleItems) {
    insItem.run(saleId, si.product_id, si.quantity, si.unit_price, si.total_price);
    updStock.run(si.quantity, si.product_id);
  }

  db.prepare("INSERT INTO payments (sale_id, type, description, amount, due_date, paid_date, status) VALUES (?,'receber','Pagamento à vista',?,datetime('now'),datetime('now'),'pago')").run(saleId, quote.total);

  db.prepare("UPDATE quotes SET status = 'convertido' WHERE id = ?").run(req.params.id);

  const sale = db.prepare(`SELECT s.*, c.name as customer_name, u.full_name as user_name FROM sales s LEFT JOIN customers c ON s.customer_id = c.id LEFT JOIN users u ON s.user_id = u.id WHERE s.id = ?`).get(saleId);
  sale.items = db.prepare('SELECT si.*, p.name as product_name, p.code as product_code FROM sale_items si LEFT JOIN products p ON si.product_id = p.id WHERE si.sale_id = ?').all(saleId);
  res.status(201).json(sale);
});

router.delete('/:id', requireAuth, (req, res) => {
  const quote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(req.params.id);
  if (!quote) return res.status(404).json({ detail: 'Orçamento não encontrado' });
  db.prepare('DELETE FROM quote_items WHERE quote_id = ?').run(req.params.id);
  db.prepare('DELETE FROM quotes WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
