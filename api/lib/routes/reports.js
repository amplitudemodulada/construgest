const { Router } = require('express');
const db = require('../db');
const { requireAuth } = require('../utils');

const router = Router();

router.get('/dashboard', requireAuth, (req, res) => {
  const todaySales = db.prepare("SELECT COALESCE(COUNT(*),0) as count, COALESCE(SUM(total),0) as total FROM sales WHERE date(created_at) = date('now')").get();
  const monthSales = db.prepare("SELECT COALESCE(COUNT(*),0) as count, COALESCE(SUM(total),0) as total FROM sales WHERE strftime('%Y%m', created_at) = strftime('%Y%m', 'now')").get();
  const monthPurchases = db.prepare("SELECT COALESCE(COUNT(*),0) as count, COALESCE(SUM(total),0) as total FROM purchases WHERE strftime('%Y%m', created_at) = strftime('%Y%m', 'now')").get();
  const lowStock = db.prepare('SELECT COUNT(*) as count FROM products WHERE is_active = 1 AND current_stock <= min_stock').get();
  const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products WHERE is_active = 1').get();
  const totalCustomers = db.prepare('SELECT COUNT(*) as count FROM customers WHERE is_active = 1').get();
  const totalSuppliers = db.prepare('SELECT COUNT(*) as count FROM suppliers WHERE is_active = 1').get();

  const receber = db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE type = 'receber' AND status = 'pendente'").get();
  const pagar = db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE type = 'pagar' AND status = 'pendente'").get();

  const stockValue = db.prepare("SELECT COALESCE(SUM(current_stock * cost_price),0) as total FROM products WHERE is_active = 1").get();

  const recentSales = db.prepare(`SELECT s.id, s.invoice_number, s.total, s.created_at, c.name as customer_name FROM sales s LEFT JOIN customers c ON s.customer_id = c.id ORDER BY s.created_at DESC LIMIT 5`).all();

  const salesByDay = db.prepare(`SELECT date(created_at) as date, COUNT(*) as count, COALESCE(SUM(total),0) as total FROM sales WHERE created_at >= date('now', '-30 days') GROUP BY date(created_at) ORDER BY date`).all();

  const topProducts = db.prepare(`SELECT p.id, p.name, p.code, SUM(si.quantity) as total_qty, COALESCE(SUM(si.total_price),0) as total_revenue FROM sale_items si JOIN products p ON si.product_id = p.id GROUP BY si.product_id ORDER BY total_qty DESC LIMIT 5`).all();

  res.json({
    today_sales: { count: todaySales.count, total: todaySales.total },
    month_sales: { count: monthSales.count, total: monthSales.total },
    month_purchases: { count: monthPurchases.count, total: monthPurchases.total },
    low_stock: lowStock.count,
    total_products: totalProducts.count,
    total_customers: totalCustomers.count,
    total_suppliers: totalSuppliers.count,
    accounts_receivable: receber.total,
    accounts_payable: pagar.total,
    stock_value: stockValue.total,
    recent_sales: recentSales,
    sales_by_day: salesByDay,
    top_products: topProducts,
  });
});

router.get('/sales', requireAuth, (req, res) => {
  const { start_date, end_date, group_by } = req.query;
  const groupCol = group_by === 'week' ? "strftime('%Y-%W', created_at)" : group_by === 'month' ? "strftime('%Y-%m', created_at)" : "date(created_at)";
  let sql = `SELECT ${groupCol} as period, COUNT(*) as count, COALESCE(SUM(total),0) as total FROM sales WHERE 1=1`;
  const params = [];
  if (start_date) { sql += ' AND created_at >= ?'; params.push(start_date); }
  if (end_date) { sql += ' AND created_at <= ?'; params.push(end_date + ' 23:59:59'); }
  sql += ` GROUP BY period ORDER BY period`;
  res.json(db.prepare(sql).all(...params));
});

router.get('/products', requireAuth, (req, res) => {
  const items = db.prepare(`SELECT p.id, p.code, p.name, c.name as category_name, p.current_stock, p.min_stock, p.cost_price, p.selling_price, COALESCE(SUM(si.quantity),0) as total_sold, COALESCE(SUM(si.total_price),0) as total_revenue FROM products p LEFT JOIN categories c ON p.category_id = c.id LEFT JOIN sale_items si ON p.id = si.product_id WHERE p.is_active = 1 GROUP BY p.id ORDER BY total_sold DESC`).all();
  res.json(items);
});

router.get('/financial', requireAuth, (req, res) => {
  const { start_date, end_date } = req.query;
  const params = [];
  let receiptSql = "SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE type = 'receber' AND status = 'pago'";
  let expenseSql = "SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE type = 'pagar' AND status = 'pago'";
  if (start_date) { receiptSql += ' AND paid_date >= ?'; expenseSql += ' AND paid_date >= ?'; params.push(start_date); }
  if (end_date) { receiptSql += ' AND paid_date <= ?'; expenseSql += ' AND paid_date <= ?'; params.push(end_date); }
  const receipts = db.prepare(receiptSql).get(...(params.length ? params : []));
  const expenses = db.prepare(expenseSql).get(...(params.length ? params : []));
  res.json({ total_receipts: receipts.total, total_expenses: expenses.total, balance: receipts.total - expenses.total });
});

router.get('/loyalty', requireAuth, (req, res) => {
  res.json(db.prepare(`SELECT lp.customer_id, c.name as customer_name, SUM(CASE WHEN lp.type = 'earn' THEN lp.points ELSE 0 END) - SUM(CASE WHEN lp.type = 'redeem' THEN lp.points ELSE 0 END) as balance FROM loyalty_points lp JOIN customers c ON lp.customer_id = c.id GROUP BY lp.customer_id ORDER BY balance DESC`).all());
});

module.exports = router;
