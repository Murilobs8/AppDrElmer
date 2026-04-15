import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { Plus, Trash, Pencil, CopySimple } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import SelectEditavel from '../components/SelectEditavel';
import { toast } from 'sonner';

const TIPOS_MOVIMENTACAO = [
  { value: 'entrada', label: 'Entrada de Animal', motivos: ['compra', 'nascimento', 'doacao', 'transferencia'] },
  { value: 'saida', label: 'Saida de Animal', motivos: ['venda', 'morte', 'perda', 'doacao', 'transferencia'] },
  { value: 'producao', label: 'Producao / Servico', motivos: ['leite', 'ovos', 'la', 'mel', 'aluguel_pasto', 'servico_reproducao', 'adubo', 'couro', 'outros'] }
];

const MOTIVO_LABELS = {
  compra: 'Compra', nascimento: 'Nascimento', doacao: 'Doacao', transferencia: 'Transferencia',
  venda: 'Venda', morte: 'Morte', perda: 'Perda',
  leite: 'Leite', ovos: 'Ovos', la: 'La', mel: 'Mel',
  aluguel_pasto: 'Aluguel de Pasto', servico_reproducao: 'Servico de Reproducao',
  adubo: 'Adubo/Esterco', couro: 'Couro', outros: 'Outros'
};

const UNIDADES = [
  { value: 'litros', label: 'Litros' }, { value: 'kg', label: 'Quilos (kg)' },
  { value: 'unidades', label: 'Unidades' }, { value: 'duzias', label: 'Duzias' },
  { value: 'toneladas', label: 'Toneladas' }, { value: 'dias', label: 'Dias' },
  { value: 'meses', label: 'Meses' }, { value: 'cabecas', label: 'Cabecas' }
];

const TIPOS_ANIMAIS = ['Bovino', 'Suino', 'Ovino', 'Caprino', 'Equino', 'Aves', 'Outros'];

export default function Movimentacoes() {
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [animais, setAnimais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogBulkOpen, setDialogBulkOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formData, setFormData] = useState({
    tipo: '', motivo: '', animal_id: '', data: new Date().toISOString().split('T')[0],
    valor: '', quantidade: 1, unidade: '', tipo_animal: '', observacoes: ''
  });
  const [formBulk, setFormBulk] = useState({
    tipo: '', motivo: '', tag_prefixo: '', tag_inicio: '', tag_fim: '',
    data: new Date().toISOString().split('T')[0], valor: '', observacoes: ''
  });

  useEffect(() => { carregarDados(); }, []);

  const carregarDados = async () => {
    try {
      const [movRes, animaisRes] = await Promise.all([
        api.get(`/movimentacoes`), api.get(`/animais?status=ativo`)
      ]);
      setMovimentacoes(movRes.data); setAnimais(animaisRes.data);
    } catch (error) { toast.error('Erro ao carregar dados'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.tipo || !formData.motivo) { toast.error('Preencha tipo e motivo'); return; }
    const payload = {
      ...formData, valor: formData.valor ? parseFloat(formData.valor) : null,
      quantidade: parseFloat(formData.quantidade) || 1,
      animal_id: formData.animal_id && formData.animal_id !== 'none' ? formData.animal_id : null,
      tipo_animal: formData.tipo_animal || null,
      unidade: formData.unidade && formData.unidade !== 'none_unidade' ? formData.unidade : null
    };
    try {
      if (editando) {
        await api.delete(`/movimentacoes/${editando.id}`);
        await api.post(`/movimentacoes`, payload);
        toast.success('Movimentacao atualizada!');
      } else {
        await api.post(`/movimentacoes`, payload);
        toast.success('Movimentacao registrada!');
      }
      setDialogOpen(false); resetForm(); carregarDados();
    } catch (error) { toast.error('Erro ao salvar movimentacao'); }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (!formBulk.tipo || !formBulk.motivo || !formBulk.tag_prefixo || !formBulk.tag_inicio || !formBulk.tag_fim) {
      toast.error('Preencha todos os campos obrigatorios'); return;
    }
    try {
      const payload = {
        tipo: formBulk.tipo, motivo: formBulk.motivo,
        tag_prefixo: formBulk.tag_prefixo,
        tag_inicio: parseInt(formBulk.tag_inicio), tag_fim: parseInt(formBulk.tag_fim),
        data: formBulk.data, valor: formBulk.valor ? parseFloat(formBulk.valor) : null,
        observacoes: formBulk.observacoes || ''
      };
      const response = await api.post(`/movimentacoes/bulk`, payload);
      toast.success(`${response.data.total} movimentacoes registradas!`);
      setDialogBulkOpen(false); resetBulkForm(); carregarDados();
    } catch (error) {
      const d = error.response?.data?.detail;
      toast.error(typeof d === 'string' ? d : 'Erro na movimentacao em massa');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir esta movimentacao?')) return;
    try { await api.delete(`/movimentacoes/${id}`); toast.success('Excluida!'); carregarDados(); }
    catch (error) { toast.error('Erro ao excluir'); }
  };

  const resetForm = () => {
    setFormData({ tipo: '', motivo: '', animal_id: '', data: new Date().toISOString().split('T')[0], valor: '', quantidade: 1, unidade: '', tipo_animal: '', observacoes: '' });
    setEditando(null);
  };
  const resetBulkForm = () => {
    setFormBulk({ tipo: '', motivo: '', tag_prefixo: '', tag_inicio: '', tag_fim: '', data: new Date().toISOString().split('T')[0], valor: '', observacoes: '' });
  };

  const abrirEdicao = (mov) => {
    setEditando(mov);
    setFormData({ tipo: mov.tipo, motivo: mov.motivo, animal_id: mov.animal_id || 'none', data: mov.data, valor: mov.valor || '', quantidade: mov.quantidade || 1, unidade: mov.unidade || '', tipo_animal: mov.tipo_animal || '', observacoes: mov.observacoes || '' });
    setDialogOpen(true);
  };

  const getTipoInfo = () => TIPOS_MOVIMENTACAO.find(t => t.value === formData.tipo);
  const getBulkTipoInfo = () => TIPOS_MOVIMENTACAO.find(t => t.value === formBulk.tipo);
  const isProducao = formData.tipo === 'producao';
  const isAnimal = formData.tipo === 'entrada' || formData.tipo === 'saida';
  const getTipoBadge = (tipo) => ({ entrada: 'bg-[#3B823E] text-white', saida: 'bg-[#C25934] text-white', producao: 'bg-[#2B6CB0] text-white' }[tipo] || 'bg-[#7A8780] text-white');
  const getTipoLabel = (tipo) => ({ entrada: 'Entrada', saida: 'Saida', producao: 'Producao' }[tipo] || tipo);

  if (loading) return <div className="flex items-center justify-center h-64">Carregando...</div>;

  return (
    <div className="fade-in" data-testid="movimentacoes-page">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-[#1B2620]">Movimentacoes</h1>
          <p className="text-lg text-[#7A8780] mt-2">Entradas, saidas, producoes e transferencias</p>
        </div>
        <div className="flex gap-2">
          {/* Movimentacao em massa por tag */}
          <Dialog open={dialogBulkOpen} onOpenChange={(open) => { setDialogBulkOpen(open); if (!open) resetBulkForm(); }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-[#4A6741] text-[#4A6741] hover:bg-[#E8F0E6]" data-testid="bulk-mov-btn">
                <CopySimple size={20} className="mr-2" /> Em Massa (Tag)
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="bulk-mov-dialog">
              <DialogHeader><DialogTitle>Movimentacao em Massa por Tag</DialogTitle></DialogHeader>
              <form onSubmit={handleBulkSubmit} className="space-y-4">
                <div>
                  <Label>Tipo *</Label>
                  <Select value={formBulk.tipo} onValueChange={(v) => setFormBulk({...formBulk, tipo: v, motivo: ''})}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{TIPOS_MOVIMENTACAO.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {formBulk.tipo && (
                  <div>
                    <Label>Motivo *</Label>
                    <SelectEditavel campo={`motivo_${formBulk.tipo}`} value={formBulk.motivo} onValueChange={(v) => setFormBulk({...formBulk, motivo: v})} placeholder="Selecione o motivo" opcoesPadrao={getBulkTipoInfo()?.motivos || []} />
                  </div>
                )}
                <div className="bg-[#F4F3F0] rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium text-[#1B2620]">Intervalo de Tags</p>
                  <div>
                    <Label>Prefixo da Tag * (ex: BOV-)</Label>
                    <Input value={formBulk.tag_prefixo} onChange={(e) => setFormBulk({...formBulk, tag_prefixo: e.target.value})} placeholder="BOV-" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Numero Inicial *</Label>
                      <Input type="number" min="1" value={formBulk.tag_inicio} onChange={(e) => setFormBulk({...formBulk, tag_inicio: e.target.value})} placeholder="1" required />
                    </div>
                    <div>
                      <Label>Numero Final *</Label>
                      <Input type="number" min="1" value={formBulk.tag_fim} onChange={(e) => setFormBulk({...formBulk, tag_fim: e.target.value})} placeholder="50" required />
                    </div>
                  </div>
                  <p className="text-xs text-[#7A8780]">Ex: BOV- de 1 a 50 = BOV-001 ate BOV-050</p>
                </div>
                <div>
                  <Label>Data *</Label>
                  <Input type="date" value={formBulk.data} onChange={(e) => setFormBulk({...formBulk, data: e.target.value})} required />
                </div>
                <div>
                  <Label>Valor unitario (R$)</Label>
                  <Input type="number" step="0.01" value={formBulk.valor} onChange={(e) => setFormBulk({...formBulk, valor: e.target.value})} />
                </div>
                <div>
                  <Label>Observacoes</Label>
                  <Input value={formBulk.observacoes} onChange={(e) => setFormBulk({...formBulk, observacoes: e.target.value})} />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setDialogBulkOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-[#4A6741] hover:bg-[#3B5334] text-white">Registrar</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Movimentacao individual */}
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-[#4A6741] hover:bg-[#3B5334] text-white" data-testid="add-movimentacao-btn">
                <Plus size={20} className="mr-2" /> Nova
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="movimentacao-dialog">
              <DialogHeader><DialogTitle>{editando ? 'Editar Movimentacao' : 'Nova Movimentacao'}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Tipo *</Label>
                  <Select value={formData.tipo} onValueChange={(v) => setFormData({...formData, tipo: v, motivo: '', animal_id: '', unidade: ''})}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{TIPOS_MOVIMENTACAO.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {formData.tipo && (
                  <div>
                    <Label>Motivo *</Label>
                    <SelectEditavel campo={`motivo_${formData.tipo}`} value={formData.motivo} onValueChange={(v) => setFormData({...formData, motivo: v})} placeholder="Selecione o motivo" opcoesPadrao={getTipoInfo()?.motivos || []} />
                  </div>
                )}
                {isAnimal && (
                  <>
                    <div>
                      <Label>Animal (opcional)</Label>
                      <Select value={formData.animal_id || 'none'} onValueChange={(v) => setFormData({...formData, animal_id: v === 'none' ? '' : v})}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {animais.map(a => <SelectItem key={a.id} value={a.id}>{a.tag} - {a.tipo}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {(!formData.animal_id || formData.animal_id === 'none') && (
                      <div>
                        <Label>Tipo de Animal</Label>
                        <SelectEditavel campo="tipo_animal" value={formData.tipo_animal} onValueChange={(v) => setFormData({...formData, tipo_animal: v})} placeholder="Selecione" opcoesPadrao={TIPOS_ANIMAIS} allowNone noneLabel="Nenhum" />
                      </div>
                    )}
                  </>
                )}
                <div><Label>Data *</Label><Input type="date" value={formData.data} onChange={(e) => setFormData({...formData, data: e.target.value})} required /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Quantidade</Label><Input type="number" step="0.01" min="0" value={formData.quantidade} onChange={(e) => setFormData({...formData, quantidade: e.target.value})} /></div>
                  {isProducao && (
                    <div>
                      <Label>Unidade</Label>
                      <SelectEditavel campo="unidade_producao" value={formData.unidade} onValueChange={(v) => setFormData({...formData, unidade: v})} placeholder="Selecione" opcoesPadrao={UNIDADES.map(u => u.value)} allowNone noneLabel="Nenhuma" />
                    </div>
                  )}
                </div>
                <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={formData.valor} onChange={(e) => setFormData({...formData, valor: e.target.value})} /></div>
                <div><Label>Observacoes</Label><Input value={formData.observacoes} onChange={(e) => setFormData({...formData, observacoes: e.target.value})} /></div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-[#4A6741] hover:bg-[#3B5334] text-white">{editando ? 'Atualizar' : 'Salvar'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-[#E5E3DB] overflow-hidden" data-testid="movimentacoes-table">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F4F3F0] border-b border-[#E5E3DB]">
              <tr>
                <th className="px-6 py-4 font-semibold text-[#1B2620]">Data</th>
                <th className="px-6 py-4 font-semibold text-[#1B2620]">Tipo</th>
                <th className="px-6 py-4 font-semibold text-[#1B2620]">Motivo</th>
                <th className="px-6 py-4 font-semibold text-[#1B2620]">Detalhe</th>
                <th className="px-6 py-4 font-semibold text-[#1B2620]">Qtd</th>
                <th className="px-6 py-4 font-semibold text-[#1B2620]">Valor</th>
                <th className="px-6 py-4 font-semibold text-[#1B2620]">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {movimentacoes.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-12 text-center text-[#7A8780]">Nenhuma movimentacao registrada</td></tr>
              ) : movimentacoes.map((mov) => {
                const animal = animais.find(a => a.id === mov.animal_id);
                let detalhe = '-';
                if (animal) detalhe = `${animal.tag} (${animal.tipo})`;
                else if (mov.tipo_animal) detalhe = mov.tipo_animal;
                else if (mov.tipo === 'producao') detalhe = MOTIVO_LABELS[mov.motivo] || mov.motivo;
                const qtdLabel = mov.quantidade ? `${mov.quantidade}${mov.unidade ? ' ' + mov.unidade : ''}` : '-';
                return (
                  <tr key={mov.id} className="table-row border-b border-[#E5E3DB] hover:bg-[#FDFCFB]">
                    <td className="px-6 py-4 text-[#3A453F]">{new Date(mov.data).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4"><span className={`px-2 py-1 rounded-md text-xs font-medium ${getTipoBadge(mov.tipo)}`}>{getTipoLabel(mov.tipo)}</span></td>
                    <td className="px-6 py-4 text-[#3A453F]">{MOTIVO_LABELS[mov.motivo] || mov.motivo}</td>
                    <td className="px-6 py-4 text-[#3A453F]">{detalhe}</td>
                    <td className="px-6 py-4 text-[#3A453F]">{qtdLabel}</td>
                    <td className="px-6 py-4 text-[#3A453F]">{mov.valor ? `R$ ${mov.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => abrirEdicao(mov)} className="text-[#4A6741] hover:text-[#3B5334]"><Pencil size={18} /></button>
                        <button onClick={() => handleDelete(mov.id)} className="text-[#C25934] hover:text-[#A64B2B]"><Trash size={18} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
