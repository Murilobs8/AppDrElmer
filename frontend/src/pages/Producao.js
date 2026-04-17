import React, { useEffect, useState, useMemo } from 'react';
import api from '../lib/api';
import { emit, on, EVENTS } from '../lib/eventBus';
import { Plus, Trash, Pencil, ListPlus, Drop, TrendUp, CurrencyCircleDollar, Package } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import SelectEditavel from '../components/SelectEditavel';
import { usePagination, PaginationBar } from '../components/Pagination';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, Cell } from 'recharts';
import { toast } from 'sonner';

const MOTIVOS_PRODUCAO = ['leite', 'ovos', 'la', 'mel', 'aluguel_pasto', 'servico_reproducao', 'adubo', 'couro', 'outros'];
const MOTIVO_LABELS = {
  leite: 'Leite', ovos: 'Ovos', la: 'Lã', mel: 'Mel',
  aluguel_pasto: 'Aluguel de Pasto', servico_reproducao: 'Serviço de Reprodução',
  adubo: 'Adubo/Esterco', couro: 'Couro', outros: 'Outros'
};
const UNIDADES = ['litros', 'kg', 'unidades', 'duzias', 'toneladas', 'dias', 'meses', 'cabecas'];
const TIPOS_ANIMAIS = ['Bovino', 'Suino', 'Ovino', 'Caprino', 'Equino', 'Aves', 'Outros'];

export default function Producao() {
  const [producoes, setProducoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({
    motivo: '', data: new Date().toISOString().split('T')[0], valor: '',
    quantidade: 1, unidade: '', tipo_animal: '', observacoes: ''
  });
  const [bulkForm, setBulkForm] = useState({
    motivo: '', quantidade_registros: 2, data_inicio: new Date().toISOString().split('T')[0],
    valor: '', quantidade: 1, unidade: '', tipo_animal: '', observacoes: '', recorrente: false
  });

  useEffect(() => { carregar(); }, []);
  useEffect(() => {
    const u = on(EVENTS.DESPESA_CHANGED, () => { /* noop - já atualiza dashboard */ });
    return () => u();
  }, []);

  const carregar = async () => {
    try {
      const res = await api.get('/producoes');
      setProducoes(res.data);
    } catch { toast.error('Erro ao carregar produções'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!form.motivo || !form.data) { toast.error('Preencha motivo e data'); return; }
    const payload = {
      motivo: form.motivo,
      data: form.data,
      valor: form.valor ? parseFloat(form.valor) : null,
      quantidade: parseFloat(form.quantidade) || 1,
      unidade: form.unidade && form.unidade !== 'none_u' ? form.unidade : null,
      tipo_animal: form.tipo_animal || null,
      observacoes: form.observacoes || ''
    };
    try {
      if (editando) {
        await api.put(`/producoes/${editando.id}`, payload);
        toast.success('Produção atualizada!');
      } else {
        await api.post('/producoes', payload);
        toast.success('Produção registrada!');
      }
      setDialogOpen(false); resetForm(); carregar();
    } catch (error) { toast.error(error.response?.data?.detail || 'Erro ao salvar'); }
  };

  const handleBulk = async () => {
    if (!bulkForm.motivo || !bulkForm.data_inicio || !bulkForm.quantidade_registros) {
      toast.error('Preencha motivo, data e quantidade de registros'); return;
    }
    try {
      const payload = {
        motivo: bulkForm.motivo,
        quantidade_registros: parseInt(bulkForm.quantidade_registros),
        data_inicio: bulkForm.data_inicio,
        valor: bulkForm.valor ? parseFloat(bulkForm.valor) : null,
        quantidade: parseFloat(bulkForm.quantidade) || 1,
        unidade: bulkForm.unidade && bulkForm.unidade !== 'none_u' ? bulkForm.unidade : null,
        tipo_animal: bulkForm.tipo_animal || null,
        observacoes: bulkForm.observacoes || '',
        recorrente: bulkForm.recorrente
      };
      const res = await api.post('/producoes/bulk', payload);
      toast.success(`${res.data.total} produção(ões) registrada(s)!`);
      setBulkOpen(false); resetBulk(); carregar();
    } catch (error) { toast.error(error.response?.data?.detail || 'Erro no cadastro em massa'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir esta produção?')) return;
    try { await api.delete(`/producoes/${id}`); toast.success('Produção excluída!'); carregar(); }
    catch { toast.error('Erro ao excluir'); }
  };

  const abrirEdicao = (p) => {
    setEditando(p);
    setForm({
      motivo: p.motivo, data: p.data, valor: p.valor || '',
      quantidade: p.quantidade || 1, unidade: p.unidade || '',
      tipo_animal: p.tipo_animal || '', observacoes: p.observacoes || ''
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setForm({ motivo: '', data: new Date().toISOString().split('T')[0], valor: '', quantidade: 1, unidade: '', tipo_animal: '', observacoes: '' });
    setEditando(null);
  };
  const resetBulk = () => {
    setBulkForm({ motivo: '', quantidade_registros: 2, data_inicio: new Date().toISOString().split('T')[0], valor: '', quantidade: 1, unidade: '', tipo_animal: '', observacoes: '', recorrente: false });
  };

  const totalValor = producoes.reduce((s, p) => s + (p.valor || 0), 0);
  const pag = usePagination(producoes, 100);

  // ============ MINI DASHBOARD ============
  const stats = useMemo(() => {
    const hoje = new Date();
    const mesAtual = hoje.toISOString().slice(0, 7);
    const ano = hoje.getFullYear();

    let totalMes = 0, totalAno = 0, qtdMes = 0, qtdAno = 0, qtdTotal = 0;
    const valorTotal = producoes.reduce((s, p) => s + (p.valor || 0), 0);

    for (const p of producoes) {
      const d = String(p.data || '');
      qtdTotal += 1;
      if (d.startsWith(mesAtual)) { totalMes += p.valor || 0; qtdMes += 1; }
      if (d.startsWith(String(ano))) { totalAno += p.valor || 0; qtdAno += 1; }
    }

    // Últimos 12 meses, valor por motivo (agregado)
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ key, label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }) });
    }
    const motivosSet = new Set(producoes.map(p => p.motivo));
    const motivos = Array.from(motivosSet);
    const serie = months.map(m => {
      const row = { mes: m.label };
      for (const mt of motivos) row[mt] = 0;
      row._total = 0;
      for (const p of producoes) {
        if (String(p.data || '').startsWith(m.key)) {
          row[p.motivo] = (row[p.motivo] || 0) + (p.valor || 0);
          row._total += p.valor || 0;
        }
      }
      return row;
    });

    // Por motivo (valor acumulado total)
    const porMotivo = Object.values(
      producoes.reduce((acc, p) => {
        if (!acc[p.motivo]) acc[p.motivo] = { motivo: MOTIVO_LABELS[p.motivo] || p.motivo, valor: 0, quantidade: 0 };
        acc[p.motivo].valor += p.valor || 0;
        acc[p.motivo].quantidade += p.quantidade || 0;
        return acc;
      }, {})
    ).sort((a, b) => b.valor - a.valor);

    // Média mensal (últimos 12 meses com dados)
    const mesesComDados = serie.filter(r => r._total > 0).length;
    const mediaMensal = mesesComDados > 0 ? serie.reduce((s, r) => s + r._total, 0) / mesesComDados : 0;

    return { totalMes, totalAno, qtdMes, qtdAno, qtdTotal, valorTotal, serie, motivos, porMotivo, mediaMensal };
  }, [producoes]);

  const MOTIVO_CORES = {
    leite: '#4A6741', ovos: '#D99B29', la: '#8B7355', mel: '#E8A87C',
    aluguel_pasto: '#6B8E9E', servico_reproducao: '#C25934', adubo: '#5A4A3A',
    couro: '#A47148', outros: '#7A8780'
  };
  const corMotivo = (m) => MOTIVO_CORES[m] || '#4A6741';

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4A6741]"></div></div>;

  return (
    <div className="fade-in" data-testid="producao-page">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-[#1B2620]">Produção</h1>
          <p className="text-lg text-[#7A8780] mt-2">
            {producoes.length} registro(s) · Total: R$ {totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={bulkOpen} onOpenChange={(v) => { setBulkOpen(v); if (!v) resetBulk(); }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-[#4A6741] text-[#4A6741] hover:bg-[#E8F0E6]" data-testid="bulk-producao-btn">
                <ListPlus size={20} className="mr-2" /> Em Massa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Produção em Massa</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Motivo *</Label>
                  <SelectEditavel campo="motivo_producao" value={bulkForm.motivo} onValueChange={(v) => setBulkForm({...bulkForm, motivo: v})} placeholder="Selecione o motivo" opcoesPadrao={MOTIVOS_PRODUCAO} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Qtd. Registros *</Label><Input type="number" min="1" max="500" value={bulkForm.quantidade_registros} onChange={(e) => setBulkForm({...bulkForm, quantidade_registros: e.target.value})} /></div>
                  <div><Label>Data Inicial *</Label><Input type="date" value={bulkForm.data_inicio} onChange={(e) => setBulkForm({...bulkForm, data_inicio: e.target.value})} /></div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="recorrente" checked={bulkForm.recorrente} onChange={(e) => setBulkForm({...bulkForm, recorrente: e.target.checked})} className="rounded" />
                  <Label htmlFor="recorrente" className="text-sm cursor-pointer">Recorrente (repetir mensalmente a partir da data inicial)</Label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Quantidade</Label><Input type="number" step="0.01" value={bulkForm.quantidade} onChange={(e) => setBulkForm({...bulkForm, quantidade: e.target.value})} /></div>
                  <div>
                    <Label>Unidade</Label>
                    <SelectEditavel campo="unidade_producao" value={bulkForm.unidade} onValueChange={(v) => setBulkForm({...bulkForm, unidade: v})} placeholder="Selecione" opcoesPadrao={UNIDADES} allowNone noneLabel="Nenhuma" />
                  </div>
                </div>
                <div><Label>Valor unitário (R$)</Label><Input type="number" step="0.01" value={bulkForm.valor} onChange={(e) => setBulkForm({...bulkForm, valor: e.target.value})} /></div>
                <div>
                  <Label>Tipo de Animal</Label>
                  <Select value={bulkForm.tipo_animal || 'none_t'} onValueChange={(v) => setBulkForm({...bulkForm, tipo_animal: v === 'none_t' ? '' : v})}>
                    <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none_t">Nenhum</SelectItem>
                      {TIPOS_ANIMAIS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Observações</Label><Input value={bulkForm.observacoes} onChange={(e) => setBulkForm({...bulkForm, observacoes: e.target.value})} /></div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setBulkOpen(false)}>Cancelar</Button>
                  <Button onClick={handleBulk} className="bg-[#4A6741] hover:bg-[#3B5334] text-white">Registrar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-[#4A6741] hover:bg-[#3B5334] text-white" data-testid="add-producao-btn">
                <Plus size={20} className="mr-2" /> Nova Produção
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editando ? 'Editar Produção' : 'Nova Produção'}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Motivo *</Label>
                  <SelectEditavel campo="motivo_producao" value={form.motivo} onValueChange={(v) => setForm({...form, motivo: v})} placeholder="Selecione o motivo" opcoesPadrao={MOTIVOS_PRODUCAO} />
                </div>
                <div><Label>Data *</Label><Input type="date" value={form.data} onChange={(e) => setForm({...form, data: e.target.value})} required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Quantidade</Label><Input type="number" step="0.01" min="0" value={form.quantidade} onChange={(e) => setForm({...form, quantidade: e.target.value})} /></div>
                  <div>
                    <Label>Unidade</Label>
                    <SelectEditavel campo="unidade_producao" value={form.unidade} onValueChange={(v) => setForm({...form, unidade: v})} placeholder="Selecione" opcoesPadrao={UNIDADES} allowNone noneLabel="Nenhuma" />
                  </div>
                </div>
                <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({...form, valor: e.target.value})} /></div>
                <div>
                  <Label>Tipo de Animal (opcional)</Label>
                  <Select value={form.tipo_animal || 'none_t'} onValueChange={(v) => setForm({...form, tipo_animal: v === 'none_t' ? '' : v})}>
                    <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none_t">Nenhum</SelectItem>
                      {TIPOS_ANIMAIS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Observações</Label><Input value={form.observacoes} onChange={(e) => setForm({...form, observacoes: e.target.value})} /></div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleSubmit} className="bg-[#4A6741] hover:bg-[#3B5334] text-white">{editando ? 'Atualizar' : 'Salvar'}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ============ MINI DASHBOARD ============ */}
      {producoes.length > 0 && (
        <div className="space-y-4 mb-6" data-testid="producao-dashboard">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-[#1B2620] rounded-xl border border-[#E5E3DB] dark:border-[#2A3530] p-4">
              <div className="flex items-center gap-2 text-xs text-[#7A8780] uppercase tracking-wider mb-1">
                <CurrencyCircleDollar size={14} weight="fill" className="text-[#4A6741]" /> Este mês
              </div>
              <p className="text-2xl font-bold text-[#1B2620] dark:text-[#E5E3DB]">R$ {stats.totalMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-[#7A8780] mt-0.5">{stats.qtdMes} registro(s)</p>
            </div>
            <div className="bg-white dark:bg-[#1B2620] rounded-xl border border-[#E5E3DB] dark:border-[#2A3530] p-4">
              <div className="flex items-center gap-2 text-xs text-[#7A8780] uppercase tracking-wider mb-1">
                <CurrencyCircleDollar size={14} weight="fill" className="text-[#D99B29]" /> Este ano
              </div>
              <p className="text-2xl font-bold text-[#1B2620] dark:text-[#E5E3DB]">R$ {stats.totalAno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-[#7A8780] mt-0.5">{stats.qtdAno} registro(s)</p>
            </div>
            <div className="bg-white dark:bg-[#1B2620] rounded-xl border border-[#E5E3DB] dark:border-[#2A3530] p-4">
              <div className="flex items-center gap-2 text-xs text-[#7A8780] uppercase tracking-wider mb-1">
                <TrendUp size={14} weight="fill" className="text-[#6B8E9E]" /> Média mensal
              </div>
              <p className="text-2xl font-bold text-[#1B2620] dark:text-[#E5E3DB]">R$ {stats.mediaMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-[#7A8780] mt-0.5">últimos 12 meses</p>
            </div>
            <div className="bg-white dark:bg-[#1B2620] rounded-xl border border-[#E5E3DB] dark:border-[#2A3530] p-4">
              <div className="flex items-center gap-2 text-xs text-[#7A8780] uppercase tracking-wider mb-1">
                <Package size={14} weight="fill" className="text-[#C25934]" /> Total acumulado
              </div>
              <p className="text-2xl font-bold text-[#1B2620] dark:text-[#E5E3DB]">R$ {stats.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-[#7A8780] mt-0.5">{stats.qtdTotal} registro(s)</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Linha: evolução 12 meses por motivo */}
            <div className="lg:col-span-2 bg-white dark:bg-[#1B2620] rounded-xl border border-[#E5E3DB] dark:border-[#2A3530] p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold text-[#7A8780] uppercase tracking-wider">Evolução mensal</p>
                  <p className="text-sm font-bold text-[#1B2620] dark:text-[#E5E3DB]">últimos 12 meses · R$ por motivo</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={stats.serie} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E3DB" opacity={0.4} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#7A8780' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#7A8780' }} tickFormatter={(v) => `R$${v >= 1000 ? (v/1000).toFixed(0) + 'k' : v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E3DB', borderRadius: 8, fontSize: 12 }}
                    formatter={(v, name) => [`R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, MOTIVO_LABELS[name] || name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => MOTIVO_LABELS[v] || v} />
                  {stats.motivos.map(m => (
                    <Line key={m} type="monotone" dataKey={m} stroke={corMotivo(m)} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Barras: distribuição por motivo */}
            <div className="bg-white dark:bg-[#1B2620] rounded-xl border border-[#E5E3DB] dark:border-[#2A3530] p-4">
              <div className="mb-3">
                <p className="text-xs font-semibold text-[#7A8780] uppercase tracking-wider">Por motivo</p>
                <p className="text-sm font-bold text-[#1B2620] dark:text-[#E5E3DB]">Distribuição · R$ total</p>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.porMotivo} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E3DB" opacity={0.4} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#7A8780' }} tickFormatter={(v) => `R$${v >= 1000 ? (v/1000).toFixed(0) + 'k' : v}`} />
                  <YAxis type="category" dataKey="motivo" tick={{ fontSize: 11, fill: '#7A8780' }} width={90} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E3DB', borderRadius: 8, fontSize: 12 }}
                    formatter={(v) => [`R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Total']}
                  />
                  <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                    {stats.porMotivo.map((entry, i) => {
                      const key = stats.motivos.find(m => (MOTIVO_LABELS[m] || m) === entry.motivo) || entry.motivo.toLowerCase();
                      return <Cell key={i} fill={corMotivo(key)} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-[#E5E3DB] overflow-hidden" data-testid="producoes-table">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F4F3F0] border-b border-[#E5E3DB]">
              <tr>
                <th className="px-6 py-4 font-semibold text-[#1B2620]">Data</th>
                <th className="px-6 py-4 font-semibold text-[#1B2620]">Motivo</th>
                <th className="px-6 py-4 font-semibold text-[#1B2620]">Tipo</th>
                <th className="px-6 py-4 font-semibold text-[#1B2620]">Qtd</th>
                <th className="px-6 py-4 font-semibold text-[#1B2620]">Valor</th>
                <th className="px-6 py-4 font-semibold text-[#1B2620]">Observações</th>
                <th className="px-6 py-4 font-semibold text-[#1B2620]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {producoes.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-[#7A8780]">
                  <Drop size={40} className="mx-auto text-[#4A6741] mb-2" />
                  Nenhuma produção registrada ainda
                </td></tr>
              ) : pag.paginated.map((p) => (
                <tr key={p.id} className="table-row border-b border-[#E5E3DB] hover:bg-[#FDFCFB]">
                  <td className="px-6 py-4 text-[#3A453F]">{new Date(p.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-[#2B6CB0]/10 text-[#2B6CB0]">
                      {MOTIVO_LABELS[p.motivo] || p.motivo}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[#3A453F]">{p.tipo_animal || '-'}</td>
                  <td className="px-6 py-4 text-[#3A453F]">{p.quantidade}{p.unidade ? ` ${p.unidade}` : ''}</td>
                  <td className="px-6 py-4 text-[#3A453F] font-medium">{p.valor ? `R$ ${p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</td>
                  <td className="px-6 py-4 text-[#7A8780] text-xs max-w-[200px] truncate">{p.observacoes || '-'}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => abrirEdicao(p)} className="text-[#4A6741] hover:text-[#3B5334]" data-testid={`edit-producao-${p.id}`}><Pencil size={18} /></button>
                      <button onClick={() => handleDelete(p.id)} className="text-[#C25934] hover:text-[#A64B2B]" data-testid={`delete-producao-${p.id}`}><Trash size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationBar {...pag} label="produções" />
      </div>
    </div>
  );
}
