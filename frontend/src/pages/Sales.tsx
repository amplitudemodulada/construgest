import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Sale } from '../types';
import { Plus, Search, Eye, XCircle } from 'lucide-react';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const statusLabels: Record<string, { label: string; class: string }> = {
  orcamento: { label: 'Orçamento', class: 'badge-info' },
  confirmado: { label: 'Confirmado', class: 'badge-success' },
  em_andamento: { label: 'Em Andamento', class: 'badge-warning' },
  concluido: { label: 'Concluído', class: 'badge-success' },
  cancelado: { label: 'Cancelado', class: 'badge-danger' },
};

const paymentLabels: Record<string, string> = {
  dinheiro: 'Dinheiro', cartao_credito: 'Cartão Crédito', cartao_debito: 'Cartão Débito',
  pix: 'PIX', boleto: 'Boleto', transferencia: 'Transferência', multiplo: 'Múltiplo',
};

export default function Sales() {
  const navigate = useNavigate();
  const [sales, setSales] = useState<Sale[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/sales/', { params });
      setSales(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search, statusFilter]);

  const handleCancel = async (id: number) => {
    if (!confirm('Tem certeza que deseja cancelar esta venda?')) return;
    try {
      await api.put(`/sales/${id}/cancel`);
      load();
    } catch { alert('Erro ao cancelar venda'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Vendas</h1>
          <p className="text-gray-500 mt-1">Gerencie suas vendas e orçamentos</p>
        </div>
        <button onClick={() => navigate('/sales/new')} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nova Venda
        </button>
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Buscar por número da NF..." className="input-field pl-10" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="select-field sm:w-44" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="orcamento">Orçamento</option>
            <option value="confirmado">Confirmado</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="concluido">Concluído</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>

        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-8 text-gray-400">Carregando...</div>
          ) : sales.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>Nenhuma venda encontrada</p>
              <button onClick={() => navigate('/sales/new')} className="btn-primary mt-4">Criar Primeira Venda</button>
            </div>
          ) : sales.map(sale => (
            <div key={sale.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedId(expandedId === sale.id ? null : sale.id)}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{sale.invoice_number || 'Sem NF'}</p>
                    <p className="text-xs text-gray-500">{sale.customer?.name || 'Consumidor'}</p>
                  </div>
                  <span className={statusLabels[sale.status]?.class || 'badge-info'}>
                    {statusLabels[sale.status]?.label || sale.status}
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(sale.total)}</p>
                  <p className="text-xs text-gray-500">{paymentLabels[sale.payment_method] || sale.payment_method}</p>
                </div>
              </div>
              {expandedId === sale.id && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm mb-3">
                    <div><span className="text-gray-500">Subtotal:</span> <span className="font-medium">{formatCurrency(sale.subtotal)}</span></div>
                    <div><span className="text-gray-500">Desconto:</span> <span className="font-medium">{formatCurrency(sale.discount)}</span></div>
                    <div><span className="text-gray-500">Parcelas:</span> <span className="font-medium">{sale.installments}x</span></div>
                  </div>
                  <div className="overflow-x-auto mb-3">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="px-2 py-1 text-left text-gray-500">Produto</th>
                          <th className="px-2 py-1 text-right text-gray-500">Qtd</th>
                          <th className="px-2 py-1 text-right text-gray-500">Preço</th>
                          <th className="px-2 py-1 text-right text-gray-500">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sale.items?.map((item, i) => (
                          <tr key={i}>
                            <td className="px-2 py-1">{item.product?.name || `Produto #${item.product_id}`}</td>
                            <td className="px-2 py-1 text-right">{item.quantity}</td>
                            <td className="px-2 py-1 text-right">{formatCurrency(item.unit_price)}</td>
                            <td className="px-2 py-1 text-right font-medium">{formatCurrency(item.total_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {sale.status !== 'cancelado' && sale.status !== 'concluido' && (
                    <button onClick={() => handleCancel(sale.id)} className="btn-danger text-xs flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> Cancelar Venda
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
