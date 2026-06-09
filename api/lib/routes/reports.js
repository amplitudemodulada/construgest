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

  const recentSales = db.prepare(`SELECT s.id, s.invoice_number, s.total, s.payment_method, s.created_at, c.name as customer_name, u.full_name as user_name FROM sales s LEFT JOIN customers c ON s.customer_id = c.id LEFT JOIN users u ON s.user_id = u.id ORDER BY s.created_at DESC LIMIT 5`).all();

  const salesByDay = db.prepare(`SELECT date(created_at) as date, COUNT(*) as count, COALESCE(SUM(total),0) as total FROM sales WHERE created_at >= date('now', '-30 days') GROUP BY date(created_at) ORDER BY date`).all();

  const topProducts = db.prepare(`SELECT p.id, p.name, p.code, SUM(si.quantity) as total_qty, COALESCE(SUM(si.total_price),0) as total_revenue FROM sale_items si JOIN products p ON si.product_id = p.id GROUP BY si.product_id ORDER BY total_qty DESC LIMIT 5`).all();

  res.json({
    total_sales_today: todaySales.total,
    total_sales_month: monthSales.total,
    total_sales_year: 0,
    total_customers: totalCustomers.count,
    total_products: totalProducts.count,
    low_stock_count: lowStock.count,
    pending_receivable: receber.total,
    overdue_receivable: 0,
    pending_payable: pagar.total,
    sales_by_period: salesByDay,
    sales_by_category: [],
    top_products: topProducts.map(p => ({ name: p.name, quantity: p.total_qty, total: p.total_revenue })),
    recent_sales: recentSales.map(s => ({ ...s, user_name: s.user_name || '' })),
  });
});

router.get('/sales', requireAuth, (req, res) => {
  const { start_date, end_date } = req.query;
  let sql = `SELECT date(created_at) as date, COUNT(*) as count, COALESCE(SUM(total),0) as total FROM sales WHERE 1=1`;
  const params = [];
  if (start_date) { sql += ' AND created_at >= ?'; params.push(start_date); }
  if (end_date) { sql += ' AND created_at <= ?'; params.push(end_date + ' 23:59:59'); }
  sql += ` GROUP BY date ORDER BY date`;

  const salesByPeriod = db.prepare(sql).all(...params);

  const totalSalesValue = salesByPeriod.reduce((acc, s) => acc + s.total, 0);
  const totalTransactions = salesByPeriod.reduce((acc, s) => acc + s.count, 0);

  let totalItems = 0;
  if (start_date && end_date) {
    const itemCount = db.prepare(`SELECT COALESCE(SUM(si.quantity),0) as total FROM sale_items si JOIN sales s ON si.sale_id = s.id WHERE s.created_at >= ? AND s.created_at <= ?`).get(start_date, end_date + ' 23:59:59');
    totalItems = itemCount.total;
  } else if (start_date) {
    const itemCount = db.prepare(`SELECT COALESCE(SUM(si.quantity),0) as total FROM sale_items si JOIN sales s ON si.sale_id = s.id WHERE s.created_at >= ?`).get(start_date);
    totalItems = itemCount.total;
  } else if (end_date) {
    const itemCount = db.prepare(`SELECT COALESCE(SUM(si.quantity),0) as total FROM sale_items si JOIN sales s ON si.sale_id = s.id WHERE s.created_at <= ?`).get(end_date + ' 23:59:59');
    totalItems = itemCount.total;
  } else {
    const itemCount = db.prepare('SELECT COALESCE(SUM(quantity),0) as total FROM sale_items').get();
    totalItems = itemCount.total;
  }

  res.json({
    sales_by_period: salesByPeriod.map(s => ({ date: s.date, total: s.total })),
    summary: {
      total_sales: totalSalesValue,
      total_items: totalItems,
      avg_ticket: totalTransactions > 0 ? totalSalesValue / totalTransactions : 0,
      total_transactions: totalTransactions,
    }
  });
});

router.get('/products', requireAuth, (req, res) => {
  const items = db.prepare(`SELECT p.id, p.code, p.name, c.name as category_name, p.current_stock, p.min_stock, p.cost_price, p.selling_price, COALESCE(SUM(si.quantity),0) as total_sold, COALESCE(SUM(si.total_price),0) as total_revenue FROM products p LEFT JOIN categories c ON p.category_id = c.id LEFT JOIN sale_items si ON p.id = si.product_id WHERE p.is_active = 1 GROUP BY p.id ORDER BY total_sold DESC`).all();
  const products = items.map(p => ({
    ...p,
    profit_margin: p.cost_price > 0 ? ((p.selling_price - p.cost_price) / p.selling_price * 100) : 0,
  }));
  res.json({
    total_products: products.length,
    total_inventory_value: products.reduce((acc, p) => acc + (p.current_stock * p.cost_price), 0),
    total_sales_value: products.reduce((acc, p) => acc + (p.current_stock * p.selling_price), 0),
    potential_profit: products.reduce((acc, p) => acc + (p.current_stock * (p.selling_price - p.cost_price)), 0),
    products,
  });
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
