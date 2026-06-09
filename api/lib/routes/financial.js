const { Router } = require('express');
const db = require('../db');
const { requireAuth } = require('../utils');

const router = Router();

// Matches frontend /api/financial/receivable
router.get('/receivable', requireAuth, (req, res) => {
  let sql = `SELECT p.*, s.invoice_number as reference, c.name as customer_name, c.id as customer_id FROM payments p LEFT JOIN sales s ON p.sale_id = s.id LEFT JOIN customers c ON s.customer_id = c.id WHERE p.type = 'receber'`;
  const params = [];
  if (req.query.status) { sql += ' AND p.status = ?'; params.push(req.query.status); }
  sql += ' ORDER BY p.due_date';
  const items = db.prepare(sql).all(...params);
  res.json(items.map(i => ({
    ...i, customer: i.customer_id ? { id: i.customer_id, name: i.customer_name } : null
  })));
});

// Matches frontend /api/financial/receivable/:id/pay
router.post('/receivable/:id/pay', requireAuth, (req, res) => {
  const pay = db.prepare('SELECT * FROM payments WHERE id = ? AND type = ?').get(req.params.id, 'receber');
  if (!pay) return res.status(404).json({ detail: 'Recebível não encontrado' });
  db.prepare("UPDATE payments SET status = 'pago', paid_date = datetime('now') WHERE id = ?").run(req.params.id);
  res.json(db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id));
});

// Matches frontend /api/financial/payable
router.get('/payable', requireAuth, (req, res) => {
  let sql = `SELECT p.*, po.order_number as reference, s.company_name as supplier_name, s.id as supplier_id FROM payments p LEFT JOIN purchases po ON p.purchase_id = po.id LEFT JOIN suppliers s ON po.supplier_id = s.id WHERE p.type = 'pagar'`;
  const params = [];
  if (req.query.status) { sql += ' AND p.status = ?'; params.push(req.query.status); }
  sql += ' ORDER BY p.due_date';
  const items = db.prepare(sql).all(...params);
  res.json(items.map(i => ({
    ...i, supplier: i.supplier_id ? { id: i.supplier_id, company_name: i.supplier_name } : null
  })));
});

// Matches frontend /api/financial/payable/:id/pay
router.post('/payable/:id/pay', requireAuth, (req, res) => {
  const pay = db.prepare('SELECT * FROM payments WHERE id = ? AND type = ?').get(req.params.id, 'pagar');
  if (!pay) return res.status(404).json({ detail: 'Pagamento não encontrado' });
  db.prepare("UPDATE payments SET status = 'pago', paid_date = datetime('now') WHERE id = ?").run(req.params.id);
  res.json(db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id));
});

// Matches frontend /api/financial/cash-flow
router.get('/cash-flow', requireAuth, (req, res) => {
  const receitaPago = db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE type = 'receber' AND status = 'pago'").get();
  const receitaPendente = db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE type = 'receber' AND status = 'pendente'").get();
  const receitaTotal = db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE type = 'receber'").get();
  const despesaPago = db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE type = 'pagar' AND status = 'pago'").get();
  const despesaPendente = db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE type = 'pagar' AND status = 'pendente'").get();
  const despesaTotal = db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE type = 'pagar'").get();
  res.json({
    receivable: {
      total: receitaTotal.total,
      received: receitaPago.total,
      pending: receitaPendente.total
    },
    payable: {
      total: despesaTotal.total,
      paid: despesaPago.total,
      pending: despesaPendente.total
    },
    balance: {
      projected: receitaPendente.total - despesaPendente.total + (receitaPago.total - despesaPago.total),
      actual: receitaPago.total - despesaPago.total
    }
  });
});

// Keep old paths for backward compatibility
router.get('/accounts-receivable', requireAuth, (req, res) => {
  let sql = "SELECT p.*, s.invoice_number as reference FROM payments p LEFT JOIN sales s ON p.sale_id = s.id WHERE p.type = 'receber'";
  const params = [];
  if (req.query.status) { sql += ' AND p.status = ?'; params.push(req.query.status); }
  sql += ' ORDER BY p.due_date';
  res.json(db.prepare(sql).all(...params));
});

router.get('/accounts-payable', requireAuth, (req, res) => {
  let sql = "SELECT p.*, po.order_number as reference FROM payments p LEFT JOIN purchases po ON p.purchase_id = po.id WHERE p.type = 'pagar'";
  const params = [];
  if (req.query.status) { sql += ' AND p.status = ?'; params.push(req.query.status); }
  sql += ' ORDER BY p.due_date';
  res.json(db.prepare(sql).all(...params));
});

router.get('/summary', requireAuth, (req, res) => {
  const receber = db.prepare("SELECT COALESCE(SUM(CASE WHEN status = 'pendente' THEN amount ELSE 0 END),0) as pending, COALESCE(SUM(CASE WHEN status = 'pago' THEN amount ELSE 0 END),0) as paid FROM payments WHERE type = 'receber'").get();
  const pagar = db.prepare("SELECT COALESCE(SUM(CASE WHEN status = 'pendente' THEN amount ELSE 0 END),0) as pending, COALESCE(SUM(CASE WHEN status = 'pago' THEN amount ELSE 0 END),0) as paid FROM payments WHERE type = 'pagar'").get();
  const todaySales = db.prepare("SELECT COALESCE(SUM(total),0) as total FROM sales WHERE date(created_at) = date('now')").get();
  const totalSales = db.prepare("SELECT COALESCE(SUM(total),0) as total FROM sales").get();
  res.json({
    accounts_receivable: { pending: receber.pending, paid: receber.paid, total: receber.pending + receber.paid },
    accounts_payable: { pending: pagar.pending, paid: pagar.paid, total: pagar.pending + pagar.paid },
    today_sales: todaySales.total,
    total_sales: totalSales.total,
    balance: receber.paid - pagar.paid
  });
});

router.post('/payments/:id/pay', requireAuth, (req, res) => {
  const pay = db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id);
  if (!pay) return res.status(404).json({ detail: 'Pagamento não encontrado' });
  db.prepare("UPDATE payments SET status = 'pago', paid_date = datetime('now') WHERE id = ?").run(req.params.id);
  res.json(db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id));
});

module.exports = router;
