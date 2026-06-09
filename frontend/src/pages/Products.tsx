import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Product, Category } from '../types';
import { Plus, Search, Edit2, Trash2, Package, AlertTriangle, X } from 'lucide-react';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

interface ProductModalProps {
  product?: Product | null;
  categories: Category[];
  onClose: () => void;
  onSave: () => void;
}

function ProductModal({ product, categories, onClose, onSave }: ProductModalProps) {
  const [form, setForm] = useState({
    code: product?.code || '',
    name: product?.name || '',
    category_id: product?.category_id || categories[0]?.id || 0,
    unit: product?.unit || 'UN',
    cost_price: product?.cost_price || 0,
    selling_price: product?.selling_price || 0,
    min_stock: product?.min_stock || 0,
    current_stock: product?.current_stock || 0,
    max_stock: product?.max_stock || 0,
    location: product?.location || '',
    barcode: product?.barcode || '',
    ncm_code: product?.ncm_code || '',
    description: product?.description || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (product) {
        await api.put(`/products/${product.id}`, form);
      } else {
        await api.post('/products', form);
      }
      onSave();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao salvar produto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">{product ? 'Editar Produto' : 'Novo Produto'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código *</label>
              <input type="text" className="input-field" value={form.code} onChange={e => setForm({...form, code: e.target.value})} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código de Barras</label>
              <input type="text" className="input-field" value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <input type="text" className="input-field" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
              <select className="select-field" value={form.category_id} onChange={e => setForm({...form, category_id: Number(e.target.value)})}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
              <select className="select-field" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}>
                <option value="UN">Unidade</option>
                <option value="SC">Saco</option>
                <option value="KG">Quilograma</option>
                <option value="M2">Metro Quadrado</option>
                <option value="M3">Metro Cúbico</option>
                <option value="RL">Rolo</option>
                <option value="LT">Litro</option>
                <option value="PC">Peça</option>
                <option value="CX">Caixa</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço de Custo</label>
              <input type="number" step="0.01" min="0" className="input-field" value={form.cost_price} onChange={e => setForm({...form, cost_price: Number(e.target.value)})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço de Venda *</label>
              <input type="number" step="0.01" min="0" className="input-field" value={form.selling_price} onChange={e => setForm({...form, selling_price: Number(e.target.value)})} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estoque Mínimo</label>
              <input type="number" step="0.001" min="0" className="input-field" value={form.min_stock} onChange={e => setForm({...form, min_stock: Number(e.target.value)})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estoque Atual</label>
              <input type="number" step="0.001" min="0" className="input-field" value={form.current_stock} onChange={e => setForm({...form, current_stock: Number(e.target.value)})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estoque Máximo</label>
              <input type="number" step="0.001" min="0" className="input-field" value={form.max_stock} onChange={e => setForm({...form, max_stock: Number(e.target.value)})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Localização</label>
              <input type="text" className="input-field" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NCM</label>
              <input type="text" className="input-field" value={form.ncm_code} onChange={e => setForm({...form, ncm_code: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea className="input-field" rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Salvando...' : product ? 'Atualizar' : 'Criar Produto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (categoryFilter) params.category_id = categoryFilter;
      if (lowStockOnly) params.low_stock = true;
      const res = await api.get('/products', { params });
      setProducts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get('/categories').then(res => setCategories(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    loadProducts();
  }, [search, categoryFilter, lowStockOnly]);

  const handleDelete = async (product: Product) => {
    if (!confirm(`Desativar produto "${product.name}"?`)) return;
    try {
      await api.delete(`/products/${product.id}`);
      loadProducts();
    } catch (err) {
      alert('Erro ao desativar produto');
    }
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setModalOpen(true);
  };

  const openNew = () => {
    setEditingProduct(null);
    setModalOpen(true);
  };

  const handleSave = () => {
    setModalOpen(false);
    setEditingProduct(null);
    loadProducts();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Produtos</h1>
          <p className="text-gray-500 mt-1">Gerencie seu catálogo de produtos</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo Produto
        </button>
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, código ou código de barras..."
              className="input-field pl-10"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="select-field sm:w-48" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            <option value="">Todas as categorias</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={lowStockOnly} onChange={e => setLowStockOnly(e.target.checked)} className="rounded" />
            <AlertTriangle className="w-4 h-4 text-yellow-500" /> Estoque baixo
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="table-header">Código</th>
                <th className="table-header">Produto</th>
                <th className="table-header">Categoria</th>
                <th className="table-header">Estoque</th>
                <th className="table-header">Custo</th>
                <th className="table-header">Venda</th>
                <th className="table-header">Margem</th>
                <th className="table-header">Status</th>
                <th className="table-header">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-400">Carregando...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-400">Nenhum produto encontrado</td></tr>
              ) : products.map(p => {
                const margin = p.cost_price > 0 ? ((p.selling_price - p.cost_price) / p.cost_price * 100) : 0;
                const isLowStock = p.current_stock <= p.min_stock;
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="table-cell font-mono text-xs">{p.code}</td>
                    <td className="table-cell font-medium">{p.name}</td>
                    <td className="table-cell text-gray-500">{p.category?.name || '-'}</td>
                    <td className="table-cell">
                      <span className={`font-medium ${isLowStock ? 'text-red-600' : 'text-green-600'}`}>
                        {p.current_stock} {p.unit}
                      </span>
                      {isLowStock && <AlertTriangle className="w-3 h-3 inline ml-1 text-red-500" />}
                    </td>
                    <td className="table-cell">{formatCurrency(p.cost_price)}</td>
                    <td className="table-cell font-medium">{formatCurrency(p.selling_price)}</td>
                    <td className="table-cell">
                      <span className={margin >= 30 ? 'text-green-600' : margin >= 15 ? 'text-yellow-600' : 'text-red-600'}>
                        {margin.toFixed(1)}%
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className={p.is_active ? 'badge-success' : 'badge-danger'}>
                        {p.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(p)} className="p-1 hover:bg-gray-100 rounded"><Edit2 className="w-4 h-4 text-gray-500" /></button>
                        <button onClick={() => handleDelete(p)} className="p-1 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4 text-red-500" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <ProductModal
          product={editingProduct}
          categories={categories}
          onClose={() => { setModalOpen(false); setEditingProduct(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
