import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Animais from './pages/Animais';
import Movimentacoes from './pages/Movimentacoes';
import Eventos from './pages/Eventos';
import Producao from './pages/Producao';
import Despesas from './pages/Despesas';
import Relatorios from './pages/Relatorios';
import Login from './pages/Login';
import Usuarios from './pages/Usuarios';
import Lembretes from './pages/Lembretes';
import { Toaster } from './components/ui/sonner';
import { ConfigProvider } from './contexts/ConfigContext';
import './App.css';

// Register Service Worker for push notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
    setChecking(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
  };

  if (checking) {
    return <div className="min-h-screen bg-[#F4F3F0] dark:bg-[#0F1612] flex items-center justify-center dark:text-[#E5E3DB]">Carregando...</div>;
  }

  if (!user) {
    return (
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <Login onLogin={handleLogin} />
        <Toaster position="bottom-right" />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <ConfigProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout user={user} onLogout={handleLogout} />}>
              <Route index element={<Dashboard />} />
              <Route path="animais" element={<Animais />} />
              <Route path="movimentacoes" element={<Movimentacoes />} />
              <Route path="eventos" element={<Eventos />} />
              <Route path="producao" element={<Producao />} />
              <Route path="despesas" element={<Despesas />} />
              <Route path="relatorios" element={<Relatorios />} />
              <Route path="lembretes" element={<Lembretes />} />
              {user.role === 'admin' && (
                <Route path="usuarios" element={<Usuarios />} />
              )}
            </Route>
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="bottom-right" />
      </ConfigProvider>
    </ThemeProvider>
  );
}

export default App;
