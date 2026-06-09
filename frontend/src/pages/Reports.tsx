import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { BarChart3, Package, Download, Search } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function Reports() {
  const [tab, setTab] = useState<'sales' | 'products'>('sales');
  const [salesData, setSalesData] = useState<any>(null);
  const [productData, setProductData] = useState<any>(null);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (tab === 'sales') {
      api.get('/reports/sales', { params: { start_date: startDate, end_date: endDate } })
        .then(res => setSalesData(res.data)).catch(() => {}).finally(() => setLoading(false));
    } else {
      api.get('/reports/products')
        .then(res => setProductData(res.data)).catch(() => {}).finally(() => setLoading(false));
    }
  }, [tab, startDate, endDate]);

  const tabs = [
    { key: 'sales', label: 'Relatório de Vendas', icon: BarChart3 },
    { key: 'products', label: 'Relatório de Produtos', icon: Package },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Relatórios</h1>
        <p className="text-gray-500 mt-1">Indicadores e análises do negócio</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'sales' ? (
        <div className="space-y-6">
          <div className="card">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Data Início</label>
                <input type="date" className="input-field" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Data Fim</label>
                <input type="date" className="input-field" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400">Carregando...</div>
          ) : salesData ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card !p-4">
                  <p className="text-sm text-gray-500">Total de Vendas</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(salesData.summary.total_sales)}</p>
                </div>
                <div className="card !p-4">
                  <p className="text-sm text-gray-500">Total de Itens</p>
                  <p className="text-2xl font-bold mt-1">{salesData.summary.total_items}</p>
                </div>
                <div className="card !p-4">
                  <p className="text-sm text-gray-500">Ticket Médio</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(salesData.summary.avg_ticket)}</p>
                </div>
                <div className="card !p-4">
                  <p className="text-sm text-gray-500">Transações</p>
                  <p className="text-2xl font-bold mt-1">{salesData.summary.total_transactions}</p>
                </div>
              </div>

              <div className="card">
                <h3 className="card-header">Vendas por Período</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesData.sales_by_period}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tickFormatter={d => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} fontSize={12} />
                      <YAxis fontSize={12} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={d => new Date(d).toLocaleDateString('pt-BR')} />
                      <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-400">Erro ao carregar dados</div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Carregando...</div>
          ) : productData ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card !p-4">
                  <p className="text-sm text-gray-500">Total de Produtos</p>
                  <p className="text-2xl font-bold mt-1">{productData.total_products}</p>
                </div>
                <div className="card !p-4">
                  <p className="text-sm text-gray-500">Valor em Estoque (Custo)</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(productData.total_inventory_value)}</p>
                </div>
                <div className="card !p-4">
                  <p className="text-sm text-gray-500">Valor em Estoque (Venda)</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(productData.total_sales_value)}</p>
                </div>
                <div className="card !p-4">
                  <p className="text-sm text-gray-500">Lucro Potencial</p>
                  <p className="text-2xl font-bold mt-1 text-green-600">{formatCurrency(productData.potential_profit)}</p>
                </div>
              </div>

              <div className="card">
                <h3 className="card-header">Produtos em Estoque</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="table-header">Produto</th>
                        <th className="table-header">Estoque</th>
                        <th className="table-header">Est. Mínimo</th>
                        <th className="table-header">Custo</th>
                        <th className="table-header">Venda</th>
                        <th className="table-header">Margem</th>
                        <th className="table-header">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {productData.products?.map((p: any) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="table-cell font-medium">
                            <span className="text-xs text-gray-500 font-mono mr-2">{p.code}</span>
                            {p.name}
                          </td>
                          <td className="table-cell">{p.current_stock}</td>
                          <td className="table-cell">{p.min_stock}</td>
                          <td className="table-cell">{formatCurrency(p.cost_price)}</td>
                          <td className="table-cell font-medium">{formatCurrency(p.selling_price)}</td>
                          <td className="table-cell">
                            <span className={p.profit_margin >= 30 ? 'text-green-600' : p.profit_margin >= 15 ? 'text-yellow-600' : 'text-red-600'}>
                              {p.profit_margin.toFixed(1)}%
                            </span>
                          </td>
                          <td className="table-cell">
                            <span className={p.current_stock <= p.min_stock ? 'badge-danger' : 'badge-success'}>
                              {p.current_stock <= p.min_stock ? 'Estoque Baixo' : 'OK'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {(!productData.products || productData.products.length === 0) && (
                        <tr><td colSpan={7} className="text-center py-8 text-gray-400">Nenhum produto encontrado</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-400">Erro ao carregar dados</div>
          )}
        </div>
      )}
    </div>
  );
}
