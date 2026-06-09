import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Quote } from '../types';
import { Plus, Search, FileText, Eye, Trash2 } from 'lucide-react';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const statusLabels: Record<string, { label: string; class: string }> = {
  pendente: { label: 'Pendente', class: 'badge-warning' },
  aprovado: { label: 'Aprovado', class: 'badge-success' },
  recusado: { label: 'Recusado', class: 'badge-danger' },
  convertido: { label: 'Convertido', class: 'badge-info' },
};

export default function Quotes() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/quotes/', { params });
      setQuotes(res.data);
    } catch { console.error('Erro ao carregar orçamentos'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const filtered = quotes.filter(q =>
    !search || q.quote_number.toLowerCase().includes(search.toLowerCase()) ||
    (q.customer_name && q.customer_name.toLowerCase().includes(search.toLowerCase()))
  );

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este orçamento?')) return;
    try {
      await api.delete(`/quotes/${id}`);
      load();
    } catch { alert('Erro ao excluir orçamento'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Orçamentos</h1>
          <p className="text-gray-500 mt-1">Crie e gerencie orçamentos para seus clientes</p>
        </div>
        <button onClick={() => navigate('/quotes/new')} className="btn-primary flex items-center gap-2 touch-manipulation">
          <Plus className="w-4 h-4" /> Novo Orçamento
        </button>
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Buscar por número ou cliente..." className="input-field pl-10" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="select-field sm:w-44" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="aprovado">Aprovado</option>
            <option value="recusado">Recusado</option>
            <option value="convertido">Convertido</option>
          </select>
        </div>

        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-8 text-gray-400">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum orçamento encontrado</p>
              <button onClick={() => navigate('/quotes/new')} className="btn-primary mt-4 touch-manipulation">Criar Primeiro Orçamento</button>
            </div>
          ) : filtered.map(quote => (
            <div key={quote.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedId(expandedId === quote.id ? null : quote.id)}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <FileText className="w-5 h-5 text-primary-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{quote.quote_number}</p>
                    <p className="text-xs text-gray-500">{quote.customer_name || 'Sem cliente'}</p>
                  </div>
                  <span className={`inline-flex px-2.5 py-1 lg:py-0.5 rounded-full text-xs font-medium ${
                    statusLabels[quote.status]?.class === 'badge-warning' ? 'bg-yellow-100 text-yellow-800' :
                    statusLabels[quote.status]?.class === 'badge-success' ? 'bg-green-100 text-green-800' :
                    statusLabels[quote.status]?.class === 'badge-danger' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {statusLabels[quote.status]?.label || quote.status}
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(quote.total)}</p>
                  <p className="text-xs text-gray-500">{new Date(quote.created_at!).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
              {expandedId === quote.id && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-3">
                    <div><span className="text-gray-500">Subtotal:</span> <span className="font-medium">{formatCurrency(quote.subtotal)}</span></div>
                    <div><span className="text-gray-500">Desconto:</span> <span className="font-medium">{formatCurrency(quote.discount)}</span></div>
                    <div><span className="text-gray-500">Validade:</span> <span className="font-medium">{quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('pt-BR') : 'N/A'}</span></div>
                    <div><span className="text-gray-500">Vendedor:</span> <span className="font-medium">{quote.user_name}</span></div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => navigate(`/quotes/${quote.id}`)} className="btn-primary text-xs flex items-center gap-1 touch-manipulation">
                      <Eye className="w-3 h-3" /> Visualizar
                    </button>
                    {quote.status === 'pendente' && (
                      <button onClick={() => handleDelete(quote.id)} className="btn-danger text-xs flex items-center gap-1 touch-manipulation">
                        <Trash2 className="w-3 h-3" /> Excluir
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
