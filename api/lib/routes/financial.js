const { Router } = require('express');
const db = require('../db');
const { requireAuth } = require('../utils');

const router = Router();

router.get('/accounts-receivable', requireAuth, (req, res) => {
  let sql = "SELECT p.*, s.invoice_number as reference FROM payments p LEFT JOIN sales s ON p.sale_id = s.id WHERE p.type = 'receber'";
  const params = [];
  if (req.query.status) { sql += ' AND p.status = ?'; params.push(req.query.status); }
  if (req.query.start_date) { sql += ' AND p.due_date >= ?'; params.push(req.query.start_date); }
  if (req.query.end_date) { sql += ' AND p.due_date <= ?'; params.push(req.query.end_date); }
  sql += ' ORDER BY p.due_date';
  res.json(db.prepare(sql).all(...params));
});

router.get('/accounts-payable', requireAuth, (req, res) => {
  let sql = "SELECT p.*, po.order_number as reference FROM payments p LEFT JOIN purchases po ON p.purchase_id = po.id WHERE p.type = 'pagar'";
  const params = [];
  if (req.query.status) { sql += ' AND p.status = ?'; params.push(req.query.status); }
  if (req.query.start_date) { sql += ' AND p.due_date >= ?'; params.push(req.query.start_date); }
  if (req.query.end_date) { sql += ' AND p.due_date <= ?'; params.push(req.query.end_date); }
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
