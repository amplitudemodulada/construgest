const express = require('express');
const cors = require('cors');
const { autoSeed } = require('./lib/seed');

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
app.use('/api/quotes', require('./lib/routes/quotes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', app: 'Construtor Gestão' });
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
