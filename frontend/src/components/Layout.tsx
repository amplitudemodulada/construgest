import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Package, Users, Building2, ShoppingCart,
  DollarSign, ShoppingBag, BarChart3, FileText, Database, LogOut, Menu, X,
  ChevronDown, Bell, HardHat
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/products', icon: Package, label: 'Produtos' },
  { to: '/customers', icon: Users, label: 'Clientes' },
  { to: '/suppliers', icon: Building2, label: 'Fornecedores' },
  { to: '/quotes', icon: FileText, label: 'Orçamentos' },
  { to: '/sales', icon: ShoppingCart, label: 'Vendas' },
  { to: '/financial', icon: DollarSign, label: 'Financeiro' },
  { to: '/purchases', icon: ShoppingBag, label: 'Compras' },
  { to: '/reports', icon: BarChart3, label: 'Relatórios' },
  { to: '/backup', icon: Database, label: 'Backup' },
];

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  vendedor: 'Vendedor',
  estoquista: 'Estoquista',
  financeiro: 'Financeiro',
  visualizador: 'Visualizador',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-gray-900 text-white transform transition-transform duration-200 lg:translate-x-0 lg:static lg:inset-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-700">
          <HardHat className="w-8 h-8 text-yellow-400" />
          <div>
            <h1 className="text-xl font-bold">Construtor 2026</h1>
            <p className="text-xs text-gray-400">Sistema de Gestão</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 lg:py-2.5 rounded-lg text-sm font-medium transition-colors touch-manipulation ${
                  isActive ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-sm font-bold">
              {user?.full_name?.charAt(0) || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.full_name}</p>
              <p className="text-xs text-gray-400">{user ? roleLabels[user.role] || user.role : ''}</p>
            </div>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3">
          <div className="flex items-center justify-between">
            <button className="lg:hidden p-2.5 rounded-lg hover:bg-gray-100 touch-manipulation" onClick={() => setSidebarOpen(true)}>
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-4 ml-auto">
              <button className="relative p-2.5 rounded-lg hover:bg-gray-100 touch-manipulation">
                <Bell className="w-5 h-5 text-gray-500" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 touch-manipulation"
                >
                  <div className="w-8 h-8 lg:w-7 lg:h-7 rounded-full bg-primary-600 flex items-center justify-center text-xs font-bold text-white">
                    {user?.full_name?.charAt(0) || '?'}
                  </div>
                  <span className="text-sm font-medium hidden sm:block">{user?.full_name}</span>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>
                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium">{user?.full_name}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                      </div>
                      <button
                        onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-4 py-3 lg:py-2 text-sm text-red-600 hover:bg-red-50 touch-manipulation"
                        >
                          <LogOut className="w-4 h-4" />
                        Sair
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
