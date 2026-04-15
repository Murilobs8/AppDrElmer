import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { Plus, Trash, Pencil, Tag, ListPlus, X } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';

const CORES_PADRAO = ['#4A6741', '#C25934', '#D99B29', '#2B6CB0', '#3B823E', '#8B5CF6', '#EC4899', '#F97316', '#14B8A6', '#6366F1', '#EF4444', '#0EA5E9'];

export default function Despesas() {
  const [despesas, setDespesas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDespesaOpen, setBulkDespesaOpen] = useState(false);
  const [bulkCatOpen, setBulkCatOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formData, setFormData] = useState({ categoria_id: '', valor: '', data: '', descricao: '' });
  const [catForm, setCatForm] = useState({ nome: '', cor: '#4A6741' });
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editandoCat, setEditandoCat] = useState(null);

  // Bulk despesa state
  const [bulkDespesa, setBulkDespesa] = useState({ categoria_id: '', quantidade: '2', valor: '', data_inicio: '', descricao: '', recorrente: false });
  const [bulkDespesaLoading, setBulkDespesaLoading] = useState(false);

  // Bulk categoria state
  const [bulkCats, setBulkCats] = useState([{ nome: '', cor: '#4A6741' }, { nome: '', cor: '#C25934' }]);
  const [bulkCatLoading, setBulkCatLoading] = useState(false);

  useEffect(() => { carregarDados(); }, []);

  const carregarDados = async () => {
    try {
      const [despRes, catRes] = await Promise.all([
        api.get(`/despesas`), api.get(`/categorias`)
      ]);
      setDespesas(despRes.data);
      setCategorias(catRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally { setLoading(false); }
  };

  // ============= DESPESA CRUD =============
  const handleSubmit = async () => {
    if (!formData.categoria_id || !formData.valor || !formData.data) {
      toast.error('Preencha categoria, valor e data');
      return;
    }
    try {
      const payload = { ...formData, valor: parseFloat(formData.valor) };
      if (editando) {
        await api.put(`/despesas/${editando.id}`, payload);
        toast.success('Despesa atualizada!');
      } else {
        await api.post(`/despesas`, payload);
        toast.success('Despesa registrada!');
      }
      setDialogOpen(false); setEditando(null);
      setFormData({ categoria_id: '', valor: '', data: '', descricao: '' });
      carregarDados();
    } catch (error) { toast.error(error.response?.data?.detail || 'Erro ao salvar despesa'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir esta despesa?')) return;
    try { await api.delete(`/despesas/${id}`); toast.success('Despesa excluida!'); carregarDados(); }
    catch { toast.error('Erro ao excluir'); }
  };

  // ============= BULK DESPESA =============
  const handleBulkDespesa = async () => {
    if (!bulkDespesa.categoria_id || !bulkDespesa.valor || !bulkDespesa.data_inicio || !bulkDespesa.quantidade) {
      toast.error('Preencha categoria, valor, data e quantidade');
      return;
    }
    setBulkDespesaLoading(true);
    try {
      const payload = {
        ...bulkDespesa,
        quantidade: parseInt(bulkDespesa.quantidade),
        valor: parseFloat(bulkDespesa.valor),
      };
      const res = await api.post(`/despesas/bulk`, payload);
      toast.success(`${res.data.total} despesa(s) registrada(s) em massa!`);
      setBulkDespesaOpen(false);
      setBulkDespesa({ categoria_id: '', quantidade: '2', valor: '', data_inicio: '', descricao: '', recorrente: false });
      carregarDados();
    } catch (error) { toast.error(error.response?.data?.detail || 'Erro ao registrar despesas em massa'); }
    finally { setBulkDespesaLoading(false); }
  };

  // ============= CATEGORIA CRUD =============
  const handleCatSubmit = async () => {
    if (!catForm.nome) { toast.error('Preencha o nome'); return; }
    try {
      if (editandoCat) {
        await api.put(`/categorias/${editandoCat.id}`, catForm);
        toast.success('Categoria atualizada!');
      } else {
        await api.post(`/categorias`, catForm);
        toast.success('Categoria criada!');
      }
      setCatDialogOpen(false); setEditandoCat(null);
      setCatForm({ nome: '', cor: '#4A6741' });
      carregarDados();
    } catch (error) { toast.error('Erro ao salvar categoria'); }
  };

  const handleDeleteCat = async (id) => {
    if (!window.confirm('Excluir categoria?')) return;
    try { await api.delete(`/categorias/${id}`); toast.success('Categoria excluida!'); carregarDados(); }
    catch { toast.error('Erro ao excluir'); }
  };

  // ============= BULK CATEGORIA =============
  const addBulkCatRow = () => {
    const corIndex = bulkCats.length % CORES_PADRAO.length;
    setBulkCats([...bulkCats, { nome: '', cor: CORES_PADRAO[corIndex] }]);
  };

  const removeBulkCatRow = (index) => {
    if (bulkCats.length <= 1) return;
    setBulkCats(bulkCats.filter((_, i) => i !== index));
  };

  const updateBulkCat = (index, field, value) => {
    const updated = [...bulkCats];
    updated[index] = { ...updated[index], [field]: value };
    setBulkCats(updated);
  };

  const handleBulkCat = async () => {
    const valid = bulkCats.filter(c => c.nome.trim());
    if (valid.length === 0) { toast.error('Preencha pelo menos uma categoria'); return; }
    setBulkCatLoading(true);
    try {
      const res = await api.post(`/categorias/bulk`, { categorias: valid });
      toast.success(`${res.data.total} categoria(s) criada(s) em massa!`);
      setBulkCatOpen(false);
      setBulkCats([{ nome: '', cor: '#4A6741' }, { nome: '', cor: '#C25934' }]);
      carregarDados();
    } catch (error) { toast.error('Erro ao criar categorias em massa'); }
    finally { setBulkCatLoading(false); }
  };

  const getCategoriaNome = (catId) => {
    const cat = categorias.find(c => c.id === catId);
    return cat ? cat.nome : catId;
  };
  const getCategoriaCor = (catId) => {
    const cat = categorias.find(c => c.id === catId);
    return cat ? cat.cor : '#999';
  };

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4A6741]"></div></div>;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="despesas">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#2F1810]">Despesas</h1>
          <TabsList>
            <TabsTrigger value="despesas">Despesas</TabsTrigger>
            <TabsTrigger value="categorias">Categorias</TabsTrigger>
          </TabsList>
        </div>

        {/* ============= TAB DESPESAS ============= */}
        <TabsContent value="despesas">
          <div className="flex justify-end gap-2 mb-4">
            {/* BULK DESPESA */}
            <Dialog open={bulkDespesaOpen} onOpenChange={setBulkDespesaOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="bg-white border-[#4A6741] text-[#4A6741] hover:bg-[#4A6741]/10" onClick={() => setBulkDespesa({ categoria_id: '', quantidade: '2', valor: '', data_inicio: '', descricao: '', recorrente: false })}>
                  <ListPlus className="mr-2" size={18} /> Cadastro em Massa
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Despesas em Massa</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Categoria *</Label>
                    <Select value={bulkDespesa.categoria_id} onValueChange={(v) => setBulkDespesa({...bulkDespesa, categoria_id: v})}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {categorias.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            <span className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: c.cor }}></span>
                              {c.nome}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Quantidade *</Label>
                      <Input type="number" min="1" value={bulkDespesa.quantidade} onChange={(e) => setBulkDespesa({...bulkDespesa, quantidade: e.target.value})} />
                    </div>
                    <div>
                      <Label>Valor (R$) *</Label>
                      <Input type="number" step="0.01" placeholder="0.00" value={bulkDespesa.valor} onChange={(e) => setBulkDespesa({...bulkDespesa, valor: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <Label>Data *</Label>
                    <Input type="date" value={bulkDespesa.data_inicio} onChange={(e) => setBulkDespesa({...bulkDespesa, data_inicio: e.target.value})} />
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="recorrente" checked={bulkDespesa.recorrente} onChange={(e) => setBulkDespesa({...bulkDespesa, recorrente: e.target.checked})} className="rounded border-gray-300" />
                    <Label htmlFor="recorrente" className="cursor-pointer">Recorrente mensal (uma por mes)</Label>
                  </div>
                  <div>
                    <Label>Descricao</Label>
                    <Input placeholder="Descricao..." value={bulkDespesa.descricao} onChange={(e) => setBulkDespesa({...bulkDespesa, descricao: e.target.value})} />
                  </div>
                  <Button className="w-full bg-[#4A6741] hover:bg-[#3B5233]" onClick={handleBulkDespesa} disabled={bulkDespesaLoading}>
                    {bulkDespesaLoading ? 'Registrando...' : 'Registrar em Massa'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* NOVA DESPESA */}
            <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditando(null); }}>
              <DialogTrigger asChild>
                <Button className="bg-[#4A6741] hover:bg-[#3B5233]" onClick={() => { setEditando(null); setFormData({ categoria_id: '', valor: '', data: '', descricao: '' }); }}>
                  <Plus className="mr-2" size={18} /> Nova Despesa
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>{editando ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Categoria *</Label>
                    <Select value={formData.categoria_id} onValueChange={(v) => setFormData({...formData, categoria_id: v})}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {categorias.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            <span className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: c.cor }}></span>
                              {c.nome}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Valor (R$) *</Label>
                    <Input type="number" step="0.01" placeholder="0.00" value={formData.valor} onChange={(e) => setFormData({...formData, valor: e.target.value})} />
                  </div>
                  <div>
                    <Label>Data *</Label>
                    <Input type="date" value={formData.data} onChange={(e) => setFormData({...formData, data: e.target.value})} />
                  </div>
                  <div>
                    <Label>Descricao</Label>
                    <Input placeholder="Descricao..." value={formData.descricao} onChange={(e) => setFormData({...formData, descricao: e.target.value})} />
                  </div>
                  <Button className="w-full bg-[#4A6741] hover:bg-[#3B5233]" onClick={handleSubmit}>
                    {editando ? 'Atualizar' : 'Registrar'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-[#E8DCC8] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#F5F0E8]">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-[#2F1810]">Categoria</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#2F1810]">Valor</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#2F1810]">Data</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#2F1810]">Descricao</th>
                  <th className="text-right px-4 py-3 font-semibold text-[#2F1810]">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {despesas.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-500">Nenhuma despesa registrada</td></tr>
                ) : despesas.map((d) => (
                  <tr key={d.id} className="border-t border-[#E8DCC8] hover:bg-[#FFFDF8]">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: getCategoriaCor(d.categoria_id) }}></span>
                        {getCategoriaNome(d.categoria_id)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-red-600">R$ {parseFloat(d.valor).toFixed(2)}</td>
                    <td className="px-4 py-3">{new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-3 max-w-[250px] truncate">{d.descricao || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => { setEditando(d); setFormData({ categoria_id: d.categoria_id, valor: d.valor, data: d.data, descricao: d.descricao || '' }); setDialogOpen(true); }} className="p-1.5 rounded-lg hover:bg-[#F5F0E8] text-[#4A6741]">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => handleDelete(d.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600">
                          <Trash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ============= TAB CATEGORIAS ============= */}
        <TabsContent value="categorias">
          <div className="flex justify-end gap-2 mb-4">
            {/* BULK CATEGORIAS */}
            <Dialog open={bulkCatOpen} onOpenChange={setBulkCatOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="bg-white border-[#4A6741] text-[#4A6741] hover:bg-[#4A6741]/10" onClick={() => setBulkCats([{ nome: '', cor: '#4A6741' }, { nome: '', cor: '#C25934' }])}>
                  <ListPlus className="mr-2" size={18} /> Cadastro em Massa
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Categorias em Massa</DialogTitle></DialogHeader>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                  {bulkCats.map((cat, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <span className="text-xs text-gray-400 w-5">{index + 1}.</span>
                      <Input placeholder="Nome da categoria" value={cat.nome} onChange={(e) => updateBulkCat(index, 'nome', e.target.value)} className="flex-1" />
                      <div className="flex items-center gap-1">
                        <input type="color" value={cat.cor} onChange={(e) => updateBulkCat(index, 'cor', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
                        <div className="flex gap-0.5">
                          {CORES_PADRAO.slice(0, 6).map(cor => (
                            <button key={cor} onClick={() => updateBulkCat(index, 'cor', cor)} className={`w-4 h-4 rounded-full border-2 transition-all ${cat.cor === cor ? 'border-gray-800 scale-125' : 'border-transparent'}`} style={{ backgroundColor: cor }} />
                          ))}
                        </div>
                      </div>
                      <button onClick={() => removeBulkCatRow(index)} className="p-1 text-red-400 hover:text-red-600" disabled={bulkCats.length <= 1}>
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full border-dashed" onClick={addBulkCatRow}>
                    <Plus size={16} className="mr-2" /> Adicionar Linha
                  </Button>
                </div>
                <Button className="w-full bg-[#4A6741] hover:bg-[#3B5233] mt-2" onClick={handleBulkCat} disabled={bulkCatLoading}>
                  {bulkCatLoading ? 'Criando...' : `Criar ${bulkCats.filter(c => c.nome.trim()).length} Categoria(s)`}
                </Button>
              </DialogContent>
            </Dialog>

            {/* NOVA CATEGORIA */}
            <Dialog open={catDialogOpen} onOpenChange={(v) => { setCatDialogOpen(v); if (!v) setEditandoCat(null); }}>
              <DialogTrigger asChild>
                <Button className="bg-[#4A6741] hover:bg-[#3B5233]" onClick={() => { setEditandoCat(null); setCatForm({ nome: '', cor: '#4A6741' }); }}>
                  <Tag className="mr-2" size={18} /> Nova Categoria
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader><DialogTitle>{editandoCat ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Nome *</Label>
                    <Input placeholder="Nome da categoria" value={catForm.nome} onChange={(e) => setCatForm({...catForm, nome: e.target.value})} />
                  </div>
                  <div>
                    <Label>Cor</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={catForm.cor} onChange={(e) => setCatForm({...catForm, cor: e.target.value})} className="w-10 h-10 rounded cursor-pointer border-0 p-0" />
                      <div className="flex gap-1 flex-wrap">
                        {CORES_PADRAO.map(cor => (
                          <button key={cor} onClick={() => setCatForm({...catForm, cor})} className={`w-6 h-6 rounded-full border-2 transition-all ${catForm.cor === cor ? 'border-gray-800 scale-110' : 'border-transparent hover:border-gray-300'}`} style={{ backgroundColor: cor }} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button className="w-full bg-[#4A6741] hover:bg-[#3B5233]" onClick={handleCatSubmit}>
                    {editandoCat ? 'Atualizar' : 'Criar'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-[#E8DCC8] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#F5F0E8]">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-[#2F1810]">Cor</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#2F1810]">Nome</th>
                  <th className="text-right px-4 py-3 font-semibold text-[#2F1810]">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {categorias.length === 0 ? (
                  <tr><td colSpan={3} className="text-center py-8 text-gray-500">Nenhuma categoria</td></tr>
                ) : categorias.map((c) => (
                  <tr key={c.id} className="border-t border-[#E8DCC8] hover:bg-[#FFFDF8]">
                    <td className="px-4 py-3"><span className="w-5 h-5 rounded-full inline-block border border-gray-200" style={{ backgroundColor: c.cor }}></span></td>
                    <td className="px-4 py-3 font-medium">{c.nome}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => { setEditandoCat(c); setCatForm({ nome: c.nome, cor: c.cor }); setCatDialogOpen(true); }} className="p-1.5 rounded-lg hover:bg-[#F5F0E8] text-[#4A6741]">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => handleDeleteCat(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600">
                          <Trash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
