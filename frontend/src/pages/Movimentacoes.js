import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { emit, on, EVENTS } from '../lib/eventBus';
import { Plus, Trash, Pencil, CopySimple, ArrowDown, ArrowUp } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import SelectEditavel from '../components/SelectEditavel';
import { usePagination, PaginationBar } from '../components/Pagination';
import { toast } from 'sonner';

const TIPOS_ANIMAIS = ['Bovino', 'Suino', 'Ovino', 'Caprino', 'Equino', 'Aves', 'Outros'];
const SEXOS = [{ value: 'macho', label: 'Macho' }, { value: 'femea', label: 'Fêmea' }];
const MOTIVOS_ENTRADA = ['compra', 'nascimento', 'doacao', 'transferencia'];
const MOTIVOS_SAIDA = ['venda', 'morte', 'perda', 'doacao', 'transferencia'];
const MOTIVO_LABELS = {
  compra: 'Compra', nascimento: 'Nascimento', doacao: 'Doação', transferencia: 'Transferência',
  venda: 'Venda', morte: 'Morte', perda: 'Perda'
};

function calcularIdade(dataNasc) {
  if (!dataNasc) return null;
  const nasc = new Date(dataNasc);
  const hoje = new Date();
  let meses = (hoje.getFullYear() - nasc.getFullYear()) * 12 + (hoje.getMonth() - nasc.getMonth());
  if (meses < 0) return null;
  return meses;
}

function formatIdade(dataNasc) {
  const m = calcularIdade(dataNasc);
  if (m === null) return '-';
  if (m === 0) return 'Recém nascido';
  if (m < 12) return `${m} ${m === 1 ? 'mês' : 'meses'}`;
  const anos = Math.floor(m / 12), rest = m % 12;
  return rest === 0 ? `${anos}a` : `${anos}a ${rest}m`;
}

export default function Movimentacoes() {
  const navigate = useNavigate();
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [animais, setAnimais] = useState([]);
  const [sequencias, setSequencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('todas'); // todas / entrada / saida

  // Dialogs
  const [entradaOpen, setEntradaOpen] = useState(false);
  const [entradaBulkOpen, setEntradaBulkOpen] = useState(false);
  const [saidaOpen, setSaidaOpen] = useState(false);
  const [saidaBulkOpen, setSaidaBulkOpen] = useState(false);

  // Form Entrada individual (animal + movimentação unificados)
  const [entrada, setEntrada] = useState({
    tipo_animal: '', tag: '', sexo: '', genitora_id: '', data_nascimento: '',
    peso_atual: '', peso_tipo: 'aferido',
    motivo: 'compra', data: new Date().toISOString().split('T')[0], valor: '', observacoes: ''
  });

  // Form Entrada em massa
  const [entradaBulk, setEntradaBulk] = useState({
    tipo_animal: '', tag_inicial: '', quantidade: 2, sexo: '', data_nascimento: '',
    peso_atual: '', peso_tipo: 'estimado',
    motivo: 'compra', data: new Date().toISOString().split('T')[0], valor: '', observacoes: ''
  });

  // Form Saída individual (animal existente)
  const [saida, setSaida] = useState({
    animal_id: '', motivo: 'venda', data: new Date().toISOString().split('T')[0], valor: '', observacoes: ''
  });

  // Form Saída em massa (intervalo de tags)
  const [saidaBulk, setSaidaBulk] = useState({
    motivo: 'venda', tag_prefixo: '', tag_inicio: '', tag_fim: '',
    data: new Date().toISOString().split('T')[0], valor: '', observacoes: ''
  });

  useEffect(() => { carregarDados(); }, []);

  useEffect(() => {
    const unsubs = [
      on(EVENTS.ANIMAL_CHANGED, carregarDados),
      on(EVENTS.MOVIMENTACAO_CHANGED, carregarDados),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  const carregarDados = async () => {
    try {
      const [movRes, animaisRes, seqRes] = await Promise.all([
        api.get('/movimentacoes'),
        api.get('/animais'),
        api.get('/animais/sequencias')
      ]);
      // Filtra fora movimentações antigas tipo=producao (agora em aba separada)
      setMovimentacoes(movRes.data.filter(m => m.tipo !== 'producao'));
      setAnimais(animaisRes.data);
      setSequencias(seqRes.data);
    } catch { toast.error('Erro ao carregar dados'); }
    finally { setLoading(false); }
  };

  const femeasAtivas = animais.filter(a => a.sexo === 'femea' && a.status === 'ativo');
  const animaisAtivos = animais.filter(a => a.status === 'ativo');

  const movFiltradas = movimentacoes.filter(m => tab === 'todas' ? true : m.tipo === tab);
  const pag = usePagination(movFiltradas, 100);

  // ============== ENTRADA ==============
  const submitEntrada = async () => {
    if (!entrada.tipo_animal || !entrada.tag || !entrada.motivo || !entrada.data) {
      toast.error('Preencha tipo, tag, motivo e data'); return;
    }
    const payload = {
      tipo_animal: entrada.tipo_animal, tag: entrada.tag, sexo: entrada.sexo || null,
      genitora_id: entrada.genitora_id && entrada.genitora_id !== 'none' ? entrada.genitora_id : null,
      data_nascimento: entrada.data_nascimento || null,
      peso_atual: entrada.peso_atual ? parseFloat(entrada.peso_atual) : null,
      peso_tipo: entrada.peso_tipo || 'aferido',
      motivo: entrada.motivo, data: entrada.data,
      valor: entrada.valor ? parseFloat(entrada.valor) : null,
      observacoes: entrada.observacoes || ''
    };
    try {
      await api.post('/movimentacoes/entrada', payload);
      toast.success(`Animal ${entrada.tag} cadastrado + entrada registrada!`);
      setEntradaOpen(false); resetEntrada();
      carregarDados();
      emit(EVENTS.ANIMAL_CHANGED); emit(EVENTS.MOVIMENTACAO_CHANGED);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao registrar entrada');
    }
  };

  const submitEntradaBulk = async () => {
    if (!entradaBulk.tipo_animal || !entradaBulk.tag_inicial || !entradaBulk.quantidade || !entradaBulk.motivo) {
      toast.error('Preencha tipo, tag inicial, quantidade e motivo'); return;
    }
    const payload = {
      tipo_animal: entradaBulk.tipo_animal,
      tag_inicial: entradaBulk.tag_inicial,
      quantidade: parseInt(entradaBulk.quantidade),
      sexo: entradaBulk.sexo || null,
      data_nascimento: entradaBulk.data_nascimento || null,
      peso_atual: entradaBulk.peso_atual ? parseFloat(entradaBulk.peso_atual) : null,
      peso_tipo: entradaBulk.peso_tipo || 'estimado',
      motivo: entradaBulk.motivo, data: entradaBulk.data,
      valor: entradaBulk.valor ? parseFloat(entradaBulk.valor) : null,
      observacoes: entradaBulk.observacoes || ''
    };
    try {
      const res = await api.post('/movimentacoes/entrada/bulk', payload);
      toast.success(`${res.data.total} animais cadastrados + entradas registradas!`);
      setEntradaBulkOpen(false); resetEntradaBulk();
      carregarDados();
      emit(EVENTS.ANIMAL_CHANGED); emit(EVENTS.MOVIMENTACAO_CHANGED);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro no cadastro em massa');
    }
  };

  const resetEntrada = () => setEntrada({
    tipo_animal: '', tag: '', sexo: '', genitora_id: '', data_nascimento: '',
    peso_atual: '', peso_tipo: 'aferido',
    motivo: 'compra', data: new Date().toISOString().split('T')[0], valor: '', observacoes: ''
  });
  const resetEntradaBulk = () => setEntradaBulk({
    tipo_animal: '', tag_inicial: '', quantidade: 2, sexo: '', data_nascimento: '',
    peso_atual: '', peso_tipo: 'estimado',
    motivo: 'compra', data: new Date().toISOString().split('T')[0], valor: '', observacoes: ''
  });

  // ============== SAIDA ==============
  const submitSaida = async () => {
    if (!saida.animal_id || !saida.motivo || !saida.data) {
      toast.error('Selecione animal, motivo e data'); return;
    }
    const payload = {
      tipo: 'saida', motivo: saida.motivo, animal_id: saida.animal_id,
      data: saida.data, valor: saida.valor ? parseFloat(saida.valor) : null,
      quantidade: 1, observacoes: saida.observacoes || ''
    };
    try {
      await api.post('/movimentacoes', payload);
      toast.success('Saída registrada!');
      setSaidaOpen(false); resetSaida();
      carregarDados();
      emit(EVENTS.ANIMAL_CHANGED); emit(EVENTS.MOVIMENTACAO_CHANGED);
    } catch (error) { toast.error(error.response?.data?.detail || 'Erro ao registrar saída'); }
  };

  const submitSaidaBulk = async () => {
    if (!saidaBulk.motivo || !saidaBulk.tag_prefixo || !saidaBulk.tag_inicio || !saidaBulk.tag_fim) {
      toast.error('Preencha motivo, prefixo e intervalo'); return;
    }
    const payload = {
      tipo: 'saida', motivo: saidaBulk.motivo,
      tag_prefixo: saidaBulk.tag_prefixo,
      tag_inicio: parseInt(saidaBulk.tag_inicio),
      tag_fim: parseInt(saidaBulk.tag_fim),
      data: saidaBulk.data,
      valor: saidaBulk.valor ? parseFloat(saidaBulk.valor) : null,
      observacoes: saidaBulk.observacoes || ''
    };
    try {
      const res = await api.post('/movimentacoes/bulk', payload);
      toast.success(`${res.data.total} saídas registradas!`);
      setSaidaBulkOpen(false); resetSaidaBulk();
      carregarDados();
      emit(EVENTS.ANIMAL_CHANGED); emit(EVENTS.MOVIMENTACAO_CHANGED);
    } catch (error) { toast.error(error.response?.data?.detail || 'Erro na saída em massa'); }
  };

  const resetSaida = () => setSaida({
    animal_id: '', motivo: 'venda', data: new Date().toISOString().split('T')[0], valor: '', observacoes: ''
  });
  const resetSaidaBulk = () => setSaidaBulk({
    motivo: 'venda', tag_prefixo: '', tag_inicio: '', tag_fim: '',
    data: new Date().toISOString().split('T')[0], valor: '', observacoes: ''
  });

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir esta movimentação?')) return;
    try {
      await api.delete(`/movimentacoes/${id}`);
      toast.success('Excluída!');
      carregarDados();
      emit(EVENTS.MOVIMENTACAO_CHANGED);
    } catch { toast.error('Erro ao excluir'); }
  };

  const abrirHistorico = (animalId) => {
    if (!animalId) return;
    navigate(`/animais?open=${animalId}`);
  };

  if (loading) return <div className="flex items-center justify-center h-64">Carregando...</div>;

  const getTipoBadge = (t) => t === 'entrada' ? 'bg-[#3B823E] text-white' : 'bg-[#C25934] text-white';

  return (
    <div className="fade-in" data-testid="movimentacoes-page">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-[#1B2620]">Movimentações</h1>
          <p className="text-lg text-[#7A8780] mt-2">Entradas e saídas de animais · {movFiltradas.length} de {movimentacoes.length}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Dialog SAÍDA massa */}
          <Dialog open={saidaBulkOpen} onOpenChange={(v) => { setSaidaBulkOpen(v); if (!v) resetSaidaBulk(); }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-[#C25934] text-[#C25934] hover:bg-red-50" data-testid="saida-bulk-btn">
                <CopySimple size={18} className="mr-2" /> Saída em massa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Saída em Massa por Tag</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Motivo *</Label>
                  <Select value={saidaBulk.motivo} onValueChange={(v) => setSaidaBulk({...saidaBulk, motivo: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{MOTIVOS_SAIDA.map(m => <SelectItem key={m} value={m}>{MOTIVO_LABELS[m] || m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="bg-[#F4F3F0] rounded-lg p-3 space-y-2">
                  <div><Label>Prefixo da Tag *</Label><Input value={saidaBulk.tag_prefixo} onChange={(e) => setSaidaBulk({...saidaBulk, tag_prefixo: e.target.value})} placeholder="BOV-" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Início *</Label><Input type="number" value={saidaBulk.tag_inicio} onChange={(e) => setSaidaBulk({...saidaBulk, tag_inicio: e.target.value})} /></div>
                    <div><Label>Fim *</Label><Input type="number" value={saidaBulk.tag_fim} onChange={(e) => setSaidaBulk({...saidaBulk, tag_fim: e.target.value})} /></div>
                  </div>
                </div>
                <div><Label>Data *</Label><Input type="date" value={saidaBulk.data} onChange={(e) => setSaidaBulk({...saidaBulk, data: e.target.value})} /></div>
                <div><Label>Valor unitário (R$)</Label><Input type="number" step="0.01" value={saidaBulk.valor} onChange={(e) => setSaidaBulk({...saidaBulk, valor: e.target.value})} /></div>
                <div><Label>Observações</Label><Input value={saidaBulk.observacoes} onChange={(e) => setSaidaBulk({...saidaBulk, observacoes: e.target.value})} /></div>
                <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setSaidaBulkOpen(false)}>Cancelar</Button><Button onClick={submitSaidaBulk} className="bg-[#C25934] hover:bg-[#A64B2B] text-white">Registrar</Button></div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Dialog SAÍDA individual */}
          <Dialog open={saidaOpen} onOpenChange={(v) => { setSaidaOpen(v); if (!v) resetSaida(); }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-[#C25934] text-[#C25934] hover:bg-red-50" data-testid="saida-btn">
                <ArrowUp size={18} className="mr-2" /> Nova Saída
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Nova Saída</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Animal *</Label>
                  <Select value={saida.animal_id} onValueChange={(v) => setSaida({...saida, animal_id: v})}>
                    <SelectTrigger><SelectValue placeholder="Selecione o animal" /></SelectTrigger>
                    <SelectContent>{animaisAtivos.map(a => <SelectItem key={a.id} value={a.id}>{a.tag} - {a.tipo}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Motivo *</Label>
                  <Select value={saida.motivo} onValueChange={(v) => setSaida({...saida, motivo: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{MOTIVOS_SAIDA.map(m => <SelectItem key={m} value={m}>{MOTIVO_LABELS[m] || m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Data *</Label><Input type="date" value={saida.data} onChange={(e) => setSaida({...saida, data: e.target.value})} /></div>
                <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={saida.valor} onChange={(e) => setSaida({...saida, valor: e.target.value})} /></div>
                <div><Label>Observações</Label><Input value={saida.observacoes} onChange={(e) => setSaida({...saida, observacoes: e.target.value})} /></div>
                <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setSaidaOpen(false)}>Cancelar</Button><Button onClick={submitSaida} className="bg-[#C25934] hover:bg-[#A64B2B] text-white">Registrar</Button></div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Dialog ENTRADA massa */}
          <Dialog open={entradaBulkOpen} onOpenChange={(v) => { setEntradaBulkOpen(v); if (!v) resetEntradaBulk(); }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-[#3B823E] text-[#3B823E] hover:bg-[#E8F0E6]" data-testid="entrada-bulk-btn">
                <CopySimple size={18} className="mr-2" /> Entrada em massa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Entrada em Massa (Animais + Movimentação)</DialogTitle></DialogHeader>
              {sequencias.length > 0 && (
                <div className="bg-[#F5F0E8] rounded-lg p-2 flex flex-wrap gap-1.5 text-xs">
                  <span className="text-[#7A8780] self-center mr-1">Próximas tags:</span>
                  {sequencias.map((s, i) => (
                    <button key={i} type="button" onClick={() => setEntradaBulk({...entradaBulk, tag_inicial: s.proxima_tag, tipo_animal: s.tipo || entradaBulk.tipo_animal})} className="px-2 py-1 bg-white rounded border border-[#E5E3DB] hover:border-[#4A6741] font-mono">{s.proxima_tag}</button>
                  ))}
                </div>
              )}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Tipo Animal *</Label>
                    <SelectEditavel campo="tipo_animal" value={entradaBulk.tipo_animal} onValueChange={(v) => setEntradaBulk({...entradaBulk, tipo_animal: v})} placeholder="Selecione" opcoesPadrao={TIPOS_ANIMAIS} />
                  </div>
                  <div><Label>Tag Inicial * (ex: BOV-001)</Label><Input value={entradaBulk.tag_inicial} onChange={(e) => setEntradaBulk({...entradaBulk, tag_inicial: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Quantidade *</Label><Input type="number" min="2" max="500" value={entradaBulk.quantidade} onChange={(e) => setEntradaBulk({...entradaBulk, quantidade: e.target.value})} /></div>
                  <div>
                    <Label>Sexo</Label>
                    <Select value={entradaBulk.sexo || 'none_s'} onValueChange={(v) => setEntradaBulk({...entradaBulk, sexo: v === 'none_s' ? '' : v})}>
                      <SelectTrigger><SelectValue placeholder="Não informado" /></SelectTrigger>
                      <SelectContent><SelectItem value="none_s">Não informado</SelectItem>{SEXOS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Data Nascimento</Label><Input type="date" value={entradaBulk.data_nascimento} onChange={(e) => setEntradaBulk({...entradaBulk, data_nascimento: e.target.value})} /></div>
                  <div><Label>Peso médio (kg)</Label><Input type="number" step="0.01" value={entradaBulk.peso_atual} onChange={(e) => setEntradaBulk({...entradaBulk, peso_atual: e.target.value})} /></div>
                </div>
                <div className="bg-[#E8F0E6] rounded-lg p-3 space-y-2 border border-[#3B823E]/20">
                  <p className="text-xs font-semibold text-[#3B823E] uppercase tracking-wider">Movimentação (entrada)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Motivo *</Label>
                      <Select value={entradaBulk.motivo} onValueChange={(v) => setEntradaBulk({...entradaBulk, motivo: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{MOTIVOS_ENTRADA.map(m => <SelectItem key={m} value={m}>{MOTIVO_LABELS[m] || m}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-xs">Data *</Label><Input type="date" value={entradaBulk.data} onChange={(e) => setEntradaBulk({...entradaBulk, data: e.target.value})} /></div>
                  </div>
                  <div><Label className="text-xs">Valor unitário (R$)</Label><Input type="number" step="0.01" value={entradaBulk.valor} onChange={(e) => setEntradaBulk({...entradaBulk, valor: e.target.value})} /></div>
                </div>
                <div><Label>Observações</Label><Input value={entradaBulk.observacoes} onChange={(e) => setEntradaBulk({...entradaBulk, observacoes: e.target.value})} /></div>
                <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setEntradaBulkOpen(false)}>Cancelar</Button><Button onClick={submitEntradaBulk} className="bg-[#3B823E] hover:bg-[#2F6B31] text-white">Registrar Entrada</Button></div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Dialog ENTRADA individual */}
          <Dialog open={entradaOpen} onOpenChange={(v) => { setEntradaOpen(v); if (!v) resetEntrada(); }}>
            <DialogTrigger asChild>
              <Button className="bg-[#3B823E] hover:bg-[#2F6B31] text-white" data-testid="entrada-btn">
                <ArrowDown size={18} className="mr-2" /> Nova Entrada
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Nova Entrada (Cadastra Animal + Movimentação)</DialogTitle></DialogHeader>
              {sequencias.length > 0 && (
                <div className="bg-[#F5F0E8] rounded-lg p-2 flex flex-wrap gap-1.5 text-xs">
                  <span className="text-[#7A8780] self-center mr-1">Próximas tags:</span>
                  {sequencias.map((s, i) => (
                    <button key={i} type="button" onClick={() => setEntrada({...entrada, tag: s.proxima_tag, tipo_animal: s.tipo || entrada.tipo_animal})} className="px-2 py-1 bg-white rounded border border-[#E5E3DB] hover:border-[#4A6741] font-mono">{s.proxima_tag}</button>
                  ))}
                </div>
              )}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Tipo Animal *</Label>
                    <SelectEditavel campo="tipo_animal" value={entrada.tipo_animal} onValueChange={(v) => setEntrada({...entrada, tipo_animal: v})} placeholder="Selecione" opcoesPadrao={TIPOS_ANIMAIS} />
                  </div>
                  <div><Label>Tag *</Label><Input value={entrada.tag} onChange={(e) => setEntrada({...entrada, tag: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Sexo</Label>
                    <Select value={entrada.sexo || 'none_s'} onValueChange={(v) => setEntrada({...entrada, sexo: v === 'none_s' ? '' : v})}>
                      <SelectTrigger><SelectValue placeholder="Não informado" /></SelectTrigger>
                      <SelectContent><SelectItem value="none_s">Não informado</SelectItem>{SEXOS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Genitora (mãe)</Label>
                    <Select value={entrada.genitora_id || 'none'} onValueChange={(v) => setEntrada({...entrada, genitora_id: v === 'none' ? '' : v})}>
                      <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                      <SelectContent><SelectItem value="none">Nenhuma</SelectItem>{femeasAtivas.map(a => <SelectItem key={a.id} value={a.id}>{a.tag} - {a.tipo}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Data Nascimento</Label>
                    <div className="flex items-center gap-2"><Input type="date" value={entrada.data_nascimento} onChange={(e) => setEntrada({...entrada, data_nascimento: e.target.value})} className="flex-1" />{entrada.data_nascimento && <span className="text-xs text-[#4A6741] whitespace-nowrap">{formatIdade(entrada.data_nascimento)}</span>}</div>
                  </div>
                  <div><Label>Peso (kg)</Label><Input type="number" step="0.01" value={entrada.peso_atual} onChange={(e) => setEntrada({...entrada, peso_atual: e.target.value})} /></div>
                </div>
                <div className="bg-[#E8F0E6] rounded-lg p-3 space-y-2 border border-[#3B823E]/20">
                  <p className="text-xs font-semibold text-[#3B823E] uppercase tracking-wider">Movimentação (entrada)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Motivo *</Label>
                      <Select value={entrada.motivo} onValueChange={(v) => setEntrada({...entrada, motivo: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{MOTIVOS_ENTRADA.map(m => <SelectItem key={m} value={m}>{MOTIVO_LABELS[m] || m}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-xs">Data *</Label><Input type="date" value={entrada.data} onChange={(e) => setEntrada({...entrada, data: e.target.value})} /></div>
                  </div>
                  <div><Label className="text-xs">Valor (R$)</Label><Input type="number" step="0.01" value={entrada.valor} onChange={(e) => setEntrada({...entrada, valor: e.target.value})} /></div>
                </div>
                <div><Label>Observações</Label><Input value={entrada.observacoes} onChange={(e) => setEntrada({...entrada, observacoes: e.target.value})} /></div>
                <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setEntradaOpen(false)}>Cancelar</Button><Button onClick={submitEntrada} className="bg-[#3B823E] hover:bg-[#2F6B31] text-white">Cadastrar + Registrar</Button></div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs filtro */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('todas')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tab === 'todas' ? 'bg-[#1B2620] text-white' : 'bg-white border border-[#E5E3DB] text-[#7A8780]'}`} data-testid="tab-todas">Todas ({movimentacoes.length})</button>
        <button onClick={() => setTab('entrada')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tab === 'entrada' ? 'bg-[#3B823E] text-white' : 'bg-white border border-[#E5E3DB] text-[#7A8780]'}`} data-testid="tab-entrada">Entradas ({movimentacoes.filter(m => m.tipo === 'entrada').length})</button>
        <button onClick={() => setTab('saida')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tab === 'saida' ? 'bg-[#C25934] text-white' : 'bg-white border border-[#E5E3DB] text-[#7A8780]'}`} data-testid="tab-saida">Saídas ({movimentacoes.filter(m => m.tipo === 'saida').length})</button>
      </div>

      <div className="bg-white rounded-lg border border-[#E5E3DB] overflow-hidden" data-testid="movimentacoes-table">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F4F3F0] border-b border-[#E5E3DB]">
              <tr>
                <th className="px-6 py-4 font-semibold text-[#1B2620]">Data</th>
                <th className="px-6 py-4 font-semibold text-[#1B2620]">Tipo</th>
                <th className="px-6 py-4 font-semibold text-[#1B2620]">Motivo</th>
                <th className="px-6 py-4 font-semibold text-[#1B2620]">Animal</th>
                <th className="px-6 py-4 font-semibold text-[#1B2620]">Valor</th>
                <th className="px-6 py-4 font-semibold text-[#1B2620]">Observações</th>
                <th className="px-6 py-4 font-semibold text-[#1B2620]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {movFiltradas.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-[#7A8780]">Nenhuma movimentação registrada</td></tr>
              ) : pag.paginated.map((mov) => {
                const animal = animais.find(a => a.id === mov.animal_id);
                return (
                  <tr key={mov.id} className="table-row border-b border-[#E5E3DB] hover:bg-[#FDFCFB]">
                    <td className="px-6 py-4 text-[#3A453F]">{new Date(mov.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4"><span className={`px-2 py-1 rounded-md text-xs font-medium ${getTipoBadge(mov.tipo)}`}>{mov.tipo === 'entrada' ? 'Entrada' : 'Saída'}</span></td>
                    <td className="px-6 py-4 text-[#3A453F] capitalize">{MOTIVO_LABELS[mov.motivo] || mov.motivo}</td>
                    <td className="px-6 py-4">
                      {animal ? (
                        <button onClick={() => abrirHistorico(animal.id)} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#E8F0E6] text-[#4A6741] hover:bg-[#4A6741] hover:text-white transition-colors font-medium text-xs" data-testid={`link-animal-${animal.tag}`} title="Abrir histórico">
                          {animal.tag} <span className="opacity-60">({animal.tipo})</span>
                        </button>
                      ) : <span className="text-[#7A8780]">{mov.tipo_animal || '-'}</span>}
                    </td>
                    <td className="px-6 py-4 text-[#3A453F] font-medium">{mov.valor ? `R$ ${mov.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</td>
                    <td className="px-6 py-4 text-[#7A8780] text-xs max-w-[200px] truncate">{mov.observacoes || '-'}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => handleDelete(mov.id)} className="text-[#C25934] hover:text-[#A64B2B]"><Trash size={18} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <PaginationBar {...pag} label="movimentações" />
      </div>
    </div>
  );
}
