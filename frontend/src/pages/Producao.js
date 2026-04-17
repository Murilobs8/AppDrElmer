import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { emit, on, EVENTS } from '../lib/eventBus';
import { Plus, Trash, Pencil, ListPlus, Drop } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import SelectEditavel from '../components/SelectEditavel';
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
              ) : producoes.map((p) => (
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
      </div>
    </div>
  );
}
