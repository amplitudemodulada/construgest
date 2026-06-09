import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { DashboardData } from '../types';
import { Package, ShoppingCart, Users, DollarSign, TrendingUp, AlertTriangle, ArrowUpRight, ArrowDownRight, HardHat, X, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const welcomed = sessionStorage.getItem('welcome_shown');
    if (!welcomed) {
      setShowWelcome(true);
      sessionStorage.setItem('welcome_shown', 'true');
    }
  }, []);

  useEffect(() => {
    api.get('/reports/dashboard').then(res => {
      setData(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Erro ao carregar dados do dashboard.</p>
        <button onClick={() => window.location.reload()} className="btn-primary mt-4 touch-manipulation">Tentar novamente</button>
      </div>
    );
  }

  const kpiCards = [
    { title: 'Vendas Hoje', value: formatCurrency(data.total_sales_today), icon: ShoppingCart, color: 'bg-blue-500', change: '+12%', positive: true },
    { title: 'Vendas do Mês', value: formatCurrency(data.total_sales_month), icon: TrendingUp, color: 'bg-green-500', change: '+8.5%', positive: true },
    { title: 'Clientes', value: data.total_customers.toString(), icon: Users, color: 'bg-purple-500', change: '+5%', positive: true },
    { title: 'Produtos', value: data.total_products.toString(), icon: Package, color: 'bg-orange-500', change: null, positive: true },
    { title: 'Estoque Baixo', value: data.low_stock_count.toString(), icon: AlertTriangle, color: 'bg-red-500', change: null, positive: false },
    { title: 'A Receber (Pendente)', value: formatCurrency(data.pending_receivable), icon: DollarSign, color: 'bg-yellow-500', change: null, positive: false },
  ];

  return (
    <div className="space-y-6">
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowWelcome(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative animate-fadeIn" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowWelcome(false)} className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-lg touch-manipulation">
              <X className="w-5 h-5 text-gray-400" />
            </button>
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mb-4">
                <HardHat className="w-8 h-8 text-primary-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                Bem-vindo, <span className="text-primary-600">{user?.full_name?.split(' ')[0]}</span>!
              </h2>
              <div className="flex items-center justify-center gap-1 mt-2 text-sm text-gray-500">
                <Sparkles className="w-4 h-4 text-yellow-500" />
                <span>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
              <p className="text-gray-500 mt-4 leading-relaxed">
                Que bom ter você aqui! Vamos transformar ideias em obras e construir resultados incríveis juntos.
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600 font-medium">
                <HardHat className="w-3 h-3" />
                {user?.role === 'admin' ? 'Administrador' : user?.role === 'vendedor' ? 'Vendedor' : user?.role === 'estoquista' ? 'Estoquista' : user?.role || 'Usuário'}
              </div>
              <button
                onClick={() => setShowWelcome(false)}
                className="btn-primary w-full mt-6 py-3 flex items-center justify-center gap-2 touch-manipulation"
              >
                <HardHat className="w-5 h-5" /> Bora trabalhar!
              </button>
            </div>
          </div>
        </div>
      )}
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="text-gray-500 mt-1">Visão geral do negócio</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map((card, i) => (
          <div key={i} className="card !p-4">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${card.color}`}>
                <card.icon className="w-4 h-4 text-white" />
              </div>
              {card.change && (
                <span className={`flex items-center text-xs font-medium ${card.positive ? 'text-green-600' : 'text-red-600'}`}>
                  {card.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {card.change}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-xs text-gray-500 mt-1">{card.title}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="card-header">Vendas dos Últimos 7 Dias</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.sales_by_period}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tickFormatter={d => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} fontSize={12} />
                <YAxis fontSize={12} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={d => new Date(d).toLocaleDateString('pt-BR')} />
                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="card-header">Vendas por Categoria</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.sales_by_category}
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={100}
                  dataKey="total" nameKey="category"
                  label={({ category, percent }) => `${category} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {data.sales_by_category.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="card-header">Top 10 Produtos</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.top_products} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" fontSize={12} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" width={140} fontSize={11} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="total" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="card-header">Vendas Recentes</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="table-header">NF</th>
                  <th className="table-header">Cliente</th>
                  <th className="table-header">Valor</th>
                  <th className="table-header">Pagamento</th>
                  <th className="table-header">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.recent_sales.map(sale => (
                  <tr key={sale.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate('/sales')}>
                    <td className="table-cell font-medium">{sale.invoice_number}</td>
                    <td className="table-cell">{sale.customer_name}</td>
                    <td className="table-cell font-medium">{formatCurrency(sale.total)}</td>
                    <td className="table-cell">
                      <span className="badge-info">{sale.payment_method}</span>
                    </td>
                    <td className="table-cell text-gray-500">
                      {new Date(sale.created_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
                {data.recent_sales.length === 0 && (
                  <tr><td colSpan={5} className="table-cell text-center text-gray-400">Nenhuma venda recente</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
