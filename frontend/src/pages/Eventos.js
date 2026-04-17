import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { emit, on, EVENTS } from '../lib/eventBus';
import { Plus, Trash, Pencil, ListPlus, CaretDown, CaretRight, CalendarBlank, Syringe, ArrowClockwise, Check, X } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import SelectEditavel from '../components/SelectEditavel';
import { usePagination, PaginationBar } from '../components/Pagination';
import { toast } from 'sonner';

const TIPOS_EVENTOS_PADRAO = ['nascimento', 'desmame', 'vacinacao', 'pesagem', 'tratamento', 'vermifugacao', 'exame'];
const TIPOS_ACAO = ['vacinacao', 'pesagem', 'tratamento', 'desmame', 'vermifugacao', 'exame', 'outro'];
const TIPOS_ANIMAIS = ['Bovino', 'Suino', 'Ovino', 'Caprino', 'Equino', 'Aves'];

function formatRecorrencia(dias) {
  if (!dias || dias === 0) return 'Dose única';
  if (dias >= 365) return `${Math.round(dias / 365)} ano(s)`;
  if (dias >= 30) return `${Math.round(dias / 30)} mês(es)`;
  return `${dias} dias`;
}

export default function Eventos() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('lista'); // lista / calendario
  const [eventos, setEventos] = useState([]);
  const [animais, setAnimais] = useState([]);
  const [sequencias, setSequencias] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [expandido, setExpandido] = useState(new Set()); // grupos expandidos
  const [filtroTipo, setFiltroTipo] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  const [formData, setFormData] = useState({ tipo: '', animal_id: '', data: '', detalhes: '', peso: '', peso_tipo: 'aferido', vacina: '' });
  const [bulkData, setBulkData] = useState({ tipo: '', tag_prefixo: '', tag_inicio: '', tag_fim: '', data: '', detalhes: '', peso: '', peso_tipo: 'estimado', vacina: '' });

  // Calendário
  const [tiposPadrao, setTiposPadrao] = useState({});
  const [calSelecionado, setCalSelecionado] = useState('');
  const [protocolos, setProtocolos] = useState([]);
  const [calLoading, setCalLoading] = useState(false);
  const [calPersonalizado, setCalPersonalizado] = useState(false);
  const [editandoProtocolo, setEditandoProtocolo] = useState(null);
  const [protoForm, setProtoForm] = useState({ nome: '', tipo_acao: 'vacinacao', mensagem: '', recorrencia_dias: '', idade_min_meses: '', idade_max_meses: '', sexo: '' });

  useEffect(() => { carregarDados(); carregarSequencias(); }, []);
  useEffect(() => {
    const unsubs = [
      on(EVENTS.ANIMAL_CHANGED, () => { carregarDados(); carregarSequencias(); }),
      on(EVENTS.EVENTO_CHANGED, carregarDados),
    ];
    return () => unsubs.forEach(u => u());
  }, []);
  useEffect(() => { if (tab === 'calendario') carregarTiposPadrao(); }, [tab]); // eslint-disable-line

  const carregarDados = async () => {
    try {
      const [e, a] = await Promise.all([api.get('/eventos'), api.get('/animais')]);
      setEventos(e.data); setAnimais(a.data);
    } catch { toast.error('Erro ao carregar dados'); }
    finally { setLoading(false); }
  };
  const carregarSequencias = async () => {
    try { const r = await api.get('/animais/sequencias'); setSequencias(r.data); } catch { /* silent */ }
  };

  const abrirHistorico = (id) => navigate(`/animais?open=${id}`);

  // ============ AGRUPAMENTO ============
  const grupos = useMemo(() => {
    const filtrados = filtroTipo ? eventos.filter(e => e.tipo === filtroTipo) : eventos;
    const map = new Map();
    for (const ev of filtrados) {
      // Chave: tipo + data (+ vacina se for vacinação)
      const keyVacina = ev.tipo === 'vacinacao' ? (ev.vacina || 'sem_vacina') : '';
      const key = `${ev.tipo}||${ev.data}||${keyVacina}`;
      if (!map.has(key)) map.set(key, { tipo: ev.tipo, data: ev.data, vacina: ev.tipo === 'vacinacao' ? ev.vacina : null, eventos: [] });
      map.get(key).eventos.push(ev);
    }
    return Array.from(map.values()).sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  }, [eventos, filtroTipo]);

  const tiposUnicos = [...new Set(eventos.map(e => e.tipo))].sort();
  const pag = usePagination(grupos, 100);

  const toggleGrupo = (key) => {
    const n = new Set(expandido);
    if (n.has(key)) n.delete(key); else n.add(key);
    setExpandido(n);
  };

  // ============ CRUD ============
  const handleSubmit = async () => {
    if (!formData.tipo || !formData.animal_id || !formData.data) { toast.error('Preencha tipo, animal e data'); return; }
    const payload = { ...formData, peso: formData.peso ? parseFloat(formData.peso) : null };
    try {
      if (editando) { await api.put(`/eventos/${editando.id}`, payload); toast.success('Evento atualizado!'); }
      else { await api.post('/eventos', payload); toast.success('Evento registrado!'); }
      setDialogOpen(false); setEditando(null);
      setFormData({ tipo: '', animal_id: '', data: '', detalhes: '', peso: '', peso_tipo: 'aferido', vacina: '' });
      carregarDados();
      emit(EVENTS.EVENTO_CHANGED); emit(EVENTS.ANIMAL_CHANGED);
    } catch (error) { toast.error(error.response?.data?.detail || 'Erro ao salvar'); }
  };

  const handleBulkSubmit = async () => {
    if (!bulkData.tipo || !bulkData.tag_prefixo || !bulkData.tag_inicio || !bulkData.tag_fim || !bulkData.data) {
      toast.error('Preencha tipo, prefixo, intervalo e data'); return;
    }
    setBulkLoading(true);
    try {
      const payload = { ...bulkData, tag_inicio: parseInt(bulkData.tag_inicio), tag_fim: parseInt(bulkData.tag_fim), peso: bulkData.peso ? parseFloat(bulkData.peso) : null };
      const res = await api.post('/eventos/bulk', payload);
      toast.success(`${res.data.total} evento(s) registrado(s)!`);
      setBulkDialogOpen(false);
      setBulkData({ tipo: '', tag_prefixo: '', tag_inicio: '', tag_fim: '', data: '', detalhes: '', peso: '', peso_tipo: 'estimado', vacina: '' });
      carregarDados();
      emit(EVENTS.EVENTO_CHANGED); emit(EVENTS.ANIMAL_CHANGED);
    } catch (error) { toast.error(error.response?.data?.detail || 'Erro ao registrar em massa'); }
    finally { setBulkLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir este evento?')) return;
    try { await api.delete(`/eventos/${id}`); toast.success('Excluído!'); carregarDados(); emit(EVENTS.EVENTO_CHANGED); }
    catch { toast.error('Erro ao excluir'); }
  };

  const handleDeleteGrupo = async (grupo) => {
    if (!window.confirm(`Excluir TODOS os ${grupo.eventos.length} evento(s) deste grupo?`)) return;
    let ok = 0;
    for (const ev of grupo.eventos) {
      try { await api.delete(`/eventos/${ev.id}`); ok++; } catch { /* continua */ }
    }
    toast.success(`${ok} evento(s) excluído(s)`);
    carregarDados(); emit(EVENTS.EVENTO_CHANGED);
  };

  const getAnimalTag = (id) => { const a = animais.find(x => x.id === id); return a ? a.tag : id; };
  const getAnimalTipo = (id) => { const a = animais.find(x => x.id === id); return a ? a.tipo : ''; };

  // ============ CALENDARIO ============
  const carregarTiposPadrao = async () => {
    try { const r = await api.get('/calendario-vacinacao/tipos-padrao/listar'); setTiposPadrao(r.data); } catch { /* silent */ }
  };
  const carregarCalendario = async (tipo) => {
    setCalSelecionado(tipo); setCalLoading(true);
    try {
      const r = await api.get(`/calendario-vacinacao/${tipo}`);
      setProtocolos(r.data.protocolos || []);
      setCalPersonalizado(r.data.personalizado || false);
    } catch { toast.error('Erro ao carregar calendário'); }
    finally { setCalLoading(false); }
  };
  const aplicarCalendario = async (tipo) => {
    try {
      const res = await api.post(`/calendario-vacinacao/aplicar/${tipo}`);
      toast.success(`${res.data.criados} lembrete(s) consolidado(s) gerado(s)${res.data.existentes > 0 ? `, ${res.data.existentes} já existiam` : ''}`);
      carregarTiposPadrao();
      emit(EVENTS.LEMBRETE_CHANGED);
    } catch { toast.error('Erro ao aplicar calendário'); }
  };
  const salvarProtocolos = async () => {
    if (!calSelecionado) return;
    try {
      await api.put(`/calendario-vacinacao/${calSelecionado}`, { protocolos });
      try {
        const check = await api.post(`/calendario-vacinacao/${calSelecionado}/sincronizar-lembretes?desativar=false`);
        if (check.data?.total_orfaos > 0) {
          if (window.confirm(`✅ Calendário salvo!\n\n⚠️ ${check.data.total_orfaos} lembrete(s) ficaram órfãos.\n\nDesativar esses lembretes órfãos?`)) {
            const r = await api.post(`/calendario-vacinacao/${calSelecionado}/sincronizar-lembretes?desativar=true`);
            toast.success(`Calendário salvo e ${r.data.desativados} lembrete(s) desativado(s)`);
            emit(EVENTS.LEMBRETE_CHANGED);
          } else toast.success('Calendário salvo');
        } else toast.success('Calendário salvo!');
      } catch { toast.success('Calendário salvo!'); }
      setCalPersonalizado(true); carregarTiposPadrao();
    } catch { toast.error('Erro ao salvar'); }
  };
  const resetarCalendario = async () => {
    if (!calSelecionado || !window.confirm('Resetar para padrão?')) return;
    try {
      await api.delete(`/calendario-vacinacao/${calSelecionado}`);
      toast.success('Resetado para padrão'); carregarCalendario(calSelecionado); carregarTiposPadrao();
    } catch { toast.error('Erro ao resetar'); }
  };
  const addProtocolo = () => {
    if (!protoForm.nome) { toast.error('Preencha o nome'); return; }
    const novo = {
      nome: protoForm.nome, tipo_acao: protoForm.tipo_acao || 'vacinacao',
      mensagem: protoForm.mensagem || '',
      recorrencia_dias: protoForm.recorrencia_dias ? parseInt(protoForm.recorrencia_dias) : 0,
      idade_min_meses: protoForm.idade_min_meses ? parseInt(protoForm.idade_min_meses) : null,
      idade_max_meses: protoForm.idade_max_meses ? parseInt(protoForm.idade_max_meses) : null,
      sexo: protoForm.sexo || null,
    };
    if (editandoProtocolo !== null) {
      const up = [...protocolos]; up[editandoProtocolo] = novo; setProtocolos(up); setEditandoProtocolo(null);
    } else { setProtocolos([...protocolos, novo]); }
    setProtoForm({ nome: '', tipo_acao: 'vacinacao', mensagem: '', recorrencia_dias: '', idade_min_meses: '', idade_max_meses: '', sexo: '' });
  };

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4A6741]"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#2F1810]" data-testid="eventos-title">Eventos</h1>
          <p className="text-sm text-[#7A8780]">{eventos.length} evento(s) · {grupos.length} grupo(s)</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex bg-[#F5F0E8] rounded-lg p-0.5">
            <button onClick={() => setTab('lista')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'lista' ? 'bg-white shadow-sm text-[#2F1810]' : 'text-[#7A8780]'}`} data-testid="tab-lista">
              <CalendarBlank size={16} className="inline mr-1" /> Lista
            </button>
            <button onClick={() => setTab('calendario')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'calendario' ? 'bg-white shadow-sm text-[#2F1810]' : 'text-[#7A8780]'}`} data-testid="tab-calendario">
              <Syringe size={16} className="inline mr-1" /> Calendário Padrão
            </button>
          </div>
        </div>
      </div>

      {tab === 'lista' && (
        <>
          <div className="flex gap-2 items-center justify-end">
            <Select value={filtroTipo || 'todos'} onValueChange={(v) => setFiltroTipo(v === 'todos' ? '' : v)}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Filtrar tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                {tiposUnicos.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="bg-white border-[#4A6741] text-[#4A6741] hover:bg-[#4A6741]/10">
                  <ListPlus className="mr-2" size={18} /> Em Massa
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Registrar Eventos em Massa</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Tipo *</Label><SelectEditavel campo="tipo_evento" value={bulkData.tipo} onValueChange={(v) => setBulkData({...bulkData, tipo: v})} placeholder="Tipo do evento" opcoesPadrao={TIPOS_EVENTOS_PADRAO} /></div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><Label>Prefixo *</Label><Input placeholder="BOV-" value={bulkData.tag_prefixo} onChange={(e) => setBulkData({...bulkData, tag_prefixo: e.target.value})} /></div>
                    <div><Label>Início *</Label><Input type="number" value={bulkData.tag_inicio} onChange={(e) => setBulkData({...bulkData, tag_inicio: e.target.value})} /></div>
                    <div><Label>Fim *</Label><Input type="number" value={bulkData.tag_fim} onChange={(e) => setBulkData({...bulkData, tag_fim: e.target.value})} /></div>
                  </div>
                  {sequencias.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {sequencias.map((s, i) => (
                        <button key={i} type="button" onClick={() => setBulkData({...bulkData, tag_prefixo: s.prefixo, tag_inicio: String(s.primeiro), tag_fim: String(s.ultimo)})} className="flex items-center gap-1 px-2 py-1 bg-[#F5F0E8] rounded-md border border-[#E5E3DB] hover:border-[#4A6741] text-xs">
                          <span className="font-mono">{s.prefixo}</span>
                          <span className="text-[#7A8780]">{s.primeiro}–{s.ultimo}</span>
                          <span className="text-[#4A6741]">({s.total})</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div><Label>Data *</Label><Input type="date" value={bulkData.data} onChange={(e) => setBulkData({...bulkData, data: e.target.value})} /></div>
                  {bulkData.tipo === 'vacinacao' && <div><Label>Vacina</Label><SelectEditavel campo="vacina" value={bulkData.vacina} onValueChange={(v) => setBulkData({...bulkData, vacina: v})} placeholder="Nome da vacina" opcoesPadrao={[]} /></div>}
                  {bulkData.tipo === 'pesagem' && (
                    <div><Label>Peso (kg)</Label>
                      <div className="flex gap-2">
                        <Input type="number" step="0.1" value={bulkData.peso} onChange={(e) => setBulkData({...bulkData, peso: e.target.value})} className="flex-1" />
                        <Select value={bulkData.peso_tipo || 'estimado'} onValueChange={(v) => setBulkData({...bulkData, peso_tipo: v})}>
                          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="aferido">Aferido</SelectItem><SelectItem value="estimado">Estimado</SelectItem><SelectItem value="medio">Médio</SelectItem></SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                  <div><Label>Detalhes</Label><Input value={bulkData.detalhes} onChange={(e) => setBulkData({...bulkData, detalhes: e.target.value})} /></div>
                  <Button className="w-full bg-[#4A6741] hover:bg-[#3B5233]" onClick={handleBulkSubmit} disabled={bulkLoading}>{bulkLoading ? 'Registrando...' : 'Registrar em Massa'}</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditando(null); }}>
              <DialogTrigger asChild>
                <Button className="bg-[#4A6741] hover:bg-[#3B5233]" onClick={() => { setEditando(null); setFormData({ tipo: '', animal_id: '', data: '', detalhes: '', peso: '', peso_tipo: 'aferido', vacina: '' }); }}>
                  <Plus className="mr-2" size={18} /> Novo Evento
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>{editando ? 'Editar Evento' : 'Registrar Evento'}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Tipo *</Label><SelectEditavel campo="tipo_evento" value={formData.tipo} onValueChange={(v) => setFormData({...formData, tipo: v})} placeholder="Tipo do evento" opcoesPadrao={TIPOS_EVENTOS_PADRAO} /></div>
                  <div>
                    <Label>Animal *</Label>
                    <Select value={formData.animal_id} onValueChange={(v) => setFormData({...formData, animal_id: v})}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{animais.filter(a => a.status === 'ativo').map(a => <SelectItem key={a.id} value={a.id}>{a.tag} - {a.tipo}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Data *</Label><Input type="date" value={formData.data} onChange={(e) => setFormData({...formData, data: e.target.value})} /></div>
                  {formData.tipo === 'vacinacao' && <div><Label>Vacina</Label><SelectEditavel campo="vacina" value={formData.vacina} onValueChange={(v) => setFormData({...formData, vacina: v})} placeholder="Nome da vacina" opcoesPadrao={[]} /></div>}
                  {formData.tipo === 'pesagem' && (
                    <div><Label>Peso (kg)</Label>
                      <div className="flex gap-2">
                        <Input type="number" step="0.1" value={formData.peso} onChange={(e) => setFormData({...formData, peso: e.target.value})} className="flex-1" />
                        <Select value={formData.peso_tipo || 'aferido'} onValueChange={(v) => setFormData({...formData, peso_tipo: v})}>
                          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="aferido">Aferido</SelectItem><SelectItem value="estimado">Estimado</SelectItem><SelectItem value="medio">Médio</SelectItem></SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                  <div><Label>Detalhes</Label><Input value={formData.detalhes} onChange={(e) => setFormData({...formData, detalhes: e.target.value})} /></div>
                  <Button className="w-full bg-[#4A6741] hover:bg-[#3B5233]" onClick={handleSubmit}>{editando ? 'Atualizar' : 'Registrar'}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-white rounded-xl border border-[#E8DCC8] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#F5F0E8]">
                <tr>
                  <th className="text-left px-3 py-3 w-8"></th>
                  <th className="text-left px-4 py-3 font-semibold text-[#2F1810]">Tipo</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#2F1810]">Data</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#2F1810]">Detalhe</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#2F1810]">Animais</th>
                  <th className="text-right px-4 py-3 font-semibold text-[#2F1810]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {grupos.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-500">Nenhum evento registrado</td></tr>
                ) : pag.paginated.map((g) => {
                  const key = `${g.tipo}||${g.data}||${g.vacina || ''}`;
                  const aberto = expandido.has(key);
                  const qtd = g.eventos.length;
                  return (
                    <React.Fragment key={key}>
                      <tr className="border-t border-[#E8DCC8] hover:bg-[#FFFDF8] cursor-pointer" onClick={() => toggleGrupo(key)} data-testid={`grupo-${key}`}>
                        <td className="px-3 py-3 text-[#7A8780]">{aberto ? <CaretDown size={16} /> : <CaretRight size={16} />}</td>
                        <td className="px-4 py-3 capitalize font-medium text-[#2F1810]">{g.tipo}</td>
                        <td className="px-4 py-3">{new Date(g.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                        <td className="px-4 py-3 text-[#7A8780]">{g.vacina ? <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs">{g.vacina}</span> : '-'}</td>
                        <td className="px-4 py-3"><span className="bg-[#4A6741]/10 text-[#4A6741] font-semibold px-2 py-0.5 rounded-full text-xs">{qtd} animal(is)</span></td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          {qtd > 1 ? (
                            <button onClick={() => handleDeleteGrupo(g)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="Excluir grupo"><Trash size={16} /></button>
                          ) : (
                            <>
                              <button onClick={() => { const ev = g.eventos[0]; setEditando(ev); setFormData({ tipo: ev.tipo, animal_id: ev.animal_id, data: ev.data, detalhes: ev.detalhes || '', peso: ev.peso || '', peso_tipo: ev.peso_tipo || 'aferido', vacina: ev.vacina || '' }); setDialogOpen(true); }} className="p-1.5 rounded-lg hover:bg-[#F5F0E8] text-[#4A6741]"><Pencil size={16} /></button>
                              <button onClick={() => handleDelete(g.eventos[0].id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"><Trash size={16} /></button>
                            </>
                          )}
                        </td>
                      </tr>
                      {aberto && (
                        <tr className="bg-[#FAFAF7]">
                          <td colSpan={6} className="px-4 py-3">
                            <div className="space-y-1.5">
                              {g.eventos.map((ev) => (
                                <div key={ev.id} className="flex items-center justify-between px-3 py-2 bg-white rounded border border-[#E5E3DB]">
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <button onClick={() => abrirHistorico(ev.animal_id)} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#E8F0E6] text-[#4A6741] hover:bg-[#4A6741] hover:text-white transition-colors font-medium text-xs" data-testid={`link-animal-${getAnimalTag(ev.animal_id)}`}>
                                      {getAnimalTag(ev.animal_id)} <span className="opacity-60">({getAnimalTipo(ev.animal_id)})</span>
                                    </button>
                                    {ev.peso && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">{ev.peso} kg</span>}
                                    {ev.detalhes && <span className="text-xs text-[#7A8780] truncate">{ev.detalhes}</span>}
                                  </div>
                                  <div className="flex gap-1">
                                    <button onClick={() => { setEditando(ev); setFormData({ tipo: ev.tipo, animal_id: ev.animal_id, data: ev.data, detalhes: ev.detalhes || '', peso: ev.peso || '', peso_tipo: ev.peso_tipo || 'aferido', vacina: ev.vacina || '' }); setDialogOpen(true); }} className="p-1 rounded hover:bg-[#F5F0E8] text-[#4A6741]"><Pencil size={14} /></button>
                                    <button onClick={() => handleDelete(ev.id)} className="p-1 rounded hover:bg-red-50 text-red-600"><Trash size={14} /></button>
                                  </div>
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
          </div>
          <PaginationBar {...pag} label="grupos de eventos" />
        </>
      )}

      {tab === 'calendario' && (
        <div className="bg-white rounded-xl border border-[#E8DCC8] p-6" data-testid="calendario-tab">
          <div className="flex items-center gap-3 mb-4">
            <Syringe size={24} className="text-[#4A6741]" weight="fill" />
            <div>
              <h2 className="text-lg font-bold text-[#2F1810]">Calendário de Vacinação Padrão</h2>
              <p className="text-sm text-[#7A8780]">Protocolos sanitários por tipo de animal. Aplicar gera lembretes consolidados automaticamente.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {TIPOS_ANIMAIS.map(tipo => {
              const info = tiposPadrao[tipo] || {};
              return (
                <button key={tipo} onClick={() => carregarCalendario(tipo)} data-testid={`cal-tipo-${tipo.toLowerCase()}`}
                  className={`p-4 rounded-xl border-2 transition-all text-center hover:shadow-md ${calSelecionado === tipo ? 'border-[#4A6741] bg-[#E8F0E6] shadow-md' : 'border-[#E5E3DB] bg-white hover:border-[#4A6741]/50'}`}>
                  <p className="font-bold text-[#2F1810] text-sm">{tipo}</p>
                  <p className="text-xs text-[#7A8780] mt-1">{info.total_protocolos || '?'} protocolo(s)</p>
                  {info.lembretes_ativos > 0 && <p className="text-xs text-[#4A6741] font-medium mt-1"><Check size={12} className="inline" /> {info.lembretes_ativos} ativo(s)</p>}
                  {info.personalizado && <span className="text-[9px] bg-[#D99B29]/15 text-[#D99B29] px-1.5 py-0.5 rounded-full">Personalizado</span>}
                </button>
              );
            })}
          </div>

          {calSelecionado && (
            <div className="border-t border-[#E8DCC8] pt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#2F1810]">{calSelecionado} {calPersonalizado && <span className="ml-2 text-xs bg-[#D99B29]/15 text-[#D99B29] px-2 py-0.5 rounded-full">Personalizado</span>}</h3>
                <div className="flex gap-2">
                  {calPersonalizado && <Button variant="outline" size="sm" onClick={resetarCalendario} className="text-xs"><ArrowClockwise size={14} className="mr-1" /> Resetar Padrão</Button>}
                  <Button size="sm" className="bg-[#4A6741] hover:bg-[#3B5233] text-xs" onClick={() => aplicarCalendario(calSelecionado)} data-testid="aplicar-calendario-btn"><Check size={14} className="mr-1" /> Gerar Lembretes</Button>
                </div>
              </div>

              {calLoading ? (
                <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#4A6741]"></div></div>
              ) : (
                <>
                  <div className="space-y-2 mb-4">
                    {protocolos.length === 0 ? (
                      <p className="text-center py-4 text-[#7A8780]">Nenhum protocolo configurado</p>
                    ) : protocolos.map((p, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-[#FAFAF7] rounded-lg border border-[#E5E3DB]">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${p.tipo_acao === 'vacinacao' ? 'bg-[#4A6741]/10 text-[#4A6741]' : 'bg-blue-100 text-blue-600'}`}>
                            <Syringe size={14} weight="fill" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{p.nome}</p>
                            <div className="flex flex-wrap gap-1.5 mt-0.5">
                              <span className="text-[10px] bg-[#4A6741]/10 text-[#4A6741] px-1.5 py-0.5 rounded-full capitalize">{p.tipo_acao}</span>
                              <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">{formatRecorrencia(p.recorrencia_dias)}</span>
                              {p.sexo && <span className="text-[10px] bg-pink-50 text-pink-600 px-1.5 py-0.5 rounded-full">{p.sexo === 'femea' ? 'Fêmeas' : 'Machos'}</span>}
                              {(p.idade_min_meses || p.idade_max_meses) && <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full">{p.idade_min_meses || 0}–{p.idade_max_meses || '∞'}m</span>}
                            </div>
                            {p.mensagem && <p className="text-xs text-[#7A8780] mt-0.5">{p.mensagem}</p>}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => { setProtoForm({ nome: p.nome, tipo_acao: p.tipo_acao || 'vacinacao', mensagem: p.mensagem || '', recorrencia_dias: p.recorrencia_dias || '', idade_min_meses: p.idade_min_meses || '', idade_max_meses: p.idade_max_meses || '', sexo: p.sexo || '' }); setEditandoProtocolo(i); }} className="p-1.5 rounded hover:bg-[#E5E3DB] text-[#4A6741]"><Pencil size={14} /></button>
                          <button onClick={() => setProtocolos(protocolos.filter((_, idx) => idx !== i))} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-[#F5F0E8] rounded-lg p-4">
                    <p className="text-sm font-semibold text-[#2F1810] mb-3">{editandoProtocolo !== null ? 'Editar Protocolo' : 'Adicionar Protocolo'}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div className="col-span-2"><Input placeholder="Nome (ex: Febre Aftosa)" value={protoForm.nome} onChange={(e) => setProtoForm({...protoForm, nome: e.target.value})} className="bg-white" /></div>
                      <Select value={protoForm.tipo_acao} onValueChange={(v) => setProtoForm({...protoForm, tipo_acao: v})}>
                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>{TIPOS_ACAO.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input type="number" placeholder="Recorrência (dias)" value={protoForm.recorrencia_dias} onChange={(e) => setProtoForm({...protoForm, recorrencia_dias: e.target.value})} className="bg-white" />
                      <Input placeholder="Mensagem" value={protoForm.mensagem} onChange={(e) => setProtoForm({...protoForm, mensagem: e.target.value})} className="bg-white col-span-2" />
                      <Select value={protoForm.sexo || 'todos_s'} onValueChange={(v) => setProtoForm({...protoForm, sexo: v === 'todos_s' ? '' : v})}>
                        <SelectTrigger className="bg-white"><SelectValue placeholder="Sexo" /></SelectTrigger>
                        <SelectContent><SelectItem value="todos_s">Todos</SelectItem><SelectItem value="macho">Macho</SelectItem><SelectItem value="femea">Fêmea</SelectItem></SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Button onClick={addProtocolo} className="bg-[#4A6741] hover:bg-[#3B5233] flex-1" size="sm">{editandoProtocolo !== null ? 'Salvar' : 'Adicionar'}</Button>
                        {editandoProtocolo !== null && <Button variant="outline" size="sm" onClick={() => { setEditandoProtocolo(null); setProtoForm({ nome: '', tipo_acao: 'vacinacao', mensagem: '', recorrencia_dias: '', idade_min_meses: '', idade_max_meses: '', sexo: '' }); }}><X size={14} /></Button>}
                      </div>
                    </div>
                    {protocolos.length > 0 && <Button onClick={salvarProtocolos} className="mt-3 w-full bg-[#2B6CB0] hover:bg-[#1E5A9E]" size="sm">Salvar Calendário Personalizado</Button>}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
