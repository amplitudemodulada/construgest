import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Customer } from '../types';
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react';

const states = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

interface CustomerModalProps {
  customer?: Customer | null;
  onClose: () => void;
  onSave: () => void;
}

function CustomerModal({ customer, onClose, onSave }: CustomerModalProps) {
  const [form, setForm] = useState({
    customer_type: customer?.customer_type || 'pf',
    name: customer?.name || '',
    company_name: customer?.company_name || '',
    document: customer?.document || '',
    ie_rg: customer?.ie_rg || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    cellphone: customer?.cellphone || '',
    zip_code: customer?.zip_code || '',
    address: customer?.address || '',
    number: customer?.number || '',
    complement: customer?.complement || '',
    neighborhood: customer?.neighborhood || '',
    city: customer?.city || '',
    state: customer?.state || 'SP',
    notes: customer?.notes || '',
    credit_limit: customer?.credit_limit || 0,
    birth_date: customer?.birth_date || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (customer) {
        await api.put(`/customers/${customer.id}`, form);
      } else {
        await api.post('/customers', form);
      }
      onSave();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao salvar cliente');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">{customer ? 'Editar Cliente' : 'Novo Cliente'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg touch-manipulation"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm">{error}</div>}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="type" value="pf" checked={form.customer_type === 'pf'} onChange={() => setForm({...form, customer_type: 'pf', document: ''})} />
              <span className="text-sm">Pessoa Física</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="type" value="pj" checked={form.customer_type === 'pj'} onChange={() => setForm({...form, customer_type: 'pj', document: ''})} />
              <span className="text-sm">Pessoa Jurídica</span>
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <input type="text" className="input-field" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            </div>
            {form.customer_type === 'pj' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Razão Social</label>
                <input type="text" className="input-field" value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})} />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{form.customer_type === 'pf' ? 'CPF' : 'CNPJ'}</label>
              <input type="text" className="input-field" value={form.document} onChange={e => setForm({...form, document: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{form.customer_type === 'pf' ? 'RG' : 'Insc. Estadual'}</label>
              <input type="text" className="input-field" value={form.ie_rg} onChange={e => setForm({...form, ie_rg: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" className="input-field" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input type="text" className="input-field" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Celular</label>
              <input type="text" className="input-field" value={form.cellphone} onChange={e => setForm({...form, cellphone: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Limite de Crédito</label>
              <input type="number" className="input-field" value={form.credit_limit} onChange={e => setForm({...form, credit_limit: Number(e.target.value)})} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
              <input type="text" className="input-field" value={form.zip_code} onChange={e => setForm({...form, zip_code: e.target.value})} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
              <input type="text" className="input-field" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
              <input type="text" className="input-field" value={form.number} onChange={e => setForm({...form, number: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
              <input type="text" className="input-field" value={form.complement} onChange={e => setForm({...form, complement: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
              <input type="text" className="input-field" value={form.neighborhood} onChange={e => setForm({...form, neighborhood: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
              <input type="text" className="input-field" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select className="select-field" value={form.state} onChange={e => setForm({...form, state: e.target.value})}>
                {states.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea className="input-field" rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose} className="btn-secondary touch-manipulation">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary touch-manipulation">
              {saving ? 'Salvando...' : customer ? 'Atualizar' : 'Criar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (typeFilter) params.customer_type = typeFilter;
      const res = await api.get('/customers/', { params });
      setCustomers(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search, typeFilter]);

  const handleDelete = async (c: Customer) => {
    if (!confirm(`Desativar cliente "${c.name}"?`)) return;
    try { await api.delete(`/customers/${c.id}`); load(); }
    catch { alert('Erro ao desativar cliente'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="text-gray-500 mt-1">Gerencie sua base de clientes</p>
        </div>
        <button onClick={() => { setEditing(null); setModalOpen(true); }} className="btn-primary flex items-center gap-2 touch-manipulation">
          <Plus className="w-4 h-4" /> Novo Cliente
        </button>
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Buscar por nome, documento, email ou cidade..." className="input-field pl-10" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="select-field sm:w-44" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">Todos</option>
            <option value="pf">Pessoa Física</option>
            <option value="pj">Pessoa Jurídica</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="table-header">Nome</th>
                <th className="table-header">Tipo</th>
                <th className="table-header">Documento</th>
                <th className="table-header">Email</th>
                <th className="table-header">Telefone</th>
                <th className="table-header">Cidade</th>
                <th className="table-header">Status</th>
                <th className="table-header">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">Carregando...</td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">Nenhum cliente encontrado</td></tr>
              ) : customers.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium">{c.name}</td>
                  <td className="table-cell">
                    <span className={c.customer_type === 'pj' ? 'badge-info' : 'badge-success'}>
                      {c.customer_type === 'pj' ? 'PJ' : 'PF'}
                    </span>
                  </td>
                  <td className="table-cell text-gray-500">{c.document || '-'}</td>
                  <td className="table-cell text-gray-500">{c.email || '-'}</td>
                  <td className="table-cell text-gray-500">{c.phone || c.cellphone || '-'}</td>
                  <td className="table-cell text-gray-500">{c.city || '-'}</td>
                  <td className="table-cell">
                    <span className={c.is_active ? 'badge-success' : 'badge-danger'}>{c.is_active ? 'Ativo' : 'Inativo'}</span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditing(c); setModalOpen(true); }} className="p-1 hover:bg-gray-100 rounded touch-manipulation"><Edit2 className="w-4 h-4 text-gray-500" /></button>
                      <button onClick={() => handleDelete(c)} className="p-1 hover:bg-red-50 rounded touch-manipulation"><Trash2 className="w-4 h-4 text-red-500" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <CustomerModal
          customer={editing}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSave={() => { setModalOpen(false); setEditing(null); load(); }}
        />
      )}
    </div>
  );
}
