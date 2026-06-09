import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { PurchaseOrder, Product, Supplier } from '../types';
import { Plus, Search, X, Check, Truck, XCircle, Eye } from 'lucide-react';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const statusLabels: Record<string, { label: string; class: string }> = {
  rascunho: { label: 'Rascunho', class: 'badge-info' },
  enviado: { label: 'Enviado', class: 'badge-warning' },
  confirmado: { label: 'Confirmado', class: 'badge-success' },
  parcial: { label: 'Parcial', class: 'badge-warning' },
  recebido: { label: 'Recebido', class: 'badge-success' },
  cancelado: { label: 'Cancelado', class: 'badge-danger' },
};

export default function Purchases() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/purchases/', { params });
      setOrders(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const handleReceive = async (id: number) => {
    if (!confirm('Confirmar recebimento deste pedido?')) return;
    try { await api.put(`/purchases/${id}/receive`); load(); }
    catch { alert('Erro ao receber pedido'); }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('Cancelar este pedido?')) return;
    try { await api.put(`/purchases/${id}/cancel`); load(); }
    catch { alert('Erro ao cancelar pedido'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Pedidos de Compra</h1>
          <p className="text-gray-500 mt-1">Gerencie pedidos a fornecedores</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2 touch-manipulation">
          <Plus className="w-4 h-4" /> Novo Pedido
        </button>
      </div>

      <div className="card">
        <div className="mb-4">
          <select className="select-field sm:w-44" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="rascunho">Rascunho</option>
            <option value="enviado">Enviado</option>
            <option value="confirmado">Confirmado</option>
            <option value="parcial">Parcial</option>
            <option value="recebido">Recebido</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>

        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-8 text-gray-400">Carregando...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>Nenhum pedido encontrado</p>
              <button onClick={() => setShowNew(true)} className="btn-primary mt-4 touch-manipulation">Criar Primeiro Pedido</button>
            </div>
          ) : orders.map(order => (
            <div key={order.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{order.order_number || 'Sem número'}</p>
                    <p className="text-xs text-gray-500">{order.supplier?.company_name || 'Fornecedor'}</p>
                  </div>
                  <span className={statusLabels[order.status]?.class || 'badge-info'}>
                    {statusLabels[order.status]?.label || order.status}
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(order.total)}</p>
                  <p className="text-xs text-gray-500">{order.items?.length || 0} itens</p>
                </div>
              </div>
              {expandedId === order.id && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm mb-3">
                    <div><span className="text-gray-500">Subtotal:</span> <span className="font-medium">{formatCurrency(order.subtotal)}</span></div>
                    <div><span className="text-gray-500">Frete:</span> <span className="font-medium">{formatCurrency(order.shipping_cost)}</span></div>
                    <div><span className="text-gray-500">Previsão:</span> <span className="font-medium">{order.expected_date ? new Date(order.expected_date + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</span></div>
                  </div>
                  <div className="overflow-x-auto mb-3">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="px-2 py-1 text-left text-gray-500">Produto</th>
                          <th className="px-2 py-1 text-right text-gray-500">Qtd</th>
                          <th className="px-2 py-1 text-right text-gray-500">Recebido</th>
                          <th className="px-2 py-1 text-right text-gray-500">Preço</th>
                          <th className="px-2 py-1 text-right text-gray-500">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items?.map((item, i) => (
                          <tr key={i}>
                            <td className="px-2 py-1">{item.product?.name || `Produto #${item.product_id}`}</td>
                            <td className="px-2 py-1 text-right">{item.quantity}</td>
                            <td className="px-2 py-1 text-right">{item.received_quantity}</td>
                            <td className="px-2 py-1 text-right">{formatCurrency(item.unit_price)}</td>
                            <td className="px-2 py-1 text-right font-medium">{formatCurrency(item.total_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-2">
                    {order.status !== 'recebido' && order.status !== 'cancelado' && (
                      <button onClick={() => handleReceive(order.id)} className="btn-primary text-xs flex items-center gap-1 touch-manipulation">
                        <Truck className="w-3 h-3" /> Receber Pedido
                      </button>
                    )}
                    {order.status !== 'recebido' && order.status !== 'cancelado' && (
                      <button onClick={() => handleCancel(order.id)} className="btn-danger text-xs flex items-center gap-1 touch-manipulation">
                        <XCircle className="w-3 h-3" /> Cancelar
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {showNew && (
        <NewPurchaseModal
          onClose={() => setShowNew(false)}
          onSaved={() => { setShowNew(false); load(); }}
        />
      )}
    </div>
  );
}

function NewPurchaseModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [supplierId, setSupplierId] = useState(0);
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<{ product_id: number; product_name: string; quantity: number; unit_price: number }[]>([]);
  const [selectedProduct, setSelectedProduct] = useState(0);
  const [selectedQty, setSelectedQty] = useState(1);
  const [selectedPrice, setSelectedPrice] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/suppliers/', { params: { is_active: true } }).then(res => setSuppliers(res.data)).catch(() => {});
    api.get('/products', { params: { is_active: true } }).then(res => setProducts(res.data)).catch(() => {});
  }, []);

  const addItem = () => {
    if (!selectedProduct) return;
    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;
    setItems(prev => [...prev, { product_id: product.id, product_name: product.name, quantity: selectedQty, unit_price: selectedPrice || product.cost_price }]);
    setSelectedProduct(0);
    setSelectedQty(1);
    setSelectedPrice(0);
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const handleSubmit = async () => {
    if (!supplierId) return setError('Selecione um fornecedor');
    if (items.length === 0) return setError('Adicione pelo menos um item');
    setSaving(true);
    setError('');
    try {
      await api.post('/purchases/', {
        supplier_id: supplierId,
        expected_date: expectedDate || undefined,
        notes,
        items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity, unit_price: i.unit_price }))
      });
      onSaved();
    } catch (err: any) { setError(err.response?.data?.detail || 'Erro ao criar pedido'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Novo Pedido de Compra</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg touch-manipulation"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor *</label>
              <select className="select-field" value={supplierId} onChange={e => setSupplierId(Number(e.target.value))}>
                <option value="">Selecione...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.company_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Previsão de Entrega</label>
              <input type="date" className="input-field" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium mb-2">Adicionar Produtos</h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <select className="select-field sm:col-span-2" value={selectedProduct} onChange={e => {
                const id = Number(e.target.value);
                setSelectedProduct(id);
                const p = products.find(pr => pr.id === id);
                if (p) setSelectedPrice(p.cost_price);
              }}>
                <option value="">Selecione...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="number" placeholder="Qtd" className="input-field" value={selectedQty} onChange={e => setSelectedQty(Number(e.target.value))} min="1" />
              <div className="flex gap-2">
                <input type="number" step="0.01" placeholder="Preço" className="input-field" value={selectedPrice} onChange={e => setSelectedPrice(Number(e.target.value))} />
                <button onClick={addItem} className="btn-primary px-3 touch-manipulation"><Plus className="w-4 h-4" /></button>
              </div>
            </div>
          </div>

          {items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-2 py-1 text-left text-gray-500">Produto</th>
                    <th className="px-2 py-1 text-right text-gray-500">Qtd</th>
                    <th className="px-2 py-1 text-right text-gray-500">Preço</th>
                    <th className="px-2 py-1 text-right text-gray-500">Total</th>
                    <th className="px-2 py-1 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, i) => (
                    <tr key={i}>
                      <td className="px-2 py-2">{item.product_name}</td>
                      <td className="px-2 py-2 text-right">{item.quantity}</td>
                      <td className="px-2 py-2 text-right">{formatCurrency(item.unit_price)}</td>
                      <td className="px-2 py-2 text-right font-medium">{formatCurrency(item.quantity * item.unit_price)}</td>
                      <td className="px-2 py-2 text-center">
                        <button onClick={() => removeItem(i)} className="text-red-500 hover:text-red-700 touch-manipulation"><X className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 font-medium">
                    <td colSpan={3} className="px-2 py-2 text-right">Subtotal:</td>
                    <td className="px-2 py-2 text-right">{formatCurrency(subtotal)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea className="input-field" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button onClick={onClose} className="btn-secondary touch-manipulation">Cancelar</button>
            <button onClick={handleSubmit} disabled={saving} className="btn-primary touch-manipulation">
              {saving ? 'Criando...' : 'Criar Pedido'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
