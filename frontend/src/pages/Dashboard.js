import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { Cow, TrendUp, CurrencyDollar, Warning } from '@phosphor-icons/react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

const COLORS = ['#4A6741', '#C25934', '#D99B29', '#2B6CB0', '#3B823E'];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarStats();
  }, []);

  const carregarStats = async () => {
    try {
      const response = await api.get('/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="dashboard-loading">
        <div className="text-[#7A8780]">Carregando...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="dashboard-error">
        <div className="text-[#C25934]">Erro ao carregar dados</div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total de Animais',
      value: stats.total_animais,
      icon: Cow,
      color: '#4A6741',
      testId: 'total-animals'
    },
    {
      title: 'Animais Ativos',
      value: stats.total_ativos,
      icon: Cow,
      color: '#3B823E',
      testId: 'active-animals'
    },
    {
      title: 'Receitas',
      value: `R$ ${stats.receitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: TrendUp,
      color: '#3B823E',
      testId: 'total-revenue'
    },
    {
      title: 'Despesas',
      value: `R$ ${stats.despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: CurrencyDollar,
      color: '#C25934',
      testId: 'total-expenses'
    },
    {
      title: 'Lucro',
      value: `R$ ${stats.lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: stats.lucro >= 0 ? TrendUp : Warning,
      color: stats.lucro >= 0 ? '#3B823E' : '#C25934',
      testId: 'total-profit'
    },
  ];

  return (
    <div className="fade-in" data-testid="dashboard-page">
      <div className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-[#1B2620]" data-testid="dashboard-title">
          Dashboard
        </h1>
        <p className="text-lg text-[#7A8780] mt-2">Visão geral da sua fazenda</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.testId}
              className="stat-card bg-white rounded-lg p-6 border border-[#E5E3DB]"
              data-testid={stat.testId}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#7A8780] uppercase tracking-wider font-semibold">
                    {stat.title}
                  </p>
                  <p className="text-2xl sm:text-3xl font-semibold text-[#1B2620] mt-2">
                    {stat.value}
                  </p>
                </div>
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${stat.color}20` }}
                >
                  <Icon size={24} weight="bold" style={{ color: stat.color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Receitas vs Despesas */}
        {stats.movimentacoes_mes && stats.movimentacoes_mes.length > 0 && (
          <div className="bg-white rounded-lg p-6 border border-[#E5E3DB]" data-testid="revenue-expenses-chart">
            <h3 className="text-xl font-medium text-[#1B2620] mb-6">Receitas vs Despesas</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.movimentacoes_mes}>
                <CartesianGrid strokeDasharray="3 3" className="recharts-grid-custom" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="receitas" stroke="#5C9F5A" strokeWidth={2} name="Receitas" />
                <Line type="monotone" dataKey="despesas" stroke="#E87153" strokeWidth={2} name="Despesas" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Despesas por Categoria */}
        {stats.despesas_por_categoria && stats.despesas_por_categoria.length > 0 && (
          <div className="bg-white rounded-lg p-6 border border-[#E5E3DB]" data-testid="expenses-by-category-chart">
            <h3 className="text-xl font-medium text-[#1B2620] mb-6">Despesas por Categoria</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.despesas_por_categoria}
                  dataKey="valor"
                  nameKey="categoria"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {stats.despesas_por_categoria.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div className="bg-white rounded-lg p-6 border border-[#E5E3DB]" data-testid="sold-animals-card">
          <p className="text-sm text-[#7A8780] uppercase tracking-wider font-semibold">Vendidos</p>
          <p className="text-3xl font-semibold text-[#1B2620] mt-2">{stats.total_vendidos}</p>
        </div>
        <div className="bg-white rounded-lg p-6 border border-[#E5E3DB]" data-testid="lost-animals-card">
          <p className="text-sm text-[#7A8780] uppercase tracking-wider font-semibold">Perdas/Mortes</p>
          <p className="text-3xl font-semibold text-[#1B2620] mt-2">{stats.total_mortos}</p>
        </div>
        <div className="bg-white rounded-lg p-6 border border-[#E5E3DB]" data-testid="inactive-animals-card">
          <p className="text-sm text-[#7A8780] uppercase tracking-wider font-semibold">Inativos</p>
          <p className="text-3xl font-semibold text-[#1B2620] mt-2">
            {stats.total_animais - stats.total_ativos}
          </p>
        </div>
      </div>
    </div>
  );
}
