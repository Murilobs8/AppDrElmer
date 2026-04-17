import React, { useEffect, useState, useMemo } from 'react';
import api from '../lib/api';
import { emit, on, EVENTS } from '../lib/eventBus';
import { usePagination, PaginationBar } from '../components/Pagination';
import { Plus, Trash, Pencil, CopySimple, Funnel, CheckSquare, Square, Syringe, ClockCounterClockwise, X } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import SelectEditavel from '../components/SelectEditavel';
import { toast } from 'sonner';

const TIPOS_ANIMAIS = ['Bovino', 'Suino', 'Ovino', 'Caprino', 'Equino', 'Aves', 'Outros'];
const SEXOS = [{ value: 'macho', label: 'Macho' }, { value: 'femea', label: 'Femea' }];
const TIPOS_EVENTOS = [
  { value: 'nascimento', label: 'Nascimento' },
  { value: 'desmame', label: 'Desmame' },
  { value: 'vacinacao', label: 'Vacinacao' },
  { value: 'pesagem', label: 'Pesagem' },
  { value: 'tratamento', label: 'Tratamento' }
];

function calcularIdade(dataNascimento) {
  if (!dataNascimento) return null;
  const nasc = new Date(dataNascimento);
  const hoje = new Date();
  let anos = hoje.getFullYear() - nasc.getFullYear();
  let meses = hoje.getMonth() - nasc.getMonth();
  if (meses < 0) { anos--; meses += 12; }
  if (hoje.getDate() < nasc.getDate()) { meses--; if (meses < 0) { anos--; meses += 12; } }
  return { anos, meses, totalMeses: anos * 12 + meses };
}

function formatarIdade(dataNascimento) {
  const idade = calcularIdade(dataNascimento);
  if (!idade) return '-';
  if (idade.anos === 0 && idade.meses === 0) return 'Recem nascido';
  if (idade.anos === 0) return `${idade.meses} ${idade.meses === 1 ? 'mes' : 'meses'}`;
  if (idade.meses === 0) return `${idade.anos} ${idade.anos === 1 ? 'ano' : 'anos'}`;
  return `${idade.anos}a ${idade.meses}m`;
}

export default function Animais() {
  const [animais, setAnimais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogBulkOpen, setDialogBulkOpen] = useState(false);
  const [dialogEventoOpen, setDialogEventoOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [selecionados, setSelecionados] = useState(new Set());
  const [formData, setFormData] = useState({ tipo: '', tag: '', sexo: '', genitora_id: '', data_nascimento: '', peso_atual: '', peso_tipo: 'aferido', observacoes: '' });
  const [formBulk, setFormBulk] = useState({ tipo: '', tag_inicial: '', quantidade: 2, sexo: '', data_nascimento: '', peso_atual: '', peso_tipo: 'estimado', observacoes: '' });
  const [formEvento, setFormEvento] = useState({ tipo: '', data: new Date().toISOString().split('T')[0], detalhes: '', peso: '', peso_tipo: 'aferido', vacina: '' });
  const [sequencias, setSequencias] = useState([]);
  const [mostrarSequencias, setMostrarSequencias] = useState(false);
  const [seqAbertaBulk, setSeqAbertaBulk] = useState(true);
  const [seqAbertaIndiv, setSeqAbertaIndiv] = useState(true);

  // Historico inline
  const [expandidoId, setExpandidoId] = useState(null);
  const [historicoData, setHistoricoData] = useState(null);
  const [historicoLoading, setHistoricoLoading] = useState(false);
  const [alertasAnimal, setAlertasAnimal] = useState([]);
  // { kind: 'subtipo'|'vacina'|'valor'|'peso'|'tipoRegistro', value: string, label: string } | null
  const [historicoFiltro, setHistoricoFiltro] = useState(null);

  // Filtros
  const [filtroTag, setFiltroTag] = useState('');
  const [filtroPrefixo, setFiltroPrefixo] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroSexo, setFiltroSexo] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroIdadeMin, setFiltroIdadeMin] = useState('');
  const [filtroIdadeMax, setFiltroIdadeMax] = useState('');
  const [filtroPesoMin, setFiltroPesoMin] = useState('');
  const [filtroPesoMax, setFiltroPesoMax] = useState('');
  const [filtroEvento, setFiltroEvento] = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [colunaFiltroAberta, setColunaFiltroAberta] = useState('');

  const [todosEventos, setTodosEventos] = useState([]);

  useEffect(() => { carregarAnimais(); carregarSequencias(); carregarEventos(); }, []);

  // Invalidação cruzada: quando outras páginas mudam dados relacionados, recarrega
  useEffect(() => {
    const unsubs = [
      on(EVENTS.ANIMAL_CHANGED, () => { carregarAnimais(); carregarSequencias(); }),
      on(EVENTS.EVENTO_CHANGED, () => { carregarEventos(); carregarAnimais(); }),
      on(EVENTS.MOVIMENTACAO_CHANGED, () => { carregarAnimais(); }),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  // Abrir histórico automaticamente via query ?open=<animal_id> (navegação cruzada)
  useEffect(() => {
    if (!animais.length) return;
    const params = new URLSearchParams(window.location.search);
    const openId = params.get('open');
    if (openId && expandidoId !== openId) {
      const animal = animais.find(a => a.id === openId);
      if (animal) {
        toggleHistorico(animal);
        // Limpa o query param para não reabrir ao recarregar
        const url = new URL(window.location.href);
        url.searchParams.delete('open');
        window.history.replaceState({}, '', url.toString());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animais]);

  const carregarAnimais = async () => {
    try {
      const response = await api.get(`/animais`);
      setAnimais(response.data);
    } catch (error) { toast.error('Erro ao carregar animais'); }
    finally { setLoading(false); }
  };

  const carregarSequencias = async () => {
    try {
      const response = await api.get(`/animais/sequencias`);
      setSequencias(response.data);
    } catch (error) { /* silencioso */ }
  };

  const carregarEventos = async () => {
    try {
      const response = await api.get(`/eventos`);
      setTodosEventos(response.data);
    } catch { /* silencioso */ }
  };

  const toggleHistorico = async (animal) => {
    if (expandidoId === animal.id) {
      setExpandidoId(null);
      setHistoricoData(null);
      setAlertasAnimal([]);
      setHistoricoFiltro(null);
      return;
    }
    setExpandidoId(animal.id);
    setHistoricoLoading(true);
    setHistoricoData(null);
    setAlertasAnimal([]);
    setHistoricoFiltro(null);
    try {
      const [histRes, alertRes] = await Promise.all([
        api.get(`/animais/${animal.id}/historico`),
        api.get('/lembretes/alertas')
      ]);
      setHistoricoData(histRes.data);
      setAlertasAnimal((alertRes.data.alertas || []).filter(a => a.animal_id === animal.id));
    } catch { toast.error('Erro ao carregar historico'); }
    finally { setHistoricoLoading(false); }
  };

  const animaisFiltrados = useMemo(() => {
    return animais.filter(a => {
      if (filtroTag && !a.tag.toLowerCase().includes(filtroTag.toLowerCase())) return false;
      if (filtroPrefixo && !a.tag.toLowerCase().startsWith(filtroPrefixo.toLowerCase())) return false;
      if (filtroTipo && a.tipo !== filtroTipo) return false;
      if (filtroSexo && a.sexo !== filtroSexo) return false;
      if (filtroStatus && a.status !== filtroStatus) return false;
      if (filtroIdadeMin || filtroIdadeMax) {
        const idade = calcularIdade(a.data_nascimento);
        if (!idade) return false;
        if (filtroIdadeMin && idade.totalMeses < parseInt(filtroIdadeMin)) return false;
        if (filtroIdadeMax && idade.totalMeses > parseInt(filtroIdadeMax)) return false;
      }
      if (filtroPesoMin || filtroPesoMax) {
        const peso = a.peso_atual;
        if (!peso && peso !== 0) return false;
        if (filtroPesoMin && peso < parseFloat(filtroPesoMin)) return false;
        if (filtroPesoMax && peso > parseFloat(filtroPesoMax)) return false;
      }
      if (filtroEvento) {
        const eventosAnimal = todosEventos.filter(e => e.animal_id === a.id && e.tipo === filtroEvento);
        if (filtroEvento.startsWith('sem_')) {
          const tipoReal = filtroEvento.replace('sem_', '');
          const tem = todosEventos.some(e => e.animal_id === a.id && e.tipo === tipoReal);
          if (tem) return false;
        } else {
          if (eventosAnimal.length === 0) return false;
        }
      }
      return true;
    });
  }, [animais, filtroTag, filtroPrefixo, filtroTipo, filtroSexo, filtroStatus, filtroIdadeMin, filtroIdadeMax, filtroPesoMin, filtroPesoMax, filtroEvento, todosEventos]);

  const femeas = animais.filter(a => a.sexo === 'femea' && a.status === 'ativo');

  const pag = usePagination(animaisFiltrados, 100);

  const todosSelec = animaisFiltrados.length > 0 && animaisFiltrados.every(a => selecionados.has(a.id));

  const toggleSelecionar = (id) => {
    const novo = new Set(selecionados);
    if (novo.has(id)) novo.delete(id); else novo.add(id);
    setSelecionados(novo);
  };

  const toggleSelecionarTodos = () => {
    if (todosSelec) { setSelecionados(new Set()); }
    else { setSelecionados(new Set(animaisFiltrados.map(a => a.id))); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.tipo || !formData.tag) { toast.error('Preencha tipo e tag'); return; }
    const payload = {
      ...formData, peso_atual: formData.peso_atual ? parseFloat(formData.peso_atual) : null,
      data_nascimento: formData.data_nascimento || null, sexo: formData.sexo || null,
      genitora_id: formData.genitora_id && formData.genitora_id !== 'none' ? formData.genitora_id : null,
      peso_tipo: formData.peso_tipo || 'real'
    };
    try {
      if (editando) { await api.put(`/animais/${editando.id}`, payload); toast.success('Animal atualizado!'); }
      else { await api.post(`/animais`, payload); toast.success('Animal cadastrado!'); }
      setDialogOpen(false); resetForm(); carregarAnimais(); carregarSequencias();
      emit(EVENTS.ANIMAL_CHANGED);
    } catch (error) { const d = error.response?.data?.detail; toast.error(typeof d === 'string' ? d : 'Erro ao salvar animal'); }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (!formBulk.tipo || !formBulk.tag_inicial || !formBulk.quantidade) { toast.error('Preencha tipo, tag inicial e quantidade'); return; }
    try {
      const payload = { ...formBulk, quantidade: parseInt(formBulk.quantidade), peso_atual: formBulk.peso_atual ? parseFloat(formBulk.peso_atual) : null, data_nascimento: formBulk.data_nascimento || null, sexo: formBulk.sexo || null };
      const response = await api.post(`/animais/bulk`, payload);
      toast.success(`${response.data.length} animais cadastrados!`);
      setDialogBulkOpen(false); resetBulkForm(); carregarAnimais(); carregarSequencias();
      emit(EVENTS.ANIMAL_CHANGED);
    } catch (error) { const d = error.response?.data?.detail; toast.error(typeof d === 'string' ? d : 'Erro no cadastro em massa'); }
  };

  const handleEventoEmMassa = async (e) => {
    e.preventDefault();
    if (!formEvento.tipo) { toast.error('Selecione o tipo de evento'); return; }
    if (selecionados.size === 0) { toast.error('Selecione pelo menos um animal'); return; }
    let sucesso = 0;
    for (const animalId of selecionados) {
      try {
        const payload = {
          tipo: formEvento.tipo, animal_id: animalId, data: formEvento.data,
          detalhes: formEvento.detalhes || '', peso: formEvento.peso ? parseFloat(formEvento.peso) : null,
          vacina: formEvento.vacina || null
        };
        await api.post(`/eventos`, payload);
        sucesso++;
      } catch (error) { /* continua */ }
    }
    toast.success(`Evento registrado para ${sucesso} de ${selecionados.size} animais!`);
    setDialogEventoOpen(false); resetEventoForm(); setSelecionados(new Set()); carregarAnimais(); carregarEventos();
    emit(EVENTS.EVENTO_CHANGED);
    emit(EVENTS.ANIMAL_CHANGED);
  };

  const confirmarDelecaoForcada = (deps, label) => {
    const partes = [];
    if (deps.movimentacoes) partes.push(`${deps.movimentacoes} movimentação(ões)`);
    if (deps.eventos) partes.push(`${deps.eventos} evento(s)`);
    if (deps.filhos) partes.push(`${deps.filhos} filho(s) (ficarão sem genitora)`);
    return window.confirm(
      `⚠️ ${label}\n\nDependências encontradas:\n• ${partes.join('\n• ')}\n\nDeseja EXCLUIR EM CASCATA? Movimentações e eventos serão APAGADOS. Filhos terão a genitora removida.`
    );
  };

  const deletarAnimal = async (id, { silent = false } = {}) => {
    try {
      await api.delete(`/animais/${id}`);
      return { ok: true, cascata: false };
    } catch (error) {
      if (error.response?.status === 409) {
        const detail = error.response.data?.detail || {};
        if (silent) return { ok: false, deps: detail };
        const ok = confirmarDelecaoForcada(detail, 'Este animal tem dependências.');
        if (!ok) return { ok: false, cancelado: true };
        await api.delete(`/animais/${id}?force=true`);
        return { ok: true, cascata: true };
      }
      throw error;
    }
  };

  const handleDeleteEmMassa = async () => {
    if (selecionados.size === 0) { toast.error('Selecione pelo menos um animal'); return; }
    if (!window.confirm(`Excluir ${selecionados.size} animais selecionados?`)) return;
    let sucesso = 0, bloqueados = 0, cascata = 0;
    const bloqueadosList = [];
    for (const id of selecionados) {
      try {
        const r = await deletarAnimal(id, { silent: true });
        if (r.ok) { sucesso++; if (r.cascata) cascata++; }
        else { bloqueados++; const a = animais.find(x => x.id === id); bloqueadosList.push(a?.tag || id); }
      } catch (error) { /* continua */ }
    }
    if (sucesso) toast.success(`${sucesso} animal(is) excluído(s)${cascata ? ` (${cascata} em cascata)` : ''}`);
    if (bloqueados) {
      if (window.confirm(`⚠️ ${bloqueados} animal(is) têm dependências (${bloqueadosList.slice(0,5).join(', ')}${bloqueadosList.length>5?'...':''}).\n\nExcluir TODOS EM CASCATA? (movimentações/eventos serão apagados, filhos desvinculados)`)) {
        let forced = 0;
        for (const id of selecionados) {
          const a = animais.find(x => x.id === id);
          if (!a || !bloqueadosList.includes(a.tag)) continue;
          try { await api.delete(`/animais/${id}?force=true`); forced++; } catch { /* continua */ }
        }
        if (forced) toast.success(`${forced} animal(is) excluído(s) em cascata`);
      }
    }
    setSelecionados(new Set()); carregarAnimais(); carregarEventos();
    emit(EVENTS.ANIMAL_CHANGED);
    emit(EVENTS.EVENTO_CHANGED);
    emit(EVENTS.MOVIMENTACAO_CHANGED);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir este animal?')) return;
    try {
      const r = await deletarAnimal(id);
      if (r.cancelado) return;
      if (r.ok) {
        toast.success(r.cascata ? 'Animal excluído em cascata!' : 'Animal excluído!');
        carregarAnimais(); carregarEventos();
        emit(EVENTS.ANIMAL_CHANGED);
        emit(EVENTS.EVENTO_CHANGED);
        emit(EVENTS.MOVIMENTACAO_CHANGED);
      }
    } catch (error) { toast.error('Erro ao excluir'); }
  };

  const resetForm = () => { setFormData({ tipo: '', tag: '', sexo: '', genitora_id: '', data_nascimento: '', peso_atual: '', peso_tipo: 'aferido', observacoes: '' }); setEditando(null); };
  const resetBulkForm = () => { setFormBulk({ tipo: '', tag_inicial: '', quantidade: 2, sexo: '', data_nascimento: '', peso_atual: '', peso_tipo: 'estimado', observacoes: '' }); };
  const resetEventoForm = () => { setFormEvento({ tipo: '', data: new Date().toISOString().split('T')[0], detalhes: '', peso: '', peso_tipo: 'aferido', vacina: '' }); };
  const limparFiltros = () => { setFiltroTag(''); setFiltroPrefixo(''); setFiltroTipo(''); setFiltroSexo(''); setFiltroStatus(''); setFiltroIdadeMin(''); setFiltroIdadeMax(''); setFiltroPesoMin(''); setFiltroPesoMax(''); setFiltroEvento(''); };

  const abrirEdicao = (animal) => {
    setEditando(animal);
    setFormData({ tipo: animal.tipo, tag: animal.tag, sexo: animal.sexo || '', genitora_id: animal.genitora_id || '', data_nascimento: animal.data_nascimento || '', peso_atual: animal.peso_atual || '', peso_tipo: animal.peso_tipo || 'aferido', observacoes: animal.observacoes || '' });
    setDialogOpen(true);
  };

  const getStatusBadge = (s) => ({ ativo: 'bg-[#3B823E] text-white', venda: 'bg-[#2B6CB0] text-white', morte: 'bg-[#C25934] text-white', perda: 'bg-[#D99B29] text-white', inativo: 'bg-[#7A8780] text-white' }[s] || 'bg-[#3B823E] text-white');
  const getGenitoraTag = (id) => { const g = animais.find(a => a.id === id); return g ? g.tag : '-'; };

  const temFiltroAtivo = filtroTag || filtroPrefixo || filtroTipo || filtroSexo || filtroStatus || filtroIdadeMin || filtroIdadeMax || filtroPesoMin || filtroPesoMax || filtroEvento;
  const filtroAtivo = (col) => {
    if (col === 'tag') return !!filtroTag || !!filtroPrefixo;
    if (col === 'tipo') return !!filtroTipo;
    if (col === 'sexo') return !!filtroSexo;
    if (col === 'idade') return !!filtroIdadeMin || !!filtroIdadeMax;
    if (col === 'peso') return !!filtroPesoMin || !!filtroPesoMax;
    if (col === 'status') return !!filtroStatus;
    return false;
  };
  const toggleColunaFiltro = (col) => setColunaFiltroAberta(prev => prev === col ? '' : col);

  if (loading) return <div className="flex items-center justify-center h-64">Carregando...</div>;

  return (
    <div className="fade-in" data-testid="animais-page">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-[#1B2620]">Animais</h1>
          <p className="text-lg text-[#7A8780] mt-2">Gerencie o cadastro de animais ({animaisFiltrados.length} de {animais.length})</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Botões de cadastro removidos. Cadastro de animal agora é feito em Movimentações > Entrada. */}
        </div>
      </div>

      {/* Dialog standalone para edição de animal (acionado pelo ícone Pencil na tabela) */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="animal-edit-dialog">
          <DialogHeader><DialogTitle>{editando ? 'Editar Animal' : 'Novo Animal'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Tipo *</Label><SelectEditavel campo="tipo_animal" value={formData.tipo} onValueChange={(v) => setFormData({...formData, tipo: v})} placeholder="Selecione o tipo" opcoesPadrao={TIPOS_ANIMAIS} /></div>
            <div><Label>Tag *</Label><Input value={formData.tag} onChange={(e) => setFormData({...formData, tag: e.target.value})} required /></div>
            <div><Label>Sexo</Label><Select value={formData.sexo || 'none_sexo'} onValueChange={(v) => setFormData({...formData, sexo: v === 'none_sexo' ? '' : v})}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="none_sexo">Não informado</SelectItem>{SEXOS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Genitora (Mãe)</Label><Select value={formData.genitora_id || 'none'} onValueChange={(v) => setFormData({...formData, genitora_id: v === 'none' ? '' : v})}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="none">Nenhuma</SelectItem>{femeas.map(a => <SelectItem key={a.id} value={a.id}>{a.tag} - {a.tipo}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Data de Nascimento</Label><div className="flex items-center gap-3"><Input type="date" value={formData.data_nascimento} onChange={(e) => setFormData({...formData, data_nascimento: e.target.value})} className="flex-1" />{formData.data_nascimento && <span className="text-sm font-medium text-[#4A6741] whitespace-nowrap">{formatarIdade(formData.data_nascimento)}</span>}</div></div>
            <div><Label>Peso (kg)</Label><div className="flex gap-2"><Input type="number" step="0.01" value={formData.peso_atual} onChange={(e) => setFormData({...formData, peso_atual: e.target.value})} className="flex-1" /><Select value={formData.peso_tipo || 'aferido'} onValueChange={(v) => setFormData({...formData, peso_tipo: v})}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="aferido">Aferido</SelectItem><SelectItem value="estimado">Estimado</SelectItem><SelectItem value="medio">Médio</SelectItem></SelectContent></Select></div></div>
            <div><Label>Observações</Label><Input value={formData.observacoes} onChange={(e) => setFormData({...formData, observacoes: e.target.value})} /></div>
            <div className="flex gap-2 justify-end"><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button type="submit" className="bg-[#4A6741] hover:bg-[#3B5334] text-white">Atualizar</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sequencias de Tags */}
      <div className="mb-4">
        <Button variant="outline" onClick={() => { setMostrarSequencias(!mostrarSequencias); if (!mostrarSequencias) carregarSequencias(); }} className="mb-3">
          <CopySimple size={18} className="mr-2" /> {mostrarSequencias ? 'Ocultar Sequencias' : 'Ver Sequencias de Tags'}
        </Button>
        {mostrarSequencias && sequencias.length > 0 && (
          <div className="bg-white rounded-lg border border-[#E5E3DB] overflow-hidden fade-in">
            <table className="w-full text-sm">
              <thead className="bg-[#F5F0E8]">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold text-[#2F1810]">Prefixo</th>
                  <th className="text-left px-4 py-2 font-semibold text-[#2F1810]">Tipo</th>
                  <th className="text-left px-4 py-2 font-semibold text-[#2F1810]">Primeiro</th>
                  <th className="text-left px-4 py-2 font-semibold text-[#2F1810]">Ultimo</th>
                  <th className="text-left px-4 py-2 font-semibold text-[#2F1810]">Total</th>
                  <th className="text-left px-4 py-2 font-semibold text-[#2F1810]">Ativos</th>
                  <th className="text-left px-4 py-2 font-semibold text-[#4A6741] font-bold">Proxima Tag</th>
                </tr>
              </thead>
              <tbody>
                {sequencias.map((seq, i) => (
                  <tr key={i} onClick={() => { setFiltroPrefixo(filtroPrefixo === seq.prefixo ? '' : seq.prefixo); }} className={`border-t border-[#E8DCC8] cursor-pointer transition-colors ${filtroPrefixo === seq.prefixo ? 'bg-[#E8F0E6] border-l-4 border-l-[#4A6741]' : 'hover:bg-[#FFFDF8]'}`} data-testid={`seq-row-${seq.prefixo}`}>
                    <td className="px-4 py-2 font-mono font-medium">{seq.prefixo}</td>
                    <td className="px-4 py-2">{seq.tipo}</td>
                    <td className="px-4 py-2 font-mono">{seq.prefixo}{String(seq.primeiro).padStart(seq.tamanho_numero, '0')}</td>
                    <td className="px-4 py-2 font-mono">{seq.ultima_tag}</td>
                    <td className="px-4 py-2">{seq.total}</td>
                    <td className="px-4 py-2"><span className="text-[#3B823E] font-medium">{seq.ativos}</span></td>
                    <td className="px-4 py-2 font-mono font-bold text-[#4A6741] bg-[#E8F0E6]/50">{seq.proxima_tag}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {mostrarSequencias && sequencias.length === 0 && (
          <p className="text-gray-500 text-sm">Nenhuma sequencia encontrada. Cadastre animais com tags numericas (ex: BOV-001).</p>
        )}
      </div>

      {/* Badge de filtro ativo + Filtro Historico Eventos */}
      {(temFiltroAtivo || true) && (
        <div className="mb-3 flex items-center gap-2 flex-wrap fade-in" data-testid="filtros-ativos">
          {/* Filtro historico de eventos */}
          <Select value={filtroEvento || 'todos_ev'} onValueChange={(v) => setFiltroEvento(v === 'todos_ev' ? '' : v)}>
            <SelectTrigger className="w-52 h-8 text-xs"><SelectValue placeholder="Historico de eventos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos_ev">Todos (historico)</SelectItem>
              <SelectItem value="vacinacao">Com vacinacao</SelectItem>
              <SelectItem value="tratamento">Com tratamento</SelectItem>
              <SelectItem value="pesagem">Com pesagem</SelectItem>
              <SelectItem value="desmame">Com desmame</SelectItem>
              <SelectItem value="nascimento">Com nascimento</SelectItem>
              <SelectItem value="sem_vacinacao">Sem vacinacao</SelectItem>
              <SelectItem value="sem_tratamento">Sem tratamento</SelectItem>
              <SelectItem value="sem_pesagem">Sem pesagem</SelectItem>
            </SelectContent>
          </Select>
          {temFiltroAtivo && <>
            <span className="text-[10px] text-[#7A8780]">|</span>
            {filtroPrefixo && <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#E8F0E6] text-[#4A6741] text-xs rounded-full font-medium">Prefixo: {filtroPrefixo}<button onClick={() => setFiltroPrefixo('')} className="ml-0.5 hover:text-red-600"><X size={12} /></button></span>}
            {filtroTag && <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#E8F0E6] text-[#4A6741] text-xs rounded-full font-medium">Tag: {filtroTag}<button onClick={() => setFiltroTag('')} className="ml-0.5 hover:text-red-600"><X size={12} /></button></span>}
            {filtroTipo && <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#E8F0E6] text-[#4A6741] text-xs rounded-full font-medium">{filtroTipo}<button onClick={() => setFiltroTipo('')} className="ml-0.5 hover:text-red-600"><X size={12} /></button></span>}
            {filtroSexo && <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#E8F0E6] text-[#4A6741] text-xs rounded-full font-medium">{filtroSexo === 'macho' ? 'Macho' : 'Femea'}<button onClick={() => setFiltroSexo('')} className="ml-0.5 hover:text-red-600"><X size={12} /></button></span>}
            {filtroStatus && <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#E8F0E6] text-[#4A6741] text-xs rounded-full font-medium">{filtroStatus}<button onClick={() => setFiltroStatus('')} className="ml-0.5 hover:text-red-600"><X size={12} /></button></span>}
            {(filtroIdadeMin || filtroIdadeMax) && <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#E8F0E6] text-[#4A6741] text-xs rounded-full font-medium">Idade: {filtroIdadeMin||0}-{filtroIdadeMax||'∞'}m<button onClick={() => { setFiltroIdadeMin(''); setFiltroIdadeMax(''); }} className="ml-0.5 hover:text-red-600"><X size={12} /></button></span>}
            {(filtroPesoMin || filtroPesoMax) && <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#E8F0E6] text-[#4A6741] text-xs rounded-full font-medium">Peso: {filtroPesoMin||0}-{filtroPesoMax||'∞'}kg<button onClick={() => { setFiltroPesoMin(''); setFiltroPesoMax(''); }} className="ml-0.5 hover:text-red-600"><X size={12} /></button></span>}
            {filtroEvento && <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#E8F0E6] text-[#4A6741] text-xs rounded-full font-medium capitalize">{filtroEvento.replace('sem_','sem ')}<button onClick={() => setFiltroEvento('')} className="ml-0.5 hover:text-red-600"><X size={12} /></button></span>}
            <button onClick={limparFiltros} className="text-xs text-[#C25934] hover:underline font-medium">Limpar todos</button>
          </>}
        </div>
      )}

      {/* Acoes em massa */}
      {selecionados.size > 0 && (
        <div className="bg-[#E8F0E6] border border-[#4A6741]/30 rounded-lg p-4 mb-4 flex flex-wrap items-center gap-3 fade-in" data-testid="acoes-massa">
          <span className="text-[#1B2620] font-medium">{selecionados.size} selecionado(s)</span>
          <Dialog open={dialogEventoOpen} onOpenChange={(open) => { setDialogEventoOpen(open); if (!open) resetEventoForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-[#4A6741] hover:bg-[#3B5334] text-white" data-testid="evento-massa-btn">
                <Syringe size={18} className="mr-2" /> Registrar Evento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="evento-massa-dialog">
              <DialogHeader><DialogTitle>Evento em Massa ({selecionados.size} animais)</DialogTitle></DialogHeader>
              <form onSubmit={handleEventoEmMassa} className="space-y-4">
                <div><Label>Tipo de Evento *</Label><Select value={formEvento.tipo} onValueChange={(v) => setFormEvento({...formEvento, tipo: v})}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{TIPOS_EVENTOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Data *</Label><Input type="date" value={formEvento.data} onChange={(e) => setFormEvento({...formEvento, data: e.target.value})} required /></div>
                {formEvento.tipo === 'pesagem' && <div><Label>Peso (kg)</Label><div className="flex gap-2"><Input type="number" step="0.01" value={formEvento.peso} onChange={(e) => setFormEvento({...formEvento, peso: e.target.value})} className="flex-1" /><Select value={formEvento.peso_tipo || 'aferido'} onValueChange={(v) => setFormEvento({...formEvento, peso_tipo: v})}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="aferido">Aferido</SelectItem><SelectItem value="estimado">Estimado</SelectItem><SelectItem value="medio">Medio</SelectItem></SelectContent></Select></div></div>}
                {formEvento.tipo === 'vacinacao' && <div><Label>Vacina</Label><Input value={formEvento.vacina} onChange={(e) => setFormEvento({...formEvento, vacina: e.target.value})} /></div>}
                <div><Label>Detalhes</Label><Input value={formEvento.detalhes} onChange={(e) => setFormEvento({...formEvento, detalhes: e.target.value})} /></div>
                <div className="flex gap-2 justify-end"><Button type="button" variant="outline" onClick={() => setDialogEventoOpen(false)}>Cancelar</Button><Button type="submit" className="bg-[#4A6741] hover:bg-[#3B5334] text-white">Aplicar a {selecionados.size} animais</Button></div>
              </form>
            </DialogContent>
          </Dialog>
          <Button variant="outline" className="border-[#C25934] text-[#C25934] hover:bg-red-50" onClick={handleDeleteEmMassa} data-testid="delete-massa-btn">
            <Trash size={18} className="mr-2" /> Excluir Selecionados
          </Button>
          <Button variant="outline" onClick={() => setSelecionados(new Set())}>Limpar Selecao</Button>
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white rounded-lg border border-[#E5E3DB] overflow-hidden" data-testid="animais-table">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F4F3F0] border-b border-[#E5E3DB]">
              <tr>
                <th className="px-4 py-3 w-10">
                  <button onClick={toggleSelecionarTodos} className="text-[#4A6741]" data-testid="select-all-btn">
                    {todosSelec ? <CheckSquare size={20} weight="fill" /> : <Square size={20} />}
                  </button>
                </th>
                {/* Tag */}
                <th className="px-4 py-3 relative">
                  <button onClick={() => toggleColunaFiltro('tag')} className={`flex items-center gap-1 font-semibold text-sm ${filtroAtivo('tag') ? 'text-[#4A6741]' : 'text-[#1B2620]'} hover:text-[#4A6741] transition-colors`} data-testid="filter-col-tag">
                    Tag <Funnel size={12} weight={filtroAtivo('tag') ? 'fill' : 'regular'} />
                  </button>
                  {colunaFiltroAberta === 'tag' && (
                    <div className="absolute left-0 top-full mt-1 bg-white border border-[#E5E3DB] rounded-lg shadow-xl p-3 z-30 w-52" data-no-drag="true">
                      <Input placeholder="Buscar por tag..." value={filtroTag} onChange={(e) => setFiltroTag(e.target.value)} className="text-xs h-8" autoFocus />
                      <div className="flex justify-between mt-2">
                        <button onClick={() => { setFiltroTag(''); setFiltroPrefixo(''); }} className="text-[10px] text-[#C25934]">Limpar</button>
                        <button onClick={() => setColunaFiltroAberta('')} className="text-[10px] text-[#4A6741] font-medium">OK</button>
                      </div>
                    </div>
                  )}
                </th>
                {/* Tipo */}
                <th className="px-4 py-3 relative">
                  <button onClick={() => toggleColunaFiltro('tipo')} className={`flex items-center gap-1 font-semibold text-sm ${filtroAtivo('tipo') ? 'text-[#4A6741]' : 'text-[#1B2620]'} hover:text-[#4A6741] transition-colors`} data-testid="filter-col-tipo">
                    Tipo <Funnel size={12} weight={filtroAtivo('tipo') ? 'fill' : 'regular'} />
                  </button>
                  {colunaFiltroAberta === 'tipo' && (
                    <div className="absolute left-0 top-full mt-1 bg-white border border-[#E5E3DB] rounded-lg shadow-xl p-2 z-30 w-40">
                      <button onClick={() => { setFiltroTipo(''); setColunaFiltroAberta(''); }} className={`block w-full text-left px-2 py-1.5 rounded text-xs ${!filtroTipo ? 'bg-[#E8F0E6] text-[#4A6741] font-medium' : 'hover:bg-[#F5F0E8]'}`}>Todos</button>
                      {TIPOS_ANIMAIS.map(t => (
                        <button key={t} onClick={() => { setFiltroTipo(t); setColunaFiltroAberta(''); }} className={`block w-full text-left px-2 py-1.5 rounded text-xs ${filtroTipo === t ? 'bg-[#E8F0E6] text-[#4A6741] font-medium' : 'hover:bg-[#F5F0E8]'}`}>{t}</button>
                      ))}
                    </div>
                  )}
                </th>
                {/* Sexo */}
                <th className="px-4 py-3 relative">
                  <button onClick={() => toggleColunaFiltro('sexo')} className={`flex items-center gap-1 font-semibold text-sm ${filtroAtivo('sexo') ? 'text-[#4A6741]' : 'text-[#1B2620]'} hover:text-[#4A6741] transition-colors`} data-testid="filter-col-sexo">
                    Sexo <Funnel size={12} weight={filtroAtivo('sexo') ? 'fill' : 'regular'} />
                  </button>
                  {colunaFiltroAberta === 'sexo' && (
                    <div className="absolute left-0 top-full mt-1 bg-white border border-[#E5E3DB] rounded-lg shadow-xl p-2 z-30 w-36">
                      <button onClick={() => { setFiltroSexo(''); setColunaFiltroAberta(''); }} className={`block w-full text-left px-2 py-1.5 rounded text-xs ${!filtroSexo ? 'bg-[#E8F0E6] text-[#4A6741] font-medium' : 'hover:bg-[#F5F0E8]'}`}>Todos</button>
                      {SEXOS.map(s => (
                        <button key={s.value} onClick={() => { setFiltroSexo(s.value); setColunaFiltroAberta(''); }} className={`block w-full text-left px-2 py-1.5 rounded text-xs ${filtroSexo === s.value ? 'bg-[#E8F0E6] text-[#4A6741] font-medium' : 'hover:bg-[#F5F0E8]'}`}>{s.label}</button>
                      ))}
                    </div>
                  )}
                </th>
                {/* Idade */}
                <th className="px-4 py-3 relative">
                  <button onClick={() => toggleColunaFiltro('idade')} className={`flex items-center gap-1 font-semibold text-sm ${filtroAtivo('idade') ? 'text-[#4A6741]' : 'text-[#1B2620]'} hover:text-[#4A6741] transition-colors`} data-testid="filter-col-idade">
                    Idade <Funnel size={12} weight={filtroAtivo('idade') ? 'fill' : 'regular'} />
                  </button>
                  {colunaFiltroAberta === 'idade' && (
                    <div className="absolute left-0 top-full mt-1 bg-white border border-[#E5E3DB] rounded-lg shadow-xl p-3 z-30 w-48">
                      <p className="text-[10px] text-[#7A8780] mb-1">Faixa em meses</p>
                      <div className="flex gap-1 items-center">
                        <Input type="number" min="0" placeholder="Min" value={filtroIdadeMin} onChange={(e) => setFiltroIdadeMin(e.target.value)} className="text-xs h-7 w-16" />
                        <span className="text-xs text-[#7A8780]">a</span>
                        <Input type="number" min="0" placeholder="Max" value={filtroIdadeMax} onChange={(e) => setFiltroIdadeMax(e.target.value)} className="text-xs h-7 w-16" />
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {[['0-6m',0,6],['6-12m',6,12],['1-2a',12,24],['2+a',24,'']].map(([label,min,max]) => (
                          <button key={label} onClick={() => { setFiltroIdadeMin(String(min)); setFiltroIdadeMax(max === '' ? '' : String(max)); }} className="px-1.5 py-0.5 bg-[#F5F0E8] text-[10px] rounded hover:bg-[#E8F0E6]">{label}</button>
                        ))}
                      </div>
                      <div className="flex justify-between mt-2">
                        <button onClick={() => { setFiltroIdadeMin(''); setFiltroIdadeMax(''); }} className="text-[10px] text-[#C25934]">Limpar</button>
                        <button onClick={() => setColunaFiltroAberta('')} className="text-[10px] text-[#4A6741] font-medium">OK</button>
                      </div>
                    </div>
                  )}
                </th>
                <th className="px-4 py-3 font-semibold text-[#1B2620]">Genitora</th>
                {/* Peso */}
                <th className="px-4 py-3 relative">
                  <button onClick={() => toggleColunaFiltro('peso')} className={`flex items-center gap-1 font-semibold text-sm ${filtroAtivo('peso') ? 'text-[#4A6741]' : 'text-[#1B2620]'} hover:text-[#4A6741] transition-colors`} data-testid="filter-col-peso">
                    Peso <Funnel size={12} weight={filtroAtivo('peso') ? 'fill' : 'regular'} />
                  </button>
                  {colunaFiltroAberta === 'peso' && (
                    <div className="absolute left-0 top-full mt-1 bg-white border border-[#E5E3DB] rounded-lg shadow-xl p-3 z-30 w-48">
                      <p className="text-[10px] text-[#7A8780] mb-1">Faixa em kg</p>
                      <div className="flex gap-1 items-center">
                        <Input type="number" min="0" step="0.01" placeholder="Min" value={filtroPesoMin} onChange={(e) => setFiltroPesoMin(e.target.value)} className="text-xs h-7 w-16" />
                        <span className="text-xs text-[#7A8780]">a</span>
                        <Input type="number" min="0" step="0.01" placeholder="Max" value={filtroPesoMax} onChange={(e) => setFiltroPesoMax(e.target.value)} className="text-xs h-7 w-16" />
                      </div>
                      <div className="flex justify-between mt-2">
                        <button onClick={() => { setFiltroPesoMin(''); setFiltroPesoMax(''); }} className="text-[10px] text-[#C25934]">Limpar</button>
                        <button onClick={() => setColunaFiltroAberta('')} className="text-[10px] text-[#4A6741] font-medium">OK</button>
                      </div>
                    </div>
                  )}
                </th>
                {/* Status */}
                <th className="px-4 py-3 relative">
                  <button onClick={() => toggleColunaFiltro('status')} className={`flex items-center gap-1 font-semibold text-sm ${filtroAtivo('status') ? 'text-[#4A6741]' : 'text-[#1B2620]'} hover:text-[#4A6741] transition-colors`} data-testid="filter-col-status">
                    Status <Funnel size={12} weight={filtroAtivo('status') ? 'fill' : 'regular'} />
                  </button>
                  {colunaFiltroAberta === 'status' && (
                    <div className="absolute left-0 top-full mt-1 bg-white border border-[#E5E3DB] rounded-lg shadow-xl p-2 z-30 w-36">
                      <button onClick={() => { setFiltroStatus(''); setColunaFiltroAberta(''); }} className={`block w-full text-left px-2 py-1.5 rounded text-xs ${!filtroStatus ? 'bg-[#E8F0E6] text-[#4A6741] font-medium' : 'hover:bg-[#F5F0E8]'}`}>Todos</button>
                      {[['ativo','Ativo'],['venda','Vendido'],['morte','Morto'],['perda','Perdido']].map(([v,l]) => (
                        <button key={v} onClick={() => { setFiltroStatus(v); setColunaFiltroAberta(''); }} className={`block w-full text-left px-2 py-1.5 rounded text-xs ${filtroStatus === v ? 'bg-[#E8F0E6] text-[#4A6741] font-medium' : 'hover:bg-[#F5F0E8]'}`}>{l}</button>
                      ))}
                    </div>
                  )}
                </th>
                <th className="px-4 py-3 font-semibold text-[#1B2620]">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {animaisFiltrados.length === 0 ? (
                <tr><td colSpan="9" className="px-6 py-12 text-center text-[#7A8780]">Nenhum animal encontrado</td></tr>
              ) : pag.paginated.map((animal) => (
                <React.Fragment key={animal.id}>
                  <tr onClick={() => toggleHistorico(animal)} className={`table-row border-b border-[#E5E3DB] cursor-pointer transition-colors ${expandidoId === animal.id ? 'bg-[#F5F0E8] border-b-0' : selecionados.has(animal.id) ? 'bg-[#E8F0E6]' : 'hover:bg-[#FDFCFB]'}`}>
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => toggleSelecionar(animal.id)} className="text-[#4A6741]">
                        {selecionados.has(animal.id) ? <CheckSquare size={20} weight="fill" /> : <Square size={20} />}
                      </button>
                    </td>
                    <td className="px-4 py-4 font-medium text-[#1B2620]">{animal.tag}</td>
                    <td className="px-4 py-4 text-[#3A453F]">{animal.tipo}</td>
                    <td className="px-4 py-4 text-[#3A453F]">{animal.sexo === 'macho' ? 'Macho' : animal.sexo === 'femea' ? 'Femea' : '-'}</td>
                    <td className="px-4 py-4 text-[#3A453F]">{formatarIdade(animal.data_nascimento)}</td>
                    <td className="px-4 py-4 text-[#3A453F]">{animal.genitora_id ? getGenitoraTag(animal.genitora_id) : '-'}</td>
                    <td className="px-4 py-4 text-[#3A453F]">{animal.peso_atual ? <span className="flex items-center gap-1">{animal.peso_atual} kg <span className={`text-[10px] font-medium px-1 rounded ${animal.peso_tipo === 'estimado' ? 'bg-[#D99B29]/15 text-[#D99B29]' : animal.peso_tipo === 'medio' ? 'bg-[#2B6CB0]/15 text-[#2B6CB0]' : 'bg-[#3B823E]/15 text-[#3B823E]'}`}>{animal.peso_tipo === 'estimado' ? 'EST' : animal.peso_tipo === 'medio' ? 'MED' : 'AFR'}</span></span> : '-'}</td>
                    <td className="px-4 py-4"><span className={`px-2 py-1 rounded-md text-xs font-medium ${getStatusBadge(animal.status)}`}>{animal.status}</span></td>
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <button onClick={() => abrirEdicao(animal)} className="text-[#4A6741] hover:text-[#3B5334]"><Pencil size={18} /></button>
                        <button onClick={() => handleDelete(animal.id)} className="text-[#C25934] hover:text-[#A64B2B]"><Trash size={18} /></button>
                      </div>
                    </td>
                  </tr>
                  {/* Historico inline expandido */}
                  {expandidoId === animal.id && (
                    <tr className="bg-[#FAFAF7]">
                      <td colSpan="9" className="px-6 py-4 border-b border-[#E5E3DB]">
                        {historicoLoading ? (
                          <div className="flex justify-center py-6"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#4A6741]"></div></div>
                        ) : historicoData ? (
                          <div className="space-y-4" data-testid="historico-inline">
                            {/* Genealogia: genitora + filhos */}
                            {(historicoData.genitora || (historicoData.filhos && historicoData.filhos.length > 0)) && (
                              <div className="bg-white rounded-lg border border-[#E5E3DB] p-3" data-testid="genealogia-box">
                                <p className="text-xs font-bold text-[#4A6741] uppercase tracking-wider mb-2">Genealogia</p>
                                {historicoData.genitora && (
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-[10px] text-[#7A8780] uppercase tracking-wider">Mãe:</span>
                                    <button
                                      onClick={() => { setExpandidoId(null); setTimeout(() => toggleHistorico(historicoData.genitora), 50); }}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FFF3E0] text-[#B45309] rounded font-mono text-xs font-medium hover:underline"
                                      data-testid="link-genitora"
                                      title="Abrir histórico da mãe"
                                    >
                                      {historicoData.genitora.tag} · {historicoData.genitora.tipo}
                                    </button>
                                  </div>
                                )}
                                {historicoData.filhos && historicoData.filhos.length > 0 && (
                                  <div>
                                    <span className="text-[10px] text-[#7A8780] uppercase tracking-wider">Filhos ({historicoData.total_filhos}):</span>
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                      {historicoData.filhos.map(f => (
                                        <button
                                          key={f.id}
                                          onClick={() => { setExpandidoId(null); setTimeout(() => toggleHistorico(f), 50); }}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#E8F0E6] text-[#4A6741] rounded font-mono text-xs hover:bg-[#4A6741] hover:text-white transition-colors"
                                          data-testid={`link-filho-${f.tag}`}
                                          title={`${f.sexo === 'femea' ? 'Fêmea' : f.sexo === 'macho' ? 'Macho' : 'Sem sexo'} · ${f.status}`}
                                        >
                                          {f.tag}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Alertas Pendentes (Eventos Agendados) */}
                            {alertasAnimal.length > 0 && (
                              <div>
                                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                                  <Syringe size={14} weight="fill" /> Pendentes / Agendados ({alertasAnimal.length})
                                </p>
                                <div className="space-y-1.5">
                                  {alertasAnimal.map((alerta, i) => (
                                    <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${alerta.urgente ? 'border-red-200 bg-red-50/70' : 'border-amber-200 bg-amber-50/70'}`}>
                                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${alerta.urgente ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                                      <div className="flex-1 min-w-0">
                                        <span className="text-xs font-medium capitalize text-[#2F1810]">{alerta.tipo_acao}</span>
                                        {alerta.mensagem && <span className="text-xs text-[#7A8780] ml-2">{alerta.mensagem}</span>}
                                      </div>
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${alerta.urgente ? 'bg-red-200 text-red-700' : 'bg-amber-200 text-amber-700'}`}>
                                        {alerta.urgente ? 'Nunca feito' : 'Vencido'}
                                      </span>
                                      {alerta.ultimo_evento && <span className="text-[10px] text-[#7A8780]">Ultimo: {new Date(alerta.ultimo_evento + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Historico Realizado - agrupado por tipo + badges clicaveis */}
                            <div>
                              <div className="flex items-center gap-2 flex-wrap mb-2">
                                <p className="text-xs font-bold text-[#4A6741] uppercase tracking-wider">
                                  Historico ({historicoData.total_eventos} evento(s) · {historicoData.total_movimentacoes} mov.)
                                </p>
                                {historicoFiltro && (
                                  <button
                                    onClick={() => setHistoricoFiltro(null)}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-[#4A6741] text-white rounded-full hover:bg-[#3B5334]"
                                    data-testid="historico-filtro-limpar"
                                    title="Remover filtro"
                                  >
                                    Filtro: {historicoFiltro.label} ✕
                                  </button>
                                )}
                              </div>
                              {historicoData.historico.length === 0 ? (
                                <p className="text-xs text-[#7A8780] py-2">Nenhum registro</p>
                              ) : (() => {
                                // Aplica filtro
                                const filtrado = historicoFiltro
                                  ? historicoData.historico.filter((it) => {
                                      const f = historicoFiltro;
                                      if (f.kind === 'subtipo') return (it.subtipo || '').toLowerCase() === f.value.toLowerCase();
                                      if (f.kind === 'tipoRegistro') return it.tipo === f.value;
                                      if (f.kind === 'vacina') return (it.vacina || '').toLowerCase() === f.value.toLowerCase();
                                      if (f.kind === 'valor') return String(it.valor) === f.value;
                                      if (f.kind === 'peso') return String(it.peso) === f.value;
                                      return true;
                                    })
                                  : historicoData.historico;

                                if (filtrado.length === 0) {
                                  return <p className="text-xs text-[#7A8780] py-2">Nenhum registro para o filtro aplicado.</p>;
                                }

                                // Agrupa por subtipo
                                const grupos = filtrado.reduce((acc, it) => {
                                  const key = (it.subtipo || 'outro').toLowerCase();
                                  (acc[key] = acc[key] || []).push(it);
                                  return acc;
                                }, {});

                                // Ordena grupos por data do item mais recente (desc)
                                const gruposOrdenados = Object.entries(grupos).sort((a, b) => {
                                  const lastA = a[1].reduce((m, it) => (it.data && it.data > m ? it.data : m), '');
                                  const lastB = b[1].reduce((m, it) => (it.data && it.data > m ? it.data : m), '');
                                  return lastB.localeCompare(lastA);
                                });

                                const handleBadge = (kind, value, label) => (e) => {
                                  e.stopPropagation();
                                  if (historicoFiltro && historicoFiltro.kind === kind && historicoFiltro.value === value) {
                                    setHistoricoFiltro(null);
                                  } else {
                                    setHistoricoFiltro({ kind, value, label });
                                  }
                                };

                                const isActive = (kind, value) => historicoFiltro && historicoFiltro.kind === kind && historicoFiltro.value === value;

                                return (
                                  <div className="space-y-3">
                                    {gruposOrdenados.map(([subtipo, items]) => (
                                      <div key={subtipo} className="bg-white rounded-lg border border-[#E5E3DB] overflow-hidden" data-testid={`historico-grupo-${subtipo}`}>
                                        <div className="flex items-center justify-between px-3 py-1.5 bg-[#F5F0E8] border-b border-[#E5E3DB]">
                                          <button
                                            onClick={handleBadge('subtipo', subtipo, subtipo)}
                                            className={`text-[11px] font-bold uppercase tracking-wider transition-colors ${isActive('subtipo', subtipo) ? 'text-[#4A6741] underline' : 'text-[#2F1810] hover:text-[#4A6741]'}`}
                                            title="Clique para filtrar só este tipo"
                                            data-testid={`historico-grupo-titulo-${subtipo}`}
                                          >
                                            {subtipo}
                                          </button>
                                          <span className="text-[10px] text-[#7A8780]">{items.length} registro(s)</span>
                                        </div>
                                        <div className="divide-y divide-[#F1EEE6]">
                                          {items.map((item, i) => (
                                            <div key={i} className={`flex items-start gap-3 px-3 py-2 ${item.tipo === 'evento' ? '' : 'bg-blue-50/30'}`}>
                                              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${item.tipo === 'evento' ? 'bg-[#4A6741]' : 'bg-[#2B6CB0]'}`}></div>
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                  <button
                                                    onClick={handleBadge('tipoRegistro', item.tipo, item.tipo === 'evento' ? 'Evento' : 'Mov.')}
                                                    className={`text-[10px] px-1 py-0.5 rounded transition-colors ${item.tipo === 'evento' ? 'bg-[#4A6741]/10 text-[#4A6741] hover:bg-[#4A6741]/20' : 'bg-[#2B6CB0]/10 text-[#2B6CB0] hover:bg-[#2B6CB0]/20'} ${isActive('tipoRegistro', item.tipo) ? 'ring-1 ring-offset-1 ring-[#4A6741]' : ''}`}
                                                    title="Filtrar por tipo de registro"
                                                  >
                                                    {item.tipo === 'evento' ? 'Evento' : 'Mov.'}
                                                  </button>
                                                  {item.vacina && (
                                                    <button
                                                      onClick={handleBadge('vacina', item.vacina, item.vacina)}
                                                      className={`text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded transition-colors hover:bg-green-200 ${isActive('vacina', item.vacina) ? 'ring-1 ring-offset-1 ring-green-600' : ''}`}
                                                      title={`Filtrar por vacina: ${item.vacina}`}
                                                    >
                                                      {item.vacina}
                                                    </button>
                                                  )}
                                                  {item.peso && (
                                                    <button
                                                      onClick={handleBadge('peso', String(item.peso), `${item.peso} kg`)}
                                                      className={`text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded transition-colors hover:bg-amber-200 ${isActive('peso', String(item.peso)) ? 'ring-1 ring-offset-1 ring-amber-600' : ''}`}
                                                      title="Filtrar por este peso"
                                                    >
                                                      {item.peso} kg
                                                    </button>
                                                  )}
                                                  {item.valor && (
                                                    <button
                                                      onClick={handleBadge('valor', String(item.valor), `R$ ${parseFloat(item.valor).toFixed(2)}`)}
                                                      className={`text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded transition-colors hover:bg-blue-200 ${isActive('valor', String(item.valor)) ? 'ring-1 ring-offset-1 ring-blue-600' : ''}`}
                                                      title="Filtrar por este valor"
                                                    >
                                                      R$ {parseFloat(item.valor).toFixed(2)}
                                                    </button>
                                                  )}
                                                </div>
                                                {item.detalhes && <p className="text-[10px] text-[#7A8780] mt-0.5">{item.detalhes}</p>}
                                              </div>
                                              <span className="text-[10px] text-[#7A8780] flex-shrink-0">{item.data ? new Date(item.data + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationBar {...pag} label="animais" />
      </div>
    </div>
  );
}
