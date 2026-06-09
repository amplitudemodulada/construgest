const express = require('express');
const cors = require('cors');
const db = require('./lib/db');
const { autoSeed } = require('./lib/seed');
const { requireAuth, generateQuoteNumber, generateInvoiceNumber } = require('./lib/utils');

const app = express();

// CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://construgest-mu.vercel.app',
  'https://construgest-nine.vercel.app',
  'https://construtor-nine.vercel.app',
  'https://construtor.vercel.app',
  'https://construgest.vercel.app',
];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '50mb' }));

// Auto-seed
autoSeed();

// Routes
app.use('/api/auth', require('./lib/routes/auth'));
app.use('/api', require('./lib/routes/products'));
app.use('/api/customers', require('./lib/routes/customers'));
app.use('/api/suppliers', require('./lib/routes/suppliers'));
app.use('/api/sales', require('./lib/routes/sales'));
app.use('/api/financial', require('./lib/routes/financial'));
app.use('/api/purchases', require('./lib/routes/purchases'));
app.use('/api/reports', require('./lib/routes/reports'));

// Quotes router (inline to avoid Vercel detecting extra function files)
const quotesRouter = express.Router();
quotesRouter.get('/', requireAuth, (req, res) => {
  let sql = `SELECT q.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone, u.full_name as user_name FROM quotes q LEFT JOIN customers c ON q.customer_id = c.id LEFT JOIN users u ON q.user_id = u.id WHERE 1=1`;
  const params = [];
  if (req.query.start_date) { sql += ' AND q.created_at >= ?'; params.push(req.query.start_date); }
  if (req.query.end_date) { sql += ' AND q.created_at <= ?'; params.push(req.query.end_date + ' 23:59:59'); }
  if (req.query.status) { sql += ' AND q.status = ?'; params.push(req.query.status); }
  if (req.query.customer_id) { sql += ' AND q.customer_id = ?'; params.push(req.query.customer_id); }
  sql += ' ORDER BY q.created_at DESC';
  res.json(db.prepare(sql).all(...params));
});
quotesRouter.get('/:id', requireAuth, (req, res) => {
  const quote = db.prepare(`SELECT q.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone, c.address, c.number as customer_number, c.neighborhood, c.city, c.state, c.document as customer_document, u.full_name as user_name FROM quotes q LEFT JOIN customers c ON q.customer_id = c.id LEFT JOIN users u ON q.user_id = u.id WHERE q.id = ?`).get(req.params.id);
  if (!quote) return res.status(404).json({ detail: 'Orçamento não encontrado' });
  quote.items = db.prepare('SELECT qi.*, p.name as product_name, p.code as product_code, p.unit FROM quote_items qi LEFT JOIN products p ON qi.product_id = p.id WHERE qi.quote_id = ?').all(req.params.id);
  res.json(quote);
});
quotesRouter.post('/', requireAuth, (req, res) => {
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
  const r = db.prepare('INSERT INTO quotes (quote_number, customer_id, user_id, subtotal, discount, total, valid_until, notes) VALUES (?,?,?,?,?,?,?,?)').run(quoteNumber, customer_id || null, req.user.id, subtotal, disc, total, valid_until || null, notes || null);
  const quoteId = r.lastInsertRowid;
  const insItem = db.prepare('INSERT INTO quote_items (quote_id, product_id, quantity, unit_price, total_price) VALUES (?,?,?,?,?)');
  for (const qi of quoteItems) insItem.run(quoteId, qi.product_id, qi.quantity, qi.unit_price, qi.total_price);
  const quote = db.prepare(`SELECT q.*, c.name as customer_name, u.full_name as user_name FROM quotes q LEFT JOIN customers c ON q.customer_id = c.id LEFT JOIN users u ON q.user_id = u.id WHERE q.id = ?`).get(quoteId);
  quote.items = db.prepare('SELECT qi.*, p.name as product_name, p.code as product_code, p.unit FROM quote_items qi LEFT JOIN products p ON qi.product_id = p.id WHERE qi.quote_id = ?').all(quoteId);
  res.status(201).json(quote);
});
quotesRouter.put('/:id', requireAuth, (req, res) => {
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
quotesRouter.post('/:id/convert', requireAuth, (req, res) => {
  const quote = db.prepare(`SELECT q.*, c.name as customer_name FROM quotes q LEFT JOIN customers c ON q.customer_id = c.id WHERE q.id = ?`).get(req.params.id);
  if (!quote) return res.status(404).json({ detail: 'Orçamento não encontrado' });
  if (quote.status === 'convertido') return res.status(400).json({ detail: 'Orçamento já convertido em venda' });
  const items = db.prepare('SELECT * FROM quote_items WHERE quote_id = ?').all(req.params.id);
  if (!items.length) return res.status(400).json({ detail: 'Orçamento sem itens' });
  const saleItems = [];
  for (const item of items) {
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(item.product_id);
    if (!product) return res.status(400).json({ detail: `Produto ID ${item.product_id} não encontrado` });
    if (item.quantity > product.current_stock) return res.status(400).json({ detail: `Estoque insuficiente para ${product.name}` });
    saleItems.push({ product_id: product.id, quantity: item.quantity, unit_price: item.unit_price, total_price: item.total_price, current_stock: product.current_stock });
  }
  const invoiceNumber = generateInvoiceNumber();
  const { payment_method, installments } = req.body;
  const r = db.prepare('INSERT INTO sales (invoice_number, customer_id, user_id, subtotal, discount, total, payment_method, installments, notes, status) VALUES (?,?,?,?,?,?,?,?,?,?)').run(invoiceNumber, quote.customer_id, req.user.id, quote.subtotal, quote.discount, quote.total, payment_method || 'pix', installments || 1, `Convertido do orçamento ${quote.quote_number}`, 'concluida');
  const saleId = r.lastInsertRowid;
  const insItem = db.prepare('INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price) VALUES (?,?,?,?,?)');
  const updStock = db.prepare('UPDATE products SET current_stock = current_stock - ? WHERE id = ?');
  for (const si of saleItems) { insItem.run(saleId, si.product_id, si.quantity, si.unit_price, si.total_price); updStock.run(si.quantity, si.product_id); }
  db.prepare("INSERT INTO payments (sale_id, type, description, amount, due_date, paid_date, status) VALUES (?,'receber','Pagamento à vista',?,datetime('now'),datetime('now'),'pago')").run(saleId, quote.total);
  db.prepare("UPDATE quotes SET status = 'convertido' WHERE id = ?").run(req.params.id);
  const sale = db.prepare(`SELECT s.*, c.name as customer_name, u.full_name as user_name FROM sales s LEFT JOIN customers c ON s.customer_id = c.id LEFT JOIN users u ON s.user_id = u.id WHERE s.id = ?`).get(saleId);
  sale.items = db.prepare('SELECT si.*, p.name as product_name, p.code as product_code FROM sale_items si LEFT JOIN products p ON si.product_id = p.id WHERE si.sale_id = ?').all(saleId);
  res.status(201).json(sale);
});
quotesRouter.delete('/:id', requireAuth, (req, res) => {
  const quote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(req.params.id);
  if (!quote) return res.status(404).json({ detail: 'Orçamento não encontrado' });
  db.prepare('DELETE FROM quote_items WHERE quote_id = ?').run(req.params.id);
  db.prepare('DELETE FROM quotes WHERE id = ?').run(req.params.id);
  res.status(204).end();
});
app.use('/api/quotes', quotesRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', app: 'Construtor Gestão' });
});

// Backup endpoints
const fs = require('fs');

app.get('/api/backup/download', requireAuth, (req, res) => {
  const dbPath = require('./lib/db').dbPath;
  const stat = fs.statSync(dbPath);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename=construtor-backup-${new Date().toISOString().slice(0,10)}.db`);
  res.setHeader('Content-Length', stat.size);
  const stream = fs.createReadStream(dbPath);
  stream.pipe(res);
});

app.get('/api/backup/export', requireAuth, (req, res) => {
  const tables = ['users', 'categories', 'products', 'customers', 'suppliers', 'sales', 'sale_items', 'payments', 'purchases', 'purchase_items', 'quotes', 'quote_items', 'loyalty_programs', 'loyalty_points', 'stock_movements', 'audit_log'];
  const data = {};
  for (const table of tables) {
    try { data[table] = db.prepare(`SELECT * FROM ${table}`).all(); } catch { data[table] = []; }
  }
  data._exported_at = new Date().toISOString();
  data._version = '1.0.0';
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=construtor-export-${new Date().toISOString().slice(0,10)}.json`);
  res.json(data);
});

const multer = require('multer');
const upload = multer({ dest: '/tmp/uploads/', limits: { fileSize: 100 * 1024 * 1024 } });

app.post('/api/backup/restore', requireAuth, upload.single('backup'), (req, res) => {
  if (!req.file) return res.status(400).json({ detail: 'Arquivo de backup obrigatório' });
  try {
    const uploadedPath = req.file.path;
    const backupDb = new (require('better-sqlite3'))(uploadedPath);
    const tables = ['users', 'categories', 'products', 'customers', 'suppliers', 'sales', 'sale_items', 'payments', 'purchases', 'purchase_items', 'quotes', 'quote_items', 'loyalty_programs', 'loyalty_points', 'stock_movements', 'audit_log'];
    for (const table of tables) {
      try { backupDb.prepare(`SELECT 1 FROM ${table} LIMIT 1`).get(); } catch { backupDb.close(); return res.status(400).json({ detail: `Backup inválido: tabela '${table}' não encontrada` }); }
    }
    const allData = {};
    for (const table of tables) {
      allData[table] = backupDb.prepare(`SELECT * FROM ${table}`).all();
    }
    backupDb.close();

    const clearOrder = ['quote_items', 'quotes', 'sale_items', 'payments', 'sales', 'purchase_items', 'purchases', 'stock_movements', 'loyalty_points', 'loyalty_programs', 'audit_log', 'products', 'customers', 'suppliers', 'categories', 'users'];
    for (const table of clearOrder) {
      db.prepare(`DELETE FROM ${table}`).run();
    }

    for (const table of tables) {
      const rows = allData[table];
      if (!rows.length) continue;
      const cols = Object.keys(rows[0]).filter(k => k !== 'id');
      const placeholders = cols.map(() => '?').join(',');
      const stmt = db.prepare(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders})`);
      const insertMany = db.transaction((rows) => {
        for (const row of rows) {
          stmt.run(...cols.map(c => row[c]));
        }
      });
      insertMany(rows);
    }

    try { fs.unlinkSync(uploadedPath); } catch {}
    res.json({ message: 'Restauro concluído com sucesso', tables_restored: tables.length });
  } catch (err) {
    return res.status(500).json({ detail: 'Erro ao restaurar backup: ' + err.message });
  }
});

app.post('/api/backup/import', requireAuth, (req, res) => {
  const data = req.body;
  if (!data || typeof data !== 'object') return res.status(400).json({ detail: 'Dados JSON inválidos' });
  try {
    const tables = ['users', 'categories', 'products', 'customers', 'suppliers', 'sales', 'sale_items', 'payments', 'purchases', 'purchase_items', 'quotes', 'quote_items', 'loyalty_programs', 'loyalty_points', 'stock_movements', 'audit_log'];
    const allData = {};
    for (const table of tables) {
      if (Array.isArray(data[table])) allData[table] = data[table];
    }
    const clearOrder = ['quote_items', 'quotes', 'sale_items', 'payments', 'sales', 'purchase_items', 'purchases', 'stock_movements', 'loyalty_points', 'loyalty_programs', 'audit_log', 'products', 'customers', 'suppliers', 'categories', 'users'];
    for (const table of clearOrder) {
      db.prepare(`DELETE FROM ${table}`).run();
    }
    for (const table of tables) {
      const rows = allData[table];
      if (!rows?.length) continue;
      const cols = Object.keys(rows[0]).filter(k => k !== 'id');
      const placeholders = cols.map(() => '?').join(',');
      const stmt = db.prepare(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders})`);
      const insertMany = db.transaction((rows) => {
        for (const row of rows) {
          stmt.run(...cols.map(c => row[c]));
        }
      });
      insertMany(rows);
    }
    res.json({ message: 'Importação concluída com sucesso', tables_imported: tables.filter(t => allData[t]?.length).length });
  } catch (err) {
    return res.status(500).json({ detail: 'Erro ao importar dados: ' + err.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ detail: 'Endpoint não encontrado' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ detail: 'Erro interno do servidor' });
});

module.exports = app;
