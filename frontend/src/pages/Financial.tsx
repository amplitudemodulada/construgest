import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { AccountReceivable, AccountPayable } from '../types';
import { DollarSign, ArrowUpRight, ArrowDownRight, TrendingUp, CheckCircle, X } from 'lucide-react';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const statusLabels: Record<string, { label: string; class: string }> = {
  pendente: { label: 'Pendente', class: 'badge-warning' },
  pago: { label: 'Pago', class: 'badge-success' },
  vencido: { label: 'Vencido', class: 'badge-danger' },
  cancelado: { label: 'Cancelado', class: 'badge-info' },
};

export default function Financial() {
  const [tab, setTab] = useState<'receivable' | 'payable' | 'cashflow'>('receivable');
  const [receivables, setReceivables] = useState<AccountReceivable[]>([]);
  const [payables, setPayables] = useState<AccountPayable[]>([]);
  const [cashFlow, setCashFlow] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (tab === 'receivable') {
      api.get('/financial/receivable', { params: { status: statusFilter || undefined } })
        .then(res => setReceivables(res.data)).catch(() => {}).finally(() => setLoading(false));
    } else if (tab === 'payable') {
      api.get('/financial/payable', { params: { status: statusFilter || undefined } })
        .then(res => setPayables(res.data)).catch(() => {}).finally(() => setLoading(false));
    } else {
      api.get('/financial/cash-flow')
        .then(res => setCashFlow(res.data)).catch(() => {}).finally(() => setLoading(false));
    }
  }, [tab, statusFilter]);

  const handleReceivePayment = async (id: number) => {
    try {
      await api.post(`/financial/receivable/${id}/pay`);
      setReceivables(prev => prev.map(r => r.id === id ? { ...r, status: 'pago', paid_amount: r.amount } : r));
    } catch { alert('Erro ao registrar pagamento'); }
  };

  const handlePayBill = async (id: number) => {
    try {
      await api.post(`/financial/payable/${id}/pay`);
      setPayables(prev => prev.map(p => p.id === id ? { ...p, status: 'pago', paid_amount: p.amount } : p));
    } catch { alert('Erro ao registrar pagamento'); }
  };

  const tabs = [
    { key: 'receivable', label: 'Contas a Receber', icon: ArrowUpRight },
    { key: 'payable', label: 'Contas a Pagar', icon: ArrowDownRight },
    { key: 'cashflow', label: 'Fluxo de Caixa', icon: TrendingUp },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Financeiro</h1>
        <p className="text-gray-500 mt-1">Controle financeiro da loja</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setStatusFilter(''); }}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'cashflow' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cashFlow ? (
            <>
              <div className="card">
                <h3 className="card-header text-blue-600">Contas a Receber</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Total:</span><span className="font-semibold">{formatCurrency(cashFlow.receivable.total)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Recebido:</span><span className="font-semibold text-green-600">{formatCurrency(cashFlow.receivable.received)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Pendente:</span><span className="font-semibold text-yellow-600">{formatCurrency(cashFlow.receivable.pending)}</span></div>
                </div>
              </div>
              <div className="card">
                <h3 className="card-header text-red-600">Contas a Pagar</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Total:</span><span className="font-semibold">{formatCurrency(cashFlow.payable.total)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Pago:</span><span className="font-semibold text-green-600">{formatCurrency(cashFlow.payable.paid)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Pendente:</span><span className="font-semibold text-yellow-600">{formatCurrency(cashFlow.payable.pending)}</span></div>
                </div>
              </div>
              <div className="card">
                <h3 className="card-header">Saldo</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Projetado:</span>
                    <span className={`font-semibold ${cashFlow.balance.projected >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(cashFlow.balance.projected)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Realizado:</span>
                    <span className={`font-semibold ${cashFlow.balance.actual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(cashFlow.balance.actual)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="col-span-3 text-center py-8 text-gray-400">Carregando...</div>
          )}
        </div>
      ) : (
        <div className="card">
          <div className="mb-4">
            <select className="select-field sm:w-44" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">Todos</option>
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
              <option value="vencido">Vencido</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="table-header">Descrição</th>
                  {tab === 'receivable' && <th className="table-header">Cliente</th>}
                  {tab === 'payable' && <th className="table-header">Fornecedor</th>}
                  <th className="table-header">Valor</th>
                  <th className="table-header">Recebido/Pago</th>
                  <th className="table-header">Vencimento</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-400">Carregando...</td></tr>
                ) : (tab === 'receivable' ? receivables : payables).length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-400">Nenhum registro encontrado</td></tr>
                ) : (tab === 'receivable' ? receivables : payables).map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium">{item.description}</td>
                    {tab === 'receivable' && <td className="table-cell">{item.customer?.name || '-'}</td>}
                    {tab === 'payable' && <td className="table-cell">{item.supplier?.company_name || '-'}</td>}
                    <td className="table-cell font-medium">{formatCurrency(item.amount)}</td>
                    <td className="table-cell">{formatCurrency(item.paid_amount || 0)}</td>
                    <td className="table-cell text-gray-500">{new Date(item.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                    <td className="table-cell">
                      <span className={statusLabels[item.status]?.class || 'badge-info'}>
                        {statusLabels[item.status]?.label || item.status}
                      </span>
                    </td>
                    <td className="table-cell">
                      {item.status !== 'pago' && item.status !== 'cancelado' && (
                        <button
                          onClick={() => tab === 'receivable' ? handleReceivePayment(item.id) : handlePayBill(item.id)}
                          className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800"
                        >
                          <CheckCircle className="w-3 h-3" /> {tab === 'receivable' ? 'Receber' : 'Pagar'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
