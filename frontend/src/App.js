import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Animais from './pages/Animais';
import Movimentacoes from './pages/Movimentacoes';
import Eventos from './pages/Eventos';
import Despesas from './pages/Despesas';
import Relatorios from './pages/Relatorios';
import Login from './pages/Login';
import Usuarios from './pages/Usuarios';
import Lembretes from './pages/Lembretes';
import { Toaster } from './components/ui/sonner';
import './App.css';

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
    return <div className="min-h-screen bg-[#F4F3F0] flex items-center justify-center">Carregando...</div>;
  }

  if (!user) {
    return (
      <>
        <Login onLogin={handleLogin} />
        <Toaster position="bottom-right" />
      </>
    );
  }

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout user={user} onLogout={handleLogout} />}>
            <Route index element={<Dashboard />} />
            <Route path="animais" element={<Animais />} />
            <Route path="movimentacoes" element={<Movimentacoes />} />
            <Route path="eventos" element={<Eventos />} />
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
    </>
  );
}

export default App;
