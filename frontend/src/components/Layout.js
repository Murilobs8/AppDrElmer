import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { ChartLine, Cow, ArrowsLeftRight, Calendar, CurrencyDollar, FileText, List, X, UsersThree, SignOut, Bell } from '@phosphor-icons/react';

const baseNavigation = [
  { name: 'Dashboard', path: '/', icon: ChartLine },
  { name: 'Animais', path: '/animais', icon: Cow },
  { name: 'Movimentacoes', path: '/movimentacoes', icon: ArrowsLeftRight },
  { name: 'Eventos', path: '/eventos', icon: Calendar },
  { name: 'Despesas', path: '/despesas', icon: CurrencyDollar },
  { name: 'Lembretes', path: '/lembretes', icon: Bell },
  { name: 'Relatorios', path: '/relatorios', icon: FileText },
];

export default function Layout({ user, onLogout }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = user?.role === 'admin'
    ? [...baseNavigation, { name: 'Usuarios', path: '/usuarios', icon: UsersThree }]
    : baseNavigation;

  return (
    <div className="min-h-screen flex" data-testid="main-layout">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          data-testid="sidebar-backdrop"
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-[#1B2620] transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        data-testid="sidebar"
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-[#2A3730]">
            <h1 className="text-xl font-semibold text-[#E5E3DB]" data-testid="app-title">Gestao Rural</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-[#E5E3DB] hover:text-white"
              data-testid="close-sidebar-btn"
            >
              <X size={24} />
            </button>
          </div>

          {/* User info */}
          <div className="px-4 py-3 border-b border-[#2A3730]">
            <p className="text-sm text-[#E5E3DB] font-medium truncate">{user?.nome}</p>
            <p className="text-xs text-[#7A8780] truncate">{user?.email}</p>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`sidebar-link flex items-center gap-3 px-4 py-3 rounded-lg text-[#E5E3DB] ${
                    isActive ? 'bg-[#4A6741] text-white' : 'hover:bg-[#2A3730]'
                  }`}
                  data-testid={`nav-link-${item.name.toLowerCase()}`}
                >
                  <Icon size={20} weight={isActive ? 'fill' : 'regular'} />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-[#2A3730]">
            <button
              onClick={onLogout}
              className="sidebar-link flex items-center gap-3 px-4 py-3 rounded-lg text-[#E5E3DB] hover:bg-[#C25934]/20 w-full"
              data-testid="logout-btn"
            >
              <SignOut size={20} />
              <span className="font-medium">Sair</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="lg:hidden bg-white border-b border-[#E5E3DB] px-4 py-3 flex items-center">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-[#1B2620] mr-3"
            data-testid="open-sidebar-btn"
          >
            <List size={24} />
          </button>
          <h1 className="text-lg font-semibold text-[#1B2620]">Gestao Rural</h1>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8" data-testid="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
