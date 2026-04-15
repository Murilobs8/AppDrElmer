import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { Plus, Trash, Pencil, ListPlus } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import SelectEditavel from '../components/SelectEditavel';
import { toast } from 'sonner';

const TIPOS_EVENTOS_PADRAO = ['nascimento', 'desmame', 'vacinacao', 'pesagem', 'tratamento'];

export default function Eventos() {
  const [eventos, setEventos] = useState([]);
  const [animais, setAnimais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formData, setFormData] = useState({ tipo: '', animal_id: '', data: '', detalhes: '', peso: '', vacina: '' });
  const [bulkData, setBulkData] = useState({ tipo: '', tag_prefixo: '', tag_inicio: '', tag_fim: '', data: '', detalhes: '', peso: '', vacina: '' });
  const [bulkLoading, setBulkLoading] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [sequencias, setSequencias] = useState([]);

  const tiposUnicos = [...new Set(eventos.map(e => e.tipo))].sort();

  useEffect(() => { carregarDados(); carregarSequencias(); }, []);

  const eventosFiltrados = filtroTipo ? eventos.filter(e => e.tipo === filtroTipo) : eventos;

  const carregarDados = async () => {
    try {
      const [eventosRes, animaisRes] = await Promise.all([
        api.get(`/eventos`), api.get(`/animais`)
      ]);
      setEventos(eventosRes.data);
      setAnimais(animaisRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally { setLoading(false); }
  };

  const carregarSequencias = async () => {
    try {
      const res = await api.get('/animais/sequencias');
      setSequencias(res.data);
    } catch { /* silencioso */ }
  };

  const handleSubmit = async () => {
    if (!formData.tipo || !formData.animal_id || !formData.data) {
      toast.error('Preencha tipo, animal e data');
      return;
    }
    try {
      const payload = { ...formData, peso: formData.peso ? parseFloat(formData.peso) : null };
      if (editando) {
        await api.put(`/eventos/${editando.id}`, payload);
        toast.success('Evento atualizado!');
      } else {
        await api.post(`/eventos`, payload);
        toast.success('Evento registrado!');
      }
      setDialogOpen(false);
      setEditando(null);
      setFormData({ tipo: '', animal_id: '', data: '', detalhes: '', peso: '', vacina: '' });
      carregarDados();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar evento');
    }
  };

  const handleBulkSubmit = async () => {
    if (!bulkData.tipo || !bulkData.tag_prefixo || !bulkData.tag_inicio || !bulkData.tag_fim || !bulkData.data) {
      toast.error('Preencha tipo, prefixo da tag, intervalo e data');
      return;
    }
    setBulkLoading(true);
    try {
      const payload = {
        ...bulkData,
        tag_inicio: parseInt(bulkData.tag_inicio),
        tag_fim: parseInt(bulkData.tag_fim),
        peso: bulkData.peso ? parseFloat(bulkData.peso) : null
      };
      const response = await api.post(`/eventos/bulk`, payload);
      toast.success(`${response.data.total} evento(s) registrado(s) em massa!`);
      setBulkDialogOpen(false);
      setBulkData({ tipo: '', tag_prefixo: '', tag_inicio: '', tag_fim: '', data: '', detalhes: '', peso: '', vacina: '' });
      carregarDados();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao registrar eventos em massa');
    } finally { setBulkLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deseja excluir este evento?')) return;
    try { await api.delete(`/eventos/${id}`); toast.success('Evento excluido!'); carregarDados(); }
    catch { toast.error('Erro ao excluir'); }
  };

  const getAnimalTag = (animalId) => {
    const animal = animais.find(a => a.id === animalId);
    return animal ? animal.tag : animalId;
  };

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4A6741]"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2F1810]">Eventos</h1>
          <p className="text-sm text-[#7A8780]">{eventosFiltrados.length} de {eventos.length} evento(s)</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={filtroTipo || 'todos'} onValueChange={(v) => setFiltroTipo(v === 'todos' ? '' : v)}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Filtrar tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {tiposUnicos.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="bg-white border-[#4A6741] text-[#4A6741] hover:bg-[#4A6741]/10" onClick={() => setBulkData({ tipo: '', tag_prefixo: '', tag_inicio: '', tag_fim: '', data: '', detalhes: '', peso: '', vacina: '' })}>
                <ListPlus className="mr-2" size={18} /> Cadastro em Massa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Registrar Eventos em Massa</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Tipo de Evento *</Label>
                  <SelectEditavel campo="tipo_evento" value={bulkData.tipo} onValueChange={(v) => setBulkData({...bulkData, tipo: v})} placeholder="Tipo do evento" opcoesPadrao={TIPOS_EVENTOS_PADRAO} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label>Prefixo Tag *</Label>
                    <div className="relative">
                      <Input placeholder="BOV-" value={bulkData.tag_prefixo} onChange={(e) => setBulkData({...bulkData, tag_prefixo: e.target.value})} list="prefixos-list" />
                      <datalist id="prefixos-list">
                        {sequencias.map((seq, i) => <option key={i} value={seq.prefixo} />)}
                      </datalist>
                    </div>
                  </div>
                  <div>
                    <Label>Tag Inicio *</Label>
                    <div className="relative">
                      <Input type="number" placeholder="1" value={bulkData.tag_inicio} onChange={(e) => setBulkData({...bulkData, tag_inicio: e.target.value})} list="inicio-list" />
                      <datalist id="inicio-list">
                        {sequencias.filter(s => !bulkData.tag_prefixo || s.prefixo === bulkData.tag_prefixo).map((seq, i) => <option key={i} value={seq.primeiro} label={`${seq.prefixo}${String(seq.primeiro).padStart(seq.tamanho_numero, '0')}`} />)}
                      </datalist>
                    </div>
                  </div>
                  <div>
                    <Label>Tag Fim *</Label>
                    <div className="relative">
                      <Input type="number" placeholder="10" value={bulkData.tag_fim} onChange={(e) => setBulkData({...bulkData, tag_fim: e.target.value})} list="fim-list" />
                      <datalist id="fim-list">
                        {sequencias.filter(s => !bulkData.tag_prefixo || s.prefixo === bulkData.tag_prefixo).map((seq, i) => <option key={i} value={seq.ultimo} label={`${seq.ultima_tag}`} />)}
                      </datalist>
                    </div>
                  </div>
                </div>
                {sequencias.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {sequencias.map((seq, i) => (
                      <button key={i} type="button" onClick={() => setBulkData({...bulkData, tag_prefixo: seq.prefixo, tag_inicio: String(seq.primeiro), tag_fim: String(seq.ultimo)})} className="flex items-center gap-1 px-2 py-1 bg-[#F5F0E8] rounded-md border border-[#E5E3DB] hover:border-[#4A6741] hover:bg-[#E8F0E6] transition-all text-xs group">
                        <span className="font-mono text-[#2F1810]">{seq.prefixo}</span>
                        <span className="text-[#7A8780]">{seq.primeiro}–{seq.ultimo}</span>
                        <span className="text-[#4A6741] font-medium">({seq.total})</span>
                      </button>
                    ))}
                  </div>
                )}
                <div>
                  <Label>Data *</Label>
                  <Input type="date" value={bulkData.data} onChange={(e) => setBulkData({...bulkData, data: e.target.value})} />
                </div>
                {(bulkData.tipo === 'vacinacao') && (
                  <div>
                    <Label>Vacina</Label>
                    <SelectEditavel campo="vacina" value={bulkData.vacina} onValueChange={(v) => setBulkData({...bulkData, vacina: v})} placeholder="Nome da vacina" opcoesPadrao={[]} />
                  </div>
                )}
                {(bulkData.tipo === 'pesagem') && (
                  <div>
                    <Label>Peso (kg)</Label>
                    <Input type="number" step="0.1" placeholder="0.0" value={bulkData.peso} onChange={(e) => setBulkData({...bulkData, peso: e.target.value})} />
                  </div>
                )}
                <div>
                  <Label>Detalhes</Label>
                  <Input placeholder="Observacoes..." value={bulkData.detalhes} onChange={(e) => setBulkData({...bulkData, detalhes: e.target.value})} />
                </div>
                <Button className="w-full bg-[#4A6741] hover:bg-[#3B5233]" onClick={handleBulkSubmit} disabled={bulkLoading}>
                  {bulkLoading ? 'Registrando...' : 'Registrar em Massa'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditando(null); }}>
            <DialogTrigger asChild>
              <Button className="bg-[#4A6741] hover:bg-[#3B5233]" onClick={() => { setEditando(null); setFormData({ tipo: '', animal_id: '', data: '', detalhes: '', peso: '', vacina: '' }); }}>
                <Plus className="mr-2" size={18} /> Novo Evento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>{editando ? 'Editar Evento' : 'Registrar Evento'}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Tipo *</Label>
                  <SelectEditavel campo="tipo_evento" value={formData.tipo} onValueChange={(v) => setFormData({...formData, tipo: v})} placeholder="Tipo do evento" opcoesPadrao={TIPOS_EVENTOS_PADRAO} />
                </div>
                <div>
                  <Label>Animal *</Label>
                  <Select value={formData.animal_id} onValueChange={(v) => setFormData({...formData, animal_id: v})}>
                    <SelectTrigger><SelectValue placeholder="Selecione o animal" /></SelectTrigger>
                    <SelectContent>
                      {animais.filter(a => a.status === 'ativo').map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.tag} - {a.tipo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Data *</Label>
                  <Input type="date" value={formData.data} onChange={(e) => setFormData({...formData, data: e.target.value})} />
                </div>
                {(formData.tipo === 'vacinacao') && (
                  <div>
                    <Label>Vacina</Label>
                    <SelectEditavel campo="vacina" value={formData.vacina} onValueChange={(v) => setFormData({...formData, vacina: v})} placeholder="Nome da vacina" opcoesPadrao={[]} />
                  </div>
                )}
                {(formData.tipo === 'pesagem') && (
                  <div>
                    <Label>Peso (kg)</Label>
                    <Input type="number" step="0.1" placeholder="0.0" value={formData.peso} onChange={(e) => setFormData({...formData, peso: e.target.value})} />
                  </div>
                )}
                <div>
                  <Label>Detalhes</Label>
                  <Input placeholder="Observacoes..." value={formData.detalhes} onChange={(e) => setFormData({...formData, detalhes: e.target.value})} />
                </div>
                <Button className="w-full bg-[#4A6741] hover:bg-[#3B5233]" onClick={handleSubmit}>
                  {editando ? 'Atualizar' : 'Registrar'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#E8DCC8] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F5F0E8]">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-[#2F1810]">Tipo</th>
              <th className="text-left px-4 py-3 font-semibold text-[#2F1810]">Animal</th>
              <th className="text-left px-4 py-3 font-semibold text-[#2F1810]">Data</th>
              <th className="text-left px-4 py-3 font-semibold text-[#2F1810]">Detalhes</th>
              <th className="text-left px-4 py-3 font-semibold text-[#2F1810]">Peso</th>
              <th className="text-left px-4 py-3 font-semibold text-[#2F1810]">Vacina</th>
              <th className="text-right px-4 py-3 font-semibold text-[#2F1810]">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {eventosFiltrados.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-500">{eventos.length === 0 ? 'Nenhum evento registrado' : 'Nenhum evento encontrado com este filtro'}</td></tr>
            ) : eventosFiltrados.map((evento) => (
              <tr key={evento.id} className="border-t border-[#E8DCC8] hover:bg-[#FFFDF8]">
                <td className="px-4 py-3 capitalize">{evento.tipo}</td>
                <td className="px-4 py-3">{getAnimalTag(evento.animal_id)}</td>
                <td className="px-4 py-3">{new Date(evento.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                <td className="px-4 py-3 max-w-[200px] truncate">{evento.detalhes || '-'}</td>
                <td className="px-4 py-3">{evento.peso ? `${evento.peso} kg` : '-'}</td>
                <td className="px-4 py-3">{evento.vacina || '-'}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => { setEditando(evento); setFormData({ tipo: evento.tipo, animal_id: evento.animal_id, data: evento.data, detalhes: evento.detalhes || '', peso: evento.peso || '', vacina: evento.vacina || '' }); setDialogOpen(true); }} className="p-1.5 rounded-lg hover:bg-[#F5F0E8] text-[#4A6741]">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => handleDelete(evento.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600">
                      <Trash size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
