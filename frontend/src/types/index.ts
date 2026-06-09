export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: 'admin' | 'vendedor' | 'estoquista' | 'financeiro' | 'visualizador';
  is_active: boolean;
  phone?: string;
  created_at?: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  is_active: boolean;
}

export interface Product {
  id: number;
  code: string;
  barcode?: string;
  name: string;
  description?: string;
  category_id: number;
  unit: string;
  cost_price: number;
  selling_price: number;
  min_stock: number;
  current_stock: number;
  max_stock: number;
  location?: string;
  ncm_code?: string;
  is_active: boolean;
  category?: Category;
  created_at?: string;
}

export interface Customer {
  id: number;
  customer_type: 'pf' | 'pj';
  name: string;
  company_name?: string;
  document?: string;
  ie_rg?: string;
  email?: string;
  phone?: string;
  cellphone?: string;
  zip_code?: string;
  address?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  notes?: string;
  is_active: boolean;
  credit_limit?: number;
  birth_date?: string;
  created_at?: string;
}

export interface Supplier {
  id: number;
  company_name: string;
  trade_name?: string;
  cnpj?: string;
  ie?: string;
  email?: string;
  phone?: string;
  cellphone?: string;
  zip_code?: string;
  address?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  website?: string;
  contact_name?: string;
  notes?: string;
  payment_terms?: string;
  delivery_days?: number;
  is_active: boolean;
  created_at?: string;
}

export interface SaleItem {
  id?: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  product?: { id: number; name: string; code: string };
}

export interface Sale {
  id: number;
  invoice_number?: string;
  customer_id?: number;
  user_id: number;
  status: string;
  subtotal: number;
  discount: number;
  discount_type: string;
  total: number;
  payment_method: string;
  installments: number;
  notes?: string;
  nfe_key?: string;
  nfe_status?: string;
  customer?: { id: number; name: string };
  user?: { id: number; full_name: string };
  items: SaleItem[];
  created_at?: string;
}

export interface AccountReceivable {
  id: number;
  sale_id?: number;
  customer_id?: number;
  description: string;
  original_amount: number;
  amount: number;
  paid_amount: number;
  due_date: string;
  paid_at?: string;
  status: string;
  payment_method?: string;
  notes?: string;
  customer?: { id: number; name: string };
}

export interface AccountPayable {
  id: number;
  supplier_id?: number;
  purchase_order_id?: number;
  description: string;
  original_amount: number;
  amount: number;
  paid_amount: number;
  due_date: string;
  paid_at?: string;
  status: string;
  payment_method?: string;
  notes?: string;
  supplier?: { id: number; company_name: string };
}

export interface PurchaseOrder {
  id: number;
  order_number?: string;
  supplier_id: number;
  user_id: number;
  status: string;
  subtotal: number;
  discount: number;
  shipping_cost: number;
  total: number;
  expected_date?: string;
  received_date?: string;
  notes?: string;
  supplier?: { id: number; company_name: string };
  user?: { id: number; full_name: string };
  items: PurchaseOrderItem[];
  created_at?: string;
}

export interface PurchaseOrderItem {
  id?: number;
  product_id: number;
  quantity: number;
  received_quantity: number;
  unit_price: number;
  total_price: number;
  product?: { id: number; name: string; code: string };
}

export interface DashboardData {
  total_sales_today: number;
  total_sales_month: number;
  total_sales_year: number;
  total_customers: number;
  total_products: number;
  low_stock_count: number;
  pending_receivable: number;
  overdue_receivable: number;
  pending_payable: number;
  sales_by_period: { date: string; total: number }[];
  sales_by_category: { category: string; total: number }[];
  top_products: { name: string; quantity: number; total: number }[];
  recent_sales: {
    id: number;
    invoice_number: string;
    customer_name: string;
    user_name: string;
    total: number;
    payment_method: string;
    created_at: string;
  }[];
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}
