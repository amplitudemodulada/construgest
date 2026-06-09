import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Supplier } from '../types';
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react';

const states = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

interface SupplierModalProps {
  supplier?: Supplier | null;
  onClose: () => void;
  onSave: () => void;
}

function SupplierModal({ supplier, onClose, onSave }: SupplierModalProps) {
  const [form, setForm] = useState({
    company_name: supplier?.company_name || '',
    trade_name: supplier?.trade_name || '',
    cnpj: supplier?.cnpj || '',
    ie: supplier?.ie || '',
    email: supplier?.email || '',
    phone: supplier?.phone || '',
    cellphone: supplier?.cellphone || '',
    zip_code: supplier?.zip_code || '',
    address: supplier?.address || '',
    number: supplier?.number || '',
    complement: supplier?.complement || '',
    neighborhood: supplier?.neighborhood || '',
    city: supplier?.city || '',
    state: supplier?.state || 'SP',
    website: supplier?.website || '',
    contact_name: supplier?.contact_name || '',
    notes: supplier?.notes || '',
    payment_terms: supplier?.payment_terms || '',
    delivery_days: supplier?.delivery_days || 30,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (supplier) {
        await api.put(`/suppliers/${supplier.id}`, form);
      } else {
        await api.post('/suppliers', form);
      }
      onSave();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao salvar fornecedor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">{supplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Razão Social *</label>
              <input type="text" className="input-field" value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})} required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Fantasia</label>
              <input type="text" className="input-field" value={form.trade_name} onChange={e => setForm({...form, trade_name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
              <input type="text" className="input-field" value={form.cnpj} onChange={e => setForm({...form, cnpj: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Insc. Estadual</label>
              <input type="text" className="input-field" value={form.ie} onChange={e => setForm({...form, ie: e.target.value})} />
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Contato</label>
              <input type="text" className="input-field" value={form.contact_name} onChange={e => setForm({...form, contact_name: e.target.value})} />
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
              <input type="text" className="input-field" value={form.website} onChange={e => setForm({...form, website: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Condições de Pagamento</label>
              <input type="text" className="input-field" value={form.payment_terms} onChange={e => setForm({...form, payment_terms: e.target.value})} placeholder="Ex: 30 dias" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prazo de Entrega (dias)</label>
              <input type="number" min="1" className="input-field" value={form.delivery_days} onChange={e => setForm({...form, delivery_days: Number(e.target.value)})} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea className="input-field" rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Salvando...' : supplier ? 'Atualizar' : 'Criar Fornecedor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      const res = await api.get('/suppliers/', { params });
      setSuppliers(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search]);

  const handleDelete = async (s: Supplier) => {
    if (!confirm(`Desativar fornecedor "${s.company_name}"?`)) return;
    try { await api.delete(`/suppliers/${s.id}`); load(); }
    catch { alert('Erro ao desativar fornecedor'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Fornecedores</h1>
          <p className="text-gray-500 mt-1">Gerencie seus fornecedores</p>
        </div>
        <button onClick={() => { setEditing(null); setModalOpen(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo Fornecedor
        </button>
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Buscar por nome, CNPJ ou cidade..." className="input-field pl-10" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="table-header">Fornecedor</th>
                <th className="table-header">CNPJ</th>
                <th className="table-header">Contato</th>
                <th className="table-header">Email</th>
                <th className="table-header">Telefone</th>
                <th className="table-header">Cidade</th>
                <th className="table-header">Prazo Entrega</th>
                <th className="table-header">Status</th>
                <th className="table-header">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-400">Carregando...</td></tr>
              ) : suppliers.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-400">Nenhum fornecedor encontrado</td></tr>
              ) : suppliers.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium">{s.company_name}</td>
                  <td className="table-cell text-gray-500">{s.cnpj || '-'}</td>
                  <td className="table-cell text-gray-500">{s.contact_name || '-'}</td>
                  <td className="table-cell text-gray-500">{s.email || '-'}</td>
                  <td className="table-cell text-gray-500">{s.phone || '-'}</td>
                  <td className="table-cell text-gray-500">{s.city || '-'}</td>
                  <td className="table-cell">{s.delivery_days ? `${s.delivery_days} dias` : '-'}</td>
                  <td className="table-cell">
                    <span className={s.is_active ? 'badge-success' : 'badge-danger'}>{s.is_active ? 'Ativo' : 'Inativo'}</span>
                  </td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button onClick={() => { setEditing(s); setModalOpen(true); }} className="p-1 hover:bg-gray-100 rounded"><Edit2 className="w-4 h-4 text-gray-500" /></button>
                      <button onClick={() => handleDelete(s)} className="p-1 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4 text-red-500" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <SupplierModal
          supplier={editing}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSave={() => { setModalOpen(false); setEditing(null); load(); }}
        />
      )}
    </div>
  );
}
