import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Product, Customer } from '../types';
import { Plus, Trash2, Search, Minus, ShoppingCart, User, ArrowLeft, Check, X } from 'lucide-react';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

interface CartItem {
  product_id: number;
  product: Product;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export default function NewSale() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [installments, setInstallments] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('percentual');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [searchingProducts, setSearchingProducts] = useState(false);

  useEffect(() => {
    api.get('/products', { params: { is_active: true } }).then(res => setProducts(res.data)).catch(() => {});
    api.get('/customers/', { params: { is_active: true } }).then(res => setCustomers(res.data)).catch(() => {});
  }, []);

  const filteredProducts = products.filter(p =>
    !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.code.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.barcode && p.barcode.includes(productSearch))
  );

  const filteredCustomers = customers.filter(c =>
    !customerSearch || c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.document && c.document.includes(customerSearch))
  );

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1, total_price: (item.quantity + 1) * item.unit_price }
            : item
        );
      }
      return [...prev, {
        product_id: product.id,
        product,
        quantity: 1,
        unit_price: product.selling_price,
        total_price: product.selling_price,
      }];
    });
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(item => item.product_id !== productId));
      return;
    }
    setCart(prev => prev.map(item =>
      item.product_id === productId
        ? { ...item, quantity, total_price: quantity * item.unit_price }
        : item
    ));
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.product_id !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.total_price, 0);
  const discountValue = discountType === 'percentual' ? subtotal * (discount / 100) : discount;
  const total = subtotal - discountValue;

  const handleSubmit = async () => {
    if (cart.length === 0) return alert('Adicione pelo menos um produto');
    setSaving(true);
    try {
      const payload = {
        customer_id: selectedCustomer?.id || null,
        payment_method: paymentMethod,
        installments,
        discount,
        discount_type: discountType,
        notes,
        status: 'confirmado',
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
      };
      await api.post('/sales/', payload);
      navigate('/sales');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao finalizar venda');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/sales')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="page-title">Nova Venda</h1>
          <p className="text-gray-500 mt-1">Registre uma nova venda</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h3 className="card-header flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" /> Produtos
            </h3>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text" placeholder="Buscar produtos por nome, código ou código de barras..."
                className="input-field pl-10"
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
              {filteredProducts.length === 0 ? (
                <div className="p-4 text-center text-gray-400 text-sm">Nenhum produto encontrado</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-500">Código</th>
                      <th className="px-3 py-2 text-left text-gray-500">Produto</th>
                      <th className="px-3 py-2 text-right text-gray-500">Estoque</th>
                      <th className="px-3 py-2 text-right text-gray-500">Preço</th>
                      <th className="px-3 py-2 text-center text-gray-500"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredProducts.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-xs font-mono text-gray-500">{p.code}</td>
                        <td className="px-3 py-2 font-medium">{p.name}</td>
                        <td className="px-3 py-2 text-right text-gray-500">{p.current_stock}</td>
                        <td className="px-3 py-2 text-right font-medium">{formatCurrency(p.selling_price)}</td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => addToCart(p)}
                            disabled={p.current_stock <= 0}
                            className="p-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="card-header flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" /> Carrinho ({cart.length} itens)
            </h3>
            {cart.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Carrinho vazio. Selecione produtos acima.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-3 py-2 text-left text-gray-500">Produto</th>
                      <th className="px-3 py-2 text-right text-gray-500">Preço Un.</th>
                      <th className="px-3 py-2 text-right text-gray-500">Qtd</th>
                      <th className="px-3 py-2 text-right text-gray-500">Total</th>
                      <th className="px-3 py-2 text-center text-gray-500"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {cart.map(item => (
                      <tr key={item.product_id}>
                        <td className="px-3 py-2 font-medium">{item.product.name}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(item.unit_price)}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="inline-flex items-center gap-1 border rounded-lg">
                            <button onClick={() => updateQuantity(item.product_id, item.quantity - 1)} className="p-1 hover:bg-gray-100">
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.product_id, item.quantity + 1)} className="p-1 hover:bg-gray-100">
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.total_price)}</td>
                        <td className="px-3 py-2 text-center">
                          <button onClick={() => removeFromCart(item.product_id)} className="p-1 hover:bg-red-50 rounded text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h3 className="card-header flex items-center gap-2">
              <User className="w-5 h-5" /> Cliente
            </h3>
            {selectedCustomer ? (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">{selectedCustomer.name}</p>
                  <p className="text-xs text-gray-500">{selectedCustomer.document}</p>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="text-gray-400 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div>
                <div className="relative mb-2">
                  <input type="text" placeholder="Buscar cliente..." className="input-field text-sm"
                    value={customerSearch} onChange={e => { setCustomerSearch(e.target.value); setShowCustomerSearch(true); }}
                    onFocus={() => setShowCustomerSearch(true)}
                  />
                </div>
                {showCustomerSearch && filteredCustomers.length > 0 && (
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                    {filteredCustomers.map(c => (
                      <button
                        key={c.id}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
                        onClick={() => { setSelectedCustomer(c); setShowCustomerSearch(false); setCustomerSearch(''); }}
                      >
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-gray-500">{c.document}</p>
                      </button>
                    ))}
                  </div>
                )}
                {showCustomerSearch && filteredCustomers.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-2">Nenhum cliente encontrado</p>
                )}
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="card-header">Pagamento</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Forma de Pagamento</label>
                <select className="select-field" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                  <option value="pix">PIX</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="cartao_credito">Cartão de Crédito</option>
                  <option value="cartao_debito">Cartão de Débito</option>
                  <option value="boleto">Boleto</option>
                  <option value="transferencia">Transferência</option>
                </select>
              </div>
              {paymentMethod === 'cartao_credito' && (
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Parcelas</label>
                  <select className="select-field" value={installments} onChange={e => setInstallments(Number(e.target.value))}>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={n}>{n}x</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-600 mb-1">Desconto</label>
                <div className="flex gap-2">
                  <input type="number" min="0" className="input-field flex-1" value={discount}
                    onChange={e => setDiscount(Number(e.target.value))} />
                  <select className="select-field w-28" value={discountType} onChange={e => setDiscountType(e.target.value)}>
                    <option value="percentual">%</option>
                    <option value="valor">R$</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Observações</label>
                <textarea className="input-field text-sm" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="card-header">Resumo</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Desconto</span>
                <span className="text-red-500">-{formatCurrency(discountValue)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={saving || cart.length === 0}
              className="btn-primary w-full mt-4 py-3 flex items-center justify-center gap-2"
            >
              {saving ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> Finalizando...</>
              ) : (
                <><Check className="w-5 h-5" /> Finalizar Venda</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
