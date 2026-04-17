import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { Plus, Trash, Pencil, Bell, BellRinging, ToggleLeft, ToggleRight, Warning, CalendarBlank, Syringe, ArrowClockwise, Check, X } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';

const TIPOS_ACAO = ['vacinacao', 'pesagem', 'tratamento', 'desmame', 'vermifugacao', 'exame', 'outro'];
const TIPOS_ANIMAIS = ['Bovino', 'Suino', 'Ovino', 'Caprino', 'Equino', 'Aves', 'Outros'];

export default function Lembretes() {
  const [lembretes, setLembretes] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [tab, setTab] = useState('alertas');
  const [filtroTipoAlerta, setFiltroTipoAlerta] = useState('');

  // Calendario
  const [tiposPadrao, setTiposPadrao] = useState({});
  const [calendarioSelecionado, setCalendarioSelecionado] = useState('');
  const [protocolos, setProtocolos] = useState([]);
  const [calLoading, setCalLoading] = useState(false);
  const [calPersonalizado, setCalPersonalizado] = useState(false);
  const [editandoProtocolo, setEditandoProtocolo] = useState(null);
  const [protoForm, setProtoForm] = useState({ nome: '', tipo_acao: 'vacinacao', mensagem: '', recorrencia_dias: '', idade_min_meses: '', idade_max_meses: '', sexo: '' });

  const [form, setForm] = useState({
    nome: '', tipo_acao: '', mensagem: '', recorrencia_dias: '', ativo: true,
    condicoes: { tipo_animal: '', sexo: '', idade_min_meses: '', idade_max_meses: '', peso_min: '', peso_max: '', status: 'ativo' }
  });

  useEffect(() => { carregarDados(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const carregarDados = async () => {
    try {
      const [lembRes, alertRes] = await Promise.all([
        api.get('/lembretes'), api.get('/lembretes/alertas')
      ]);
      setLembretes(lembRes.data);
      setAlertas(alertRes.data.alertas || []);
    } catch (error) { toast.error('Erro ao carregar lembretes'); }
    finally { setLoading(false); }
  };

  const carregarTiposPadrao = async () => {
    try {
      const res = await api.get('/calendario-vacinacao/tipos-padrao/listar');
      setTiposPadrao(res.data);
    } catch { /* silent */ }
  };

  const carregarCalendario = async (tipo) => {
    setCalendarioSelecionado(tipo);
    setCalLoading(true);
    try {
      const res = await api.get(`/calendario-vacinacao/${tipo}`);
      setProtocolos(res.data.protocolos || []);
      setCalPersonalizado(res.data.personalizado || false);
    } catch { toast.error('Erro ao carregar calendario'); }
    finally { setCalLoading(false); }
  };

  useEffect(() => {
    if (tab === 'calendario') { carregarTiposPadrao(); }
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetForm = () => setForm({
    nome: '', tipo_acao: '', mensagem: '', recorrencia_dias: '', ativo: true,
    condicoes: { tipo_animal: '', sexo: '', idade_min_meses: '', idade_max_meses: '', peso_min: '', peso_max: '', status: 'ativo' }
  });

  const handleSubmit = async () => {
    if (!form.nome || !form.tipo_acao) { toast.error('Preencha nome e tipo de acao'); return; }
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
      if (editando) {
        await api.put(`/lembretes/${editando.id}`, payload);
        toast.success('Lembrete atualizado!');
      } else {
        await api.post('/lembretes', payload);
        toast.success('Lembrete criado!');
      }
      setDialogOpen(false); setEditando(null); resetForm(); carregarDados();
    } catch (error) { toast.error(error.response?.data?.detail || 'Erro ao salvar'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir este lembrete?')) return;
    try { await api.delete(`/lembretes/${id}`); toast.success('Lembrete excluido!'); carregarDados(); }
    catch { toast.error('Erro ao excluir'); }
  };

  const toggleAtivo = async (lembrete) => {
    try {
      const payload = {
        nome: lembrete.nome, tipo_acao: lembrete.tipo_acao, mensagem: lembrete.mensagem || '',
        recorrencia_dias: lembrete.recorrencia_dias, ativo: !lembrete.ativo,
        condicoes: lembrete.condicoes || {}
      };
      await api.put(`/lembretes/${lembrete.id}`, payload);
      toast.success(lembrete.ativo ? 'Lembrete desativado' : 'Lembrete ativado');
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

  // ============= CALENDARIO =============
  const aplicarCalendario = async (tipo) => {
    try {
      const res = await api.post(`/calendario-vacinacao/aplicar/${tipo}`);
      toast.success(`${res.data.criados} lembrete(s) criado(s)${res.data.existentes > 0 ? `, ${res.data.existentes} ja existiam` : ''}`);
      carregarDados();
      carregarTiposPadrao();
    } catch { toast.error('Erro ao aplicar calendario'); }
  };

  const salvarProtocolos = async () => {
    if (!calendarioSelecionado) return;
    try {
      await api.put(`/calendario-vacinacao/${calendarioSelecionado}`, { protocolos });
      // Verificar se há lembretes auto-gerados órfãos (dry-run)
      try {
        const check = await api.post(`/calendario-vacinacao/${calendarioSelecionado}/sincronizar-lembretes?desativar=false`);
        if (check.data?.total_orfaos > 0) {
          const nomes = (check.data.orfaos || []).map(o => o.nome.replace('[Auto] ', '').replace(` - ${calendarioSelecionado}`, '')).slice(0, 5).join(', ');
          const extra = check.data.orfaos.length > 5 ? '...' : '';
          if (window.confirm(`✅ Calendário salvo!\n\n⚠️ ${check.data.total_orfaos} lembrete(s) auto-gerado(s) ficaram órfãos (protocolos removidos): ${nomes}${extra}\n\nDeseja DESATIVAR esses lembretes órfãos?`)) {
            const res = await api.post(`/calendario-vacinacao/${calendarioSelecionado}/sincronizar-lembretes?desativar=true`);
            toast.success(`Calendário salvo e ${res.data.desativados} lembrete(s) órfão(s) desativado(s)!`);
            carregarDados();
          } else {
            toast.success('Calendário salvo (lembretes órfãos mantidos ativos)');
          }
        } else {
          toast.success('Calendario salvo!');
        }
      } catch { toast.success('Calendario salvo!'); }
      setCalPersonalizado(true);
      carregarTiposPadrao();
    } catch { toast.error('Erro ao salvar'); }
  };

  const resetarCalendario = async () => {
    if (!calendarioSelecionado) return;
    if (!window.confirm('Resetar para o calendario padrao? Isso apaga personalizacoes.')) return;
    try {
      await api.delete(`/calendario-vacinacao/${calendarioSelecionado}`);
      toast.success('Resetado para padrao!');
      carregarCalendario(calendarioSelecionado);
      carregarTiposPadrao();
    } catch { toast.error('Erro ao resetar'); }
  };

  const addProtocolo = () => {
    if (!protoForm.nome) { toast.error('Preencha o nome'); return; }
    const novo = {
      nome: protoForm.nome,
      tipo_acao: protoForm.tipo_acao || 'vacinacao',
      mensagem: protoForm.mensagem || '',
      recorrencia_dias: protoForm.recorrencia_dias ? parseInt(protoForm.recorrencia_dias) : 0,
      idade_min_meses: protoForm.idade_min_meses ? parseInt(protoForm.idade_min_meses) : null,
      idade_max_meses: protoForm.idade_max_meses ? parseInt(protoForm.idade_max_meses) : null,
      sexo: protoForm.sexo || null,
    };
    if (editandoProtocolo !== null) {
      const updated = [...protocolos];
      updated[editandoProtocolo] = novo;
      setProtocolos(updated);
      setEditandoProtocolo(null);
    } else {
      setProtocolos([...protocolos, novo]);
    }
    setProtoForm({ nome: '', tipo_acao: 'vacinacao', mensagem: '', recorrencia_dias: '', idade_min_meses: '', idade_max_meses: '', sexo: '' });
  };

  const editarProtocolo = (i) => {
    const p = protocolos[i];
    setProtoForm({
      nome: p.nome, tipo_acao: p.tipo_acao || 'vacinacao', mensagem: p.mensagem || '',
      recorrencia_dias: p.recorrencia_dias || '', idade_min_meses: p.idade_min_meses || '',
      idade_max_meses: p.idade_max_meses || '', sexo: p.sexo || ''
    });
    setEditandoProtocolo(i);
  };

  const removerProtocolo = (i) => {
    setProtocolos(protocolos.filter((_, idx) => idx !== i));
  };

  const formatRecorrencia = (dias) => {
    if (!dias || dias === 0) return 'Dose unica';
    if (dias >= 365) return `${Math.round(dias / 365)} ano(s)`;
    if (dias >= 30) return `${Math.round(dias / 30)} mes(es)`;
    return `${dias} dias`;
  };

  const alertasFiltrados = filtroTipoAlerta ? alertas.filter(a => a.tipo_acao === filtroTipoAlerta) : alertas;
  const tiposAlerta = [...new Set(alertas.map(a => a.tipo_acao))].sort();

  const formatCondicoes = (c) => {
    if (!c) return '-';
    const parts = [];
    if (c.tipo_animal) parts.push(c.tipo_animal);
    if (c.sexo) parts.push(c.sexo === 'macho' ? 'Machos' : 'Femeas');
    if (c.idade_min_meses || c.idade_max_meses) {
      const min = c.idade_min_meses || 0;
      const max = c.idade_max_meses || '∞';
      parts.push(`Idade: ${min}-${max} meses`);
    }
    if (c.peso_min || c.peso_max) {
      const min = c.peso_min || 0;
      const max = c.peso_max || '∞';
      parts.push(`Peso: ${min}-${max} kg`);
    }
    return parts.length > 0 ? parts.join(' | ') : 'Todos os animais';
  };

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4A6741]"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2F1810]" data-testid="lembretes-title">Lembretes</h1>
          {alertas.length > 0 && (
            <p className="text-sm text-amber-600 font-medium mt-1">
              <Warning size={16} className="inline mr-1" weight="fill" />
              {alertas.length} alerta(s) pendente(s)
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <div className="flex bg-[#F5F0E8] rounded-lg p-0.5">
            <button onClick={() => setTab('alertas')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'alertas' ? 'bg-white shadow-sm text-[#2F1810]' : 'text-[#7A8780]'}`}>
              <BellRinging size={16} className="inline mr-1" /> Alertas {alertas.length > 0 && <span className="bg-amber-500 text-white text-xs px-1.5 rounded-full ml-1">{alertas.length}</span>}
            </button>
            <button onClick={() => setTab('config')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'config' ? 'bg-white shadow-sm text-[#2F1810]' : 'text-[#7A8780]'}`}>
              <Bell size={16} className="inline mr-1" /> Config
            </button>
            <button onClick={() => setTab('calendario')} data-testid="tab-calendario" className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'calendario' ? 'bg-white shadow-sm text-[#2F1810]' : 'text-[#7A8780]'}`}>
              <CalendarBlank size={16} className="inline mr-1" /> Calendario
            </button>
          </div>
        </div>
      </div>

      {/* ============= ALERTAS ============= */}
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
              <p className="text-sm text-[#7A8780] mt-1">Todos os animais estao em dia! Configure lembretes na aba Config ou aplique um Calendario.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {alertasFiltrados.map((alerta, i) => (
                <div key={i} className={`bg-white rounded-lg border p-4 flex items-center justify-between ${alerta.urgente ? 'border-red-300 bg-red-50/50' : 'border-amber-300 bg-amber-50/50'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${alerta.urgente ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                      <BellRinging size={20} weight="fill" />
                    </div>
                    <div>
                      <p className="font-medium text-[#2F1810]">
                        <span className="font-bold">{alerta.animal_tag}</span>
                        <span className="text-[#7A8780] text-sm ml-2">({alerta.animal_tipo})</span>
                      </p>
                      <p className="text-sm text-[#7A8780]">
                        <span className="capitalize font-medium text-[#2F1810]">{alerta.tipo_acao}</span>
                        {alerta.mensagem && ` — ${alerta.mensagem}`}
                      </p>
                      <p className="text-xs text-[#7A8780] mt-0.5">
                        {alerta.ultimo_evento ? `Ultimo: ${new Date(alerta.ultimo_evento + 'T00:00:00').toLocaleDateString('pt-BR')}` : 'Nunca realizado'}
                        {' · '}{alerta.lembrete_nome}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${alerta.urgente ? 'bg-red-200 text-red-700' : 'bg-amber-200 text-amber-700'}`}>
                    {alerta.urgente ? 'Nunca feito' : 'Vencido'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============= CONFIGURACOES ============= */}
      {tab === 'config' && (
        <div>
          <div className="flex justify-end mb-4">
            <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) { setEditando(null); resetForm(); } }}>
              <DialogTrigger asChild>
                <Button className="bg-[#4A6741] hover:bg-[#3B5233]" onClick={() => { setEditando(null); resetForm(); }}>
                  <Plus className="mr-2" size={18} /> Novo Lembrete
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{editando ? 'Editar Lembrete' : 'Novo Lembrete'}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Nome do Lembrete *</Label>
                      <Input placeholder="Ex: Vacinacao aftosa" value={form.nome} onChange={(e) => setForm({...form, nome: e.target.value})} />
                    </div>
                    <div>
                      <Label>Tipo de Acao *</Label>
                      <Select value={form.tipo_acao || 'none'} onValueChange={(v) => setForm({...form, tipo_acao: v === 'none' ? '' : v})}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" disabled>Selecione</SelectItem>
                          {TIPOS_ACAO.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Mensagem / Observacao</Label>
                    <Input placeholder="Ex: Aplicar vacina contra aftosa" value={form.mensagem} onChange={(e) => setForm({...form, mensagem: e.target.value})} />
                  </div>
                  <div>
                    <Label>Recorrencia (dias)</Label>
                    <Input type="number" placeholder="Ex: 180 (a cada 6 meses)" value={form.recorrencia_dias} onChange={(e) => setForm({...form, recorrencia_dias: e.target.value})} />
                  </div>
                  <div className="border-t border-[#E8DCC8] pt-4">
                    <p className="text-sm font-semibold text-[#2F1810] mb-3">Condicoes (quais animais?)</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Tipo de Animal</Label>
                        <Select value={form.condicoes.tipo_animal || 'todos_tipo'} onValueChange={(v) => setForm({...form, condicoes: {...form.condicoes, tipo_animal: v === 'todos_tipo' ? '' : v}})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos_tipo">Todos</SelectItem>
                            {TIPOS_ANIMAIS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Sexo</Label>
                        <Select value={form.condicoes.sexo || 'todos_sexo'} onValueChange={(v) => setForm({...form, condicoes: {...form.condicoes, sexo: v === 'todos_sexo' ? '' : v}})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos_sexo">Todos</SelectItem>
                            <SelectItem value="macho">Macho</SelectItem>
                            <SelectItem value="femea">Femea</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label className="text-xs">Idade min (meses)</Label><Input type="number" min="0" value={form.condicoes.idade_min_meses} onChange={(e) => setForm({...form, condicoes: {...form.condicoes, idade_min_meses: e.target.value}})} /></div>
                      <div><Label className="text-xs">Idade max (meses)</Label><Input type="number" min="0" value={form.condicoes.idade_max_meses} onChange={(e) => setForm({...form, condicoes: {...form.condicoes, idade_max_meses: e.target.value}})} /></div>
                    </div>
                  </div>
                  <Button className="w-full bg-[#4A6741] hover:bg-[#3B5233]" onClick={handleSubmit}>
                    {editando ? 'Atualizar' : 'Criar Lembrete'}
                  </Button>
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
                  <th className="text-left px-4 py-3 font-semibold text-[#2F1810]">Acao</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#2F1810]">Condicoes</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#2F1810]">Recorrencia</th>
                  <th className="text-right px-4 py-3 font-semibold text-[#2F1810]">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {lembretes.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-500">Nenhum lembrete configurado. Use a aba Calendario para gerar automaticamente!</td></tr>
                ) : lembretes.map((l) => (
                  <tr key={l.id} className={`border-t border-[#E8DCC8] hover:bg-[#FFFDF8] ${!l.ativo ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleAtivo(l)} className="text-lg">
                        {l.ativo ? <ToggleRight size={28} className="text-[#4A6741]" weight="fill" /> : <ToggleLeft size={28} className="text-gray-400" weight="fill" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {l.nome}
                      {l.auto_gerado && <span className="ml-1 text-[10px] bg-[#4A6741]/10 text-[#4A6741] px-1.5 py-0.5 rounded-full">Auto</span>}
                    </td>
                    <td className="px-4 py-3 capitalize">{l.tipo_acao}</td>
                    <td className="px-4 py-3 text-xs text-[#7A8780] max-w-[250px]">{formatCondicoes(l.condicoes)}</td>
                    <td className="px-4 py-3">{l.recorrencia_dias ? `A cada ${l.recorrencia_dias} dias` : 'Unica vez'}</td>
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

      {/* ============= CALENDARIO VACINACAO ============= */}
      {tab === 'calendario' && (
        <div className="space-y-6" data-testid="calendario-tab">
          <div className="bg-white rounded-xl border border-[#E8DCC8] p-6">
            <div className="flex items-center gap-3 mb-4">
              <Syringe size={24} className="text-[#4A6741]" weight="fill" />
              <div>
                <h2 className="text-lg font-bold text-[#2F1810]">Calendario de Vacinacao Padrao</h2>
                <p className="text-sm text-[#7A8780]">Protocolos sanitarios pre-configurados por tipo de animal. Aplique para gerar lembretes automaticamente.</p>
              </div>
            </div>

            {/* Grid de tipos de animais */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              {TIPOS_ANIMAIS.filter(t => t !== 'Outros').map(tipo => {
                const info = tiposPadrao[tipo] || {};
                return (
                  <button
                    key={tipo}
                    onClick={() => carregarCalendario(tipo)}
                    data-testid={`cal-tipo-${tipo.toLowerCase()}`}
                    className={`p-4 rounded-xl border-2 transition-all text-center hover:shadow-md ${
                      calendarioSelecionado === tipo
                        ? 'border-[#4A6741] bg-[#E8F0E6] shadow-md'
                        : 'border-[#E5E3DB] bg-white hover:border-[#4A6741]/50'
                    }`}
                  >
                    <p className="font-bold text-[#2F1810] text-sm">{tipo}</p>
                    <p className="text-xs text-[#7A8780] mt-1">{info.total_protocolos || '?'} protocolo(s)</p>
                    {info.lembretes_ativos > 0 && (
                      <p className="text-xs text-[#4A6741] font-medium mt-1">
                        <Check size={12} className="inline" /> {info.lembretes_ativos} ativo(s)
                      </p>
                    )}
                    {info.personalizado && (
                      <span className="text-[9px] bg-[#D99B29]/15 text-[#D99B29] px-1.5 py-0.5 rounded-full font-medium">Personalizado</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Detalhes do calendario selecionado */}
            {calendarioSelecionado && (
              <div className="border-t border-[#E8DCC8] pt-4" data-testid="calendario-detalhe">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-[#2F1810]">
                    {calendarioSelecionado}
                    {calPersonalizado && <span className="ml-2 text-xs bg-[#D99B29]/15 text-[#D99B29] px-2 py-0.5 rounded-full">Personalizado</span>}
                  </h3>
                  <div className="flex gap-2">
                    {calPersonalizado && (
                      <Button variant="outline" size="sm" onClick={resetarCalendario} className="text-xs">
                        <ArrowClockwise size={14} className="mr-1" /> Resetar Padrao
                      </Button>
                    )}
                    <Button size="sm" className="bg-[#4A6741] hover:bg-[#3B5233] text-xs" onClick={() => aplicarCalendario(calendarioSelecionado)} data-testid="aplicar-calendario-btn">
                      <Check size={14} className="mr-1" /> Aplicar Lembretes
                    </Button>
                  </div>
                </div>

                {calLoading ? (
                  <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#4A6741]"></div></div>
                ) : (
                  <>
                    {/* Lista de protocolos */}
                    <div className="space-y-2 mb-4">
                      {protocolos.length === 0 ? (
                        <p className="text-center py-4 text-[#7A8780]">Nenhum protocolo configurado</p>
                      ) : protocolos.map((p, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-[#FAFAF7] rounded-lg border border-[#E5E3DB] hover:border-[#4A6741]/30 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${p.tipo_acao === 'vacinacao' ? 'bg-[#4A6741]/10 text-[#4A6741]' : p.tipo_acao === 'vermifugacao' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                              <Syringe size={14} weight="fill" />
                            </div>
                            <div>
                              <p className="font-medium text-sm text-[#2F1810]">{p.nome}</p>
                              <div className="flex flex-wrap gap-1.5 mt-0.5">
                                <span className="text-[10px] bg-[#4A6741]/10 text-[#4A6741] px-1.5 py-0.5 rounded-full capitalize">{p.tipo_acao}</span>
                                <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">{formatRecorrencia(p.recorrencia_dias)}</span>
                                {p.sexo && <span className="text-[10px] bg-pink-50 text-pink-600 px-1.5 py-0.5 rounded-full">{p.sexo === 'femea' ? 'Femeas' : 'Machos'}</span>}
                                {(p.idade_min_meses || p.idade_max_meses) && (
                                  <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full">
                                    {p.idade_min_meses || 0}–{p.idade_max_meses || '∞'} meses
                                  </span>
                                )}
                              </div>
                              {p.mensagem && <p className="text-xs text-[#7A8780] mt-0.5">{p.mensagem}</p>}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => editarProtocolo(i)} className="p-1.5 rounded hover:bg-[#E5E3DB] text-[#4A6741]"><Pencil size={14} /></button>
                            <button onClick={() => removerProtocolo(i)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash size={14} /></button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Form adicionar/editar protocolo */}
                    <div className="bg-[#F5F0E8] rounded-lg p-4">
                      <p className="text-sm font-semibold text-[#2F1810] mb-3">{editandoProtocolo !== null ? 'Editar Protocolo' : 'Adicionar Protocolo'}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div className="col-span-2">
                          <Input placeholder="Nome (ex: Febre Aftosa)" value={protoForm.nome} onChange={(e) => setProtoForm({...protoForm, nome: e.target.value})} className="bg-white" />
                        </div>
                        <Select value={protoForm.tipo_acao} onValueChange={(v) => setProtoForm({...protoForm, tipo_acao: v})}>
                          <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                          <SelectContent>{TIPOS_ACAO.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                        </Select>
                        <Input type="number" placeholder="Recorrencia (dias)" value={protoForm.recorrencia_dias} onChange={(e) => setProtoForm({...protoForm, recorrencia_dias: e.target.value})} className="bg-white" />
                        <Input placeholder="Mensagem (opcional)" value={protoForm.mensagem} onChange={(e) => setProtoForm({...protoForm, mensagem: e.target.value})} className="bg-white col-span-2" />
                        <Select value={protoForm.sexo || 'todos_s'} onValueChange={(v) => setProtoForm({...protoForm, sexo: v === 'todos_s' ? '' : v})}>
                          <SelectTrigger className="bg-white"><SelectValue placeholder="Sexo" /></SelectTrigger>
                          <SelectContent><SelectItem value="todos_s">Todos</SelectItem><SelectItem value="macho">Macho</SelectItem><SelectItem value="femea">Femea</SelectItem></SelectContent>
                        </Select>
                        <div className="flex gap-2">
                          <Button onClick={addProtocolo} className="bg-[#4A6741] hover:bg-[#3B5233] flex-1" size="sm">
                            {editandoProtocolo !== null ? 'Salvar' : 'Adicionar'}
                          </Button>
                          {editandoProtocolo !== null && (
                            <Button variant="outline" size="sm" onClick={() => { setEditandoProtocolo(null); setProtoForm({ nome: '', tipo_acao: 'vacinacao', mensagem: '', recorrencia_dias: '', idade_min_meses: '', idade_max_meses: '', sexo: '' }); }}>
                              <X size={14} />
                            </Button>
                          )}
                        </div>
                      </div>
                      {protocolos.length > 0 && (
                        <Button onClick={salvarProtocolos} className="mt-3 w-full bg-[#2B6CB0] hover:bg-[#1E5A9E]" size="sm" data-testid="salvar-calendario-btn">
                          Salvar Calendario Personalizado
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
