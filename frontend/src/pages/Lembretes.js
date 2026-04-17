import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { emit, on, EVENTS } from '../lib/eventBus';
import { Plus, Trash, Pencil, Bell, BellRinging, ToggleLeft, ToggleRight, Warning, CaretDown, CaretRight } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { usePagination, PaginationBar } from '../components/Pagination';
import { toast } from 'sonner';

const TIPOS_ACAO = ['vacinacao', 'pesagem', 'tratamento', 'desmame', 'vermifugacao', 'exame', 'outro'];
const TIPOS_ANIMAIS = ['Bovino', 'Suino', 'Ovino', 'Caprino', 'Equino', 'Aves', 'Outros'];

export default function Lembretes() {
  const navigate = useNavigate();
  const [lembretes, setLembretes] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [tab, setTab] = useState('alertas');
  const [filtroTipoAlerta, setFiltroTipoAlerta] = useState('');
  const [expandidos, setExpandidos] = useState(new Set());

  const [form, setForm] = useState({
    nome: '', tipo_acao: '', mensagem: '', recorrencia_dias: '', ativo: true,
    condicoes: { tipo_animal: '', sexo: '', idade_min_meses: '', idade_max_meses: '', peso_min: '', peso_max: '', status: 'ativo' }
  });

  useEffect(() => { carregarDados(); }, []);
  useEffect(() => {
    const unsubs = [
      on(EVENTS.LEMBRETE_CHANGED, carregarDados),
      on(EVENTS.EVENTO_CHANGED, carregarDados),
      on(EVENTS.ANIMAL_CHANGED, carregarDados),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  const carregarDados = async () => {
    try {
      const [lembRes, alertRes] = await Promise.all([api.get('/lembretes'), api.get('/lembretes/alertas')]);
      setLembretes(lembRes.data);
      setAlertas(alertRes.data.alertas || []);
    } catch { toast.error('Erro ao carregar lembretes'); }
    finally { setLoading(false); }
  };

  const resetForm = () => setForm({
    nome: '', tipo_acao: '', mensagem: '', recorrencia_dias: '', ativo: true,
    condicoes: { tipo_animal: '', sexo: '', idade_min_meses: '', idade_max_meses: '', peso_min: '', peso_max: '', status: 'ativo' }
  });

  const handleSubmit = async () => {
    if (!form.nome || !form.tipo_acao) { toast.error('Preencha nome e tipo de ação'); return; }
    try {
      const payload = {
        nome: form.nome, tipo_acao: form.tipo_acao, mensagem: form.mensagem, ativo: form.ativo,
        recorrencia_dias: form.recorrencia_dias ? parseInt(form.recorrencia_dias) : null,
        condicoes: {
          tipo_animal: form.condicoes.tipo_animal || null,
          sexo: form.condicoes.sexo || null,
          idade_min_meses: form.condicoes.idade_min_meses ? parseInt(form.condicoes.idade_min_meses) : null,
          idade_max_meses: form.condicoes.idade_max_meses ? parseInt(form.condicoes.idade_max_meses) : null,
          peso_min: form.condicoes.peso_min ? parseFloat(form.condicoes.peso_min) : null,
          peso_max: form.condicoes.peso_max ? parseFloat(form.condicoes.peso_max) : null,
          status: form.condicoes.status || 'ativo'
        }
      };
      if (editando) { await api.put(`/lembretes/${editando.id}`, payload); toast.success('Lembrete atualizado!'); }
      else { await api.post('/lembretes', payload); toast.success('Lembrete criado!'); }
      setDialogOpen(false); setEditando(null); resetForm(); carregarDados();
      emit(EVENTS.LEMBRETE_CHANGED);
    } catch (error) { toast.error(error.response?.data?.detail || 'Erro ao salvar'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir este lembrete?')) return;
    try { await api.delete(`/lembretes/${id}`); toast.success('Lembrete excluído!'); carregarDados(); emit(EVENTS.LEMBRETE_CHANGED); }
    catch { toast.error('Erro ao excluir'); }
  };

  const toggleAtivo = async (l) => {
    try {
      const payload = {
        nome: l.nome, tipo_acao: l.tipo_acao, mensagem: l.mensagem || '',
        recorrencia_dias: l.recorrencia_dias, ativo: !l.ativo, condicoes: l.condicoes || {}
      };
      await api.put(`/lembretes/${l.id}`, payload);
      toast.success(l.ativo ? 'Desativado' : 'Ativado');
      carregarDados();
    } catch { toast.error('Erro ao atualizar'); }
  };

  const abrirEdicao = (l) => {
    setEditando(l);
    const c = l.condicoes || {};
    setForm({
      nome: l.nome, tipo_acao: l.tipo_acao, mensagem: l.mensagem || '',
      recorrencia_dias: l.recorrencia_dias || '', ativo: l.ativo,
      condicoes: {
        tipo_animal: c.tipo_animal || '', sexo: c.sexo || '',
        idade_min_meses: c.idade_min_meses || '', idade_max_meses: c.idade_max_meses || '',
        peso_min: c.peso_min || '', peso_max: c.peso_max || '', status: c.status || 'ativo'
      }
    });
    setDialogOpen(true);
  };

  const tiposAlerta = [...new Set(alertas.map(a => a.tipo_acao))].sort();
  const alertasFiltrados = filtroTipoAlerta ? alertas.filter(a => a.tipo_acao === filtroTipoAlerta) : alertas;

  // Agrupa alertas por (lembrete_nome + tipo_acao). Se lembrete_nome estiver vazio, usa "Geral"
  const gruposAlertas = useMemo(() => {
    const map = new Map();
    for (const a of alertasFiltrados) {
      const key = `${a.lembrete_nome || 'Geral'}||${a.tipo_acao}`;
      if (!map.has(key)) {
        map.set(key, {
          lembrete_nome: a.lembrete_nome || 'Geral',
          tipo_acao: a.tipo_acao,
          mensagem: a.mensagem,
          itens: [],
          urgentes: 0,
        });
      }
      const g = map.get(key);
      g.itens.push(a);
      if (a.urgente) g.urgentes += 1;
    }
    // Urgentes primeiro, depois por nome
    return Array.from(map.values()).sort((x, y) => {
      if (y.urgentes !== x.urgentes) return y.urgentes - x.urgentes;
      return x.lembrete_nome.localeCompare(y.lembrete_nome);
    });
  }, [alertasFiltrados]);

  const toggleGrupo = (key) => {
    const n = new Set(expandidos);
    if (n.has(key)) n.delete(key); else n.add(key);
    setExpandidos(n);
  };

  const pagAlertas = usePagination(gruposAlertas, 100);
  const abrirHistorico = (id) => navigate(`/animais?open=${id}`);

  const formatCondicoes = (c) => {
    if (!c) return '-';
    const parts = [];
    if (c.tipo_animal) parts.push(c.tipo_animal);
    if (c.sexo) parts.push(c.sexo === 'macho' ? 'Machos' : 'Fêmeas');
    if (c.idade_min_meses || c.idade_max_meses) parts.push(`Idade: ${c.idade_min_meses || 0}-${c.idade_max_meses || '∞'}m`);
    return parts.length > 0 ? parts.join(' · ') : 'Todos';
  };

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4A6741]"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-[#2F1810]" data-testid="lembretes-title">Lembretes</h1>
          {alertas.length > 0 && (
            <p className="text-sm text-amber-600 font-medium mt-1">
              <Warning size={16} className="inline mr-1" weight="fill" />
              {alertas.length} alerta(s) pendente(s)
            </p>
          )}
          <p className="text-xs text-[#7A8780] mt-0.5">O Calendário de Vacinação agora está em <strong>Eventos → Calendário Padrão</strong></p>
        </div>
        <div className="flex bg-[#F5F0E8] rounded-lg p-0.5">
          <button onClick={() => setTab('alertas')} className={`px-3 py-1.5 rounded-md text-sm font-medium ${tab === 'alertas' ? 'bg-white shadow-sm text-[#2F1810]' : 'text-[#7A8780]'}`} data-testid="tab-alertas">
            <BellRinging size={16} className="inline mr-1" /> Alertas {alertas.length > 0 && <span className="bg-amber-500 text-white text-xs px-1.5 rounded-full ml-1">{alertas.length}</span>}
          </button>
          <button onClick={() => setTab('config')} className={`px-3 py-1.5 rounded-md text-sm font-medium ${tab === 'config' ? 'bg-white shadow-sm text-[#2F1810]' : 'text-[#7A8780]'}`} data-testid="tab-config">
            <Bell size={16} className="inline mr-1" /> Regras
          </button>
        </div>
      </div>

      {tab === 'alertas' && (
        <div>
          {alertas.length > 0 && (
            <div className="flex gap-2 mb-4">
              <Select value={filtroTipoAlerta || 'todos'} onValueChange={(v) => setFiltroTipoAlerta(v === 'todos' ? '' : v)}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Filtrar tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos ({alertas.length})</SelectItem>
                  {tiposAlerta.map(t => <SelectItem key={t} value={t} className="capitalize">{t} ({alertas.filter(a => a.tipo_acao === t).length})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {alertasFiltrados.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E8DCC8] p-12 text-center">
              <Bell size={48} className="mx-auto text-[#4A6741] mb-3" />
              <p className="text-lg font-medium text-[#2F1810]">Nenhum alerta pendente</p>
              <p className="text-sm text-[#7A8780] mt-1">Todos os animais estão em dia! Crie regras aqui ou aplique um calendário em Eventos.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#E8DCC8] overflow-hidden" data-testid="alertas-agrupados">
              <table className="w-full text-sm">
                <thead className="bg-[#F5F0E8]">
                  <tr>
                    <th className="text-left px-3 py-3 w-8"></th>
                    <th className="text-left px-4 py-3 font-semibold text-[#2F1810]">Lembrete / Ação</th>
                    <th className="text-left px-4 py-3 font-semibold text-[#2F1810]">Tipo</th>
                    <th className="text-left px-4 py-3 font-semibold text-[#2F1810]">Animais</th>
                    <th className="text-left px-4 py-3 font-semibold text-[#2F1810]">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-[#2F1810]">Mensagem</th>
                  </tr>
                </thead>
                <tbody>
                  {pagAlertas.paginated.map((g) => {
                    const key = `${g.lembrete_nome}||${g.tipo_acao}`;
                    const aberto = expandidos.has(key);
                    const total = g.itens.length;
                    return (
                      <React.Fragment key={key}>
                        <tr
                          className={`border-t border-[#E8DCC8] cursor-pointer transition-colors ${g.urgentes > 0 ? 'hover:bg-red-50/60 bg-red-50/30' : 'hover:bg-amber-50/60 bg-amber-50/30'}`}
                          onClick={() => toggleGrupo(key)}
                          data-testid={`grupo-alerta-${key}`}
                        >
                          <td className="px-3 py-3 text-[#7A8780]">{aberto ? <CaretDown size={16} /> : <CaretRight size={16} />}</td>
                          <td className="px-4 py-3 font-medium text-[#2F1810]">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${g.urgentes > 0 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                                <BellRinging size={14} weight="fill" />
                              </div>
                              {g.lembrete_nome}
                            </div>
                          </td>
                          <td className="px-4 py-3 capitalize">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-[#4A6741]/10 text-[#4A6741]">{g.tipo_acao}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="bg-[#4A6741]/10 text-[#4A6741] font-semibold px-2 py-0.5 rounded-full text-xs">{total} animal(is)</span>
                          </td>
                          <td className="px-4 py-3">
                            {g.urgentes > 0 && (
                              <span className="text-xs bg-red-200 text-red-700 px-2 py-0.5 rounded-full font-medium mr-1">
                                {g.urgentes} nunca feito
                              </span>
                            )}
                            {total - g.urgentes > 0 && (
                              <span className="text-xs bg-amber-200 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                                {total - g.urgentes} vencido(s)
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-[#7A8780] text-xs truncate max-w-[250px]">{g.mensagem || '-'}</td>
                        </tr>
                        {aberto && (
                          <tr className="bg-[#FAFAF7]">
                            <td colSpan={6} className="px-4 py-3">
                              <div className="space-y-1.5">
                                {g.itens.map((a, i) => (
                                  <div key={i} className="flex items-center justify-between px-3 py-2 bg-white rounded border border-[#E5E3DB]">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <button
                                        onClick={() => abrirHistorico(a.animal_id)}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#E8F0E6] text-[#4A6741] hover:bg-[#4A6741] hover:text-white transition-colors font-medium text-xs"
                                        data-testid={`link-alerta-animal-${a.animal_tag}`}
                                        title="Abrir histórico do animal"
                                      >
                                        {a.animal_tag}
                                        <span className="opacity-60">({a.animal_tipo})</span>
                                      </button>
                                      <span className="text-xs text-[#7A8780]">
                                        {a.ultimo_evento ? `Último: ${new Date(a.ultimo_evento + 'T00:00:00').toLocaleDateString('pt-BR')}` : 'Nunca realizado'}
                                      </span>
                                    </div>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.urgente ? 'bg-red-200 text-red-700' : 'bg-amber-200 text-amber-700'}`}>
                                      {a.urgente ? 'Nunca feito' : 'Vencido'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
              <PaginationBar {...pagAlertas} label="grupos de alertas" />
            </div>
          )}
        </div>
      )}

      {tab === 'config' && (
        <div>
          <div className="flex justify-end mb-4">
            <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) { setEditando(null); resetForm(); } }}>
              <DialogTrigger asChild>
                <Button className="bg-[#4A6741] hover:bg-[#3B5233]" onClick={() => { setEditando(null); resetForm(); }} data-testid="novo-lembrete-btn">
                  <Plus className="mr-2" size={18} /> Nova Regra
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{editando ? 'Editar Regra' : 'Nova Regra de Lembrete'}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Nome *</Label><Input placeholder="Ex: Vacina aftosa" value={form.nome} onChange={(e) => setForm({...form, nome: e.target.value})} /></div>
                    <div>
                      <Label>Tipo de Ação *</Label>
                      <Select value={form.tipo_acao || 'none'} onValueChange={(v) => setForm({...form, tipo_acao: v === 'none' ? '' : v})}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" disabled>Selecione</SelectItem>
                          {TIPOS_ACAO.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label>Mensagem</Label><Input value={form.mensagem} onChange={(e) => setForm({...form, mensagem: e.target.value})} /></div>
                  <div><Label>Recorrência (dias)</Label><Input type="number" value={form.recorrencia_dias} onChange={(e) => setForm({...form, recorrencia_dias: e.target.value})} /></div>
                  <div className="border-t border-[#E8DCC8] pt-4">
                    <p className="text-sm font-semibold text-[#2F1810] mb-3">Condições (quais animais?)</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Tipo</Label>
                        <Select value={form.condicoes.tipo_animal || 'todos_t'} onValueChange={(v) => setForm({...form, condicoes: {...form.condicoes, tipo_animal: v === 'todos_t' ? '' : v}})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos_t">Todos</SelectItem>
                            {TIPOS_ANIMAIS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Sexo</Label>
                        <Select value={form.condicoes.sexo || 'todos_s'} onValueChange={(v) => setForm({...form, condicoes: {...form.condicoes, sexo: v === 'todos_s' ? '' : v}})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos_s">Todos</SelectItem>
                            <SelectItem value="macho">Macho</SelectItem>
                            <SelectItem value="femea">Fêmea</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label className="text-xs">Idade mín (meses)</Label><Input type="number" min="0" value={form.condicoes.idade_min_meses} onChange={(e) => setForm({...form, condicoes: {...form.condicoes, idade_min_meses: e.target.value}})} /></div>
                      <div><Label className="text-xs">Idade máx (meses)</Label><Input type="number" min="0" value={form.condicoes.idade_max_meses} onChange={(e) => setForm({...form, condicoes: {...form.condicoes, idade_max_meses: e.target.value}})} /></div>
                    </div>
                  </div>
                  <Button className="w-full bg-[#4A6741] hover:bg-[#3B5233]" onClick={handleSubmit}>{editando ? 'Atualizar' : 'Criar Regra'}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-[#E8DCC8] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#F5F0E8]">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-[#2F1810]">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#2F1810]">Nome</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#2F1810]">Ação</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#2F1810]">Condições</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#2F1810]">Recorrência</th>
                  <th className="text-right px-4 py-3 font-semibold text-[#2F1810]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {lembretes.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-500">Nenhuma regra. Use Eventos → Calendário para gerar automaticamente!</td></tr>
                ) : lembretes.map((l) => (
                  <tr key={l.id} className={`border-t border-[#E8DCC8] hover:bg-[#FFFDF8] ${!l.ativo ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleAtivo(l)}>
                        {l.ativo ? <ToggleRight size={28} className="text-[#4A6741]" weight="fill" /> : <ToggleLeft size={28} className="text-gray-400" weight="fill" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {l.nome}
                      {l.auto_gerado && <span className="ml-1 text-[10px] bg-[#4A6741]/10 text-[#4A6741] px-1.5 py-0.5 rounded-full">Auto</span>}
                    </td>
                    <td className="px-4 py-3 capitalize">{l.tipo_acao}</td>
                    <td className="px-4 py-3 text-xs text-[#7A8780] max-w-[250px]">{formatCondicoes(l.condicoes)}</td>
                    <td className="px-4 py-3">{l.recorrencia_dias ? `A cada ${l.recorrencia_dias} dias` : 'Única'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => abrirEdicao(l)} className="p-1.5 rounded-lg hover:bg-[#F5F0E8] text-[#4A6741]"><Pencil size={16} /></button>
                        <button onClick={() => handleDelete(l.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"><Trash size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
