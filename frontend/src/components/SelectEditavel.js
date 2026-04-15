import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Plus, Pencil, Trash, X, Check, ArrowLeft } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';

export default function SelectEditavel({ campo, value, onValueChange, placeholder, opcoesPadrao = [], allowNone = false, noneLabel = 'Nenhum' }) {
  const [opcoes, setOpcoes] = useState([]);
  const [removidos, setRemovidos] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [novaOpcao, setNovaOpcao] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [editandoValor, setEditandoValor] = useState('');

  useEffect(() => { carregarOpcoes(); }, [campo]);

  const carregarOpcoes = async () => {
    try {
      const [res, remRes] = await Promise.all([
        api.get(`/opcoes?campo=${campo}`),
        api.get(`/opcoes?campo=${campo}_removido`)
      ]);
      setOpcoes(res.data);
      setRemovidos(remRes.data.map(r => r.valor));
    } catch (e) { /* silencioso */ }
  };

  const padroesAtivos = opcoesPadrao.filter(op => !removidos.includes(op));
  const todasOpcoes = [...padroesAtivos, ...opcoes.map(o => o.valor)];
  const opcoesUnicas = [...new Set(todasOpcoes)].sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const handleAdicionar = async () => {
    if (!novaOpcao.trim()) return;
    if (opcoesUnicas.includes(novaOpcao.trim())) { toast.error('Opcao ja existe'); return; }
    try {
      await api.post(`/opcoes`, { campo, valor: novaOpcao.trim() });
      setNovaOpcao(''); carregarOpcoes();
      toast.success('Opcao adicionada!');
    } catch (e) { toast.error('Erro ao adicionar'); }
  };

  const handleEditar = async (id) => {
    if (!editandoValor.trim()) return;
    try {
      await api.put(`/opcoes/${id}`, { campo, valor: editandoValor.trim() });
      setEditandoId(null); setEditandoValor(''); carregarOpcoes();
      toast.success('Opcao atualizada!');
    } catch (e) { toast.error('Erro ao editar'); }
  };

  const handleDeletar = async (id) => {
    if (opcoesUnicas.length <= 1) { toast.error('E necessario manter pelo menos 1 opcao na lista'); return; }
    if (!window.confirm('Excluir esta opcao?')) return;
    try {
      await api.delete(`/opcoes/${id}`);
      carregarOpcoes(); toast.success('Opcao removida!');
    } catch (e) { toast.error('Erro ao remover'); }
  };

  const handleEditarPadrao = async (valorOriginal) => {
    if (!editandoValor.trim() || editandoValor.trim() === valorOriginal) { setEditandoId(null); return; }
    try {
      // Salva no banco com o valor original como referencia para substituir
      await api.post(`/opcoes`, { campo, valor: editandoValor.trim() });
      await api.post(`/opcoes`, { campo: `${campo}_removido`, valor: valorOriginal });
      setEditandoId(null); setEditandoValor(''); carregarOpcoes();
      toast.success('Opcao atualizada!');
    } catch (e) { toast.error('Erro ao editar'); }
  };

  const handleDeletarPadrao = async (valor) => {
    if (opcoesUnicas.length <= 1) { toast.error('E necessario manter pelo menos 1 opcao na lista'); return; }
    if (!window.confirm(`Excluir a opcao "${valor}"?`)) return;
    try {
      await api.post(`/opcoes`, { campo: `${campo}_removido`, valor });
      carregarOpcoes(); toast.success('Opcao removida!');
    } catch (e) { toast.error('Erro ao remover'); }
  };

  return (
    <div className="space-y-1">
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Select value={value || (allowNone ? `none_${campo}` : '')} onValueChange={(v) => onValueChange(v === `none_${campo}` ? '' : v)}>
            <SelectTrigger data-testid={`${campo}-select`}><SelectValue placeholder={placeholder} /></SelectTrigger>
            <SelectContent>
              {allowNone && <SelectItem value={`none_${campo}`}>{noneLabel}</SelectItem>}
              {opcoesUnicas.map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(true)} className="h-9 px-2 border-[#4A6741] text-[#4A6741] hover:bg-[#E8F0E6]" data-testid={`add-opcao-${campo}`}>
          <Plus size={16} />
        </Button>
      </div>

      {/* Dialog de gerenciamento de opcoes */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-testid={`opcoes-dialog-${campo}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <button onClick={() => setDialogOpen(false)} className="text-[#7A8780] hover:text-[#1B2620]"><ArrowLeft size={20} /></button>
              Gerenciar Opcoes
            </DialogTitle>
          </DialogHeader>

          {/* Adicionar nova */}
          <div className="flex gap-2">
            <Input
              value={novaOpcao}
              onChange={(e) => setNovaOpcao(e.target.value)}
              placeholder="Digite nova opcao..."
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdicionar(); } }}
              data-testid={`nova-opcao-input-${campo}`}
            />
            <Button type="button" onClick={handleAdicionar} className="bg-[#4A6741] hover:bg-[#3B5334] text-white" data-testid={`salvar-opcao-${campo}`}>
              <Plus size={18} className="mr-1" /> Adicionar
            </Button>
          </div>

          {/* Lista de opcoes */}
          <div className="border border-[#E5E3DB] rounded-lg divide-y divide-[#E5E3DB] max-h-64 overflow-y-auto">
            {opcoesUnicas.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-[#7A8780]">Nenhuma opcao cadastrada</div>
            )}
            {opcoesUnicas.sort((a, b) => a.localeCompare(b, 'pt-BR')).map(op => {
              const opcaoDb = opcoes.find(o => o.valor === op);
              const isPadrao = opcoesPadrao.includes(op) && !opcaoDb;
              const itemId = opcaoDb ? opcaoDb.id : `padrao-${op}`;

              return (
                <div key={itemId} className="flex items-center justify-between px-4 py-3">
                  {editandoId === itemId ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editandoValor}
                        onChange={(e) => setEditandoValor(e.target.value)}
                        className="h-8 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (opcaoDb) handleEditar(opcaoDb.id);
                            else handleEditarPadrao(op);
                          }
                        }}
                        autoFocus
                      />
                      <button onClick={() => opcaoDb ? handleEditar(opcaoDb.id) : handleEditarPadrao(op)} className="text-[#3B823E] hover:text-[#2E6831] p-1"><Check size={18} /></button>
                      <button onClick={() => { setEditandoId(null); setEditandoValor(''); }} className="text-[#7A8780] p-1"><X size={18} /></button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm text-[#1B2620] font-medium">{op}</span>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditandoId(itemId); setEditandoValor(op); }} className="text-[#4A6741] hover:text-[#3B5334] p-1"><Pencil size={16} /></button>
                        <button onClick={() => opcaoDb ? handleDeletar(opcaoDb.id) : handleDeletarPadrao(op)} className="text-[#C25934] hover:text-[#A64B2B] p-1"><Trash size={16} /></button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end">
            <Button type="button" onClick={() => setDialogOpen(false)} className="bg-[#4A6741] hover:bg-[#3B5334] text-white" data-testid={`fechar-opcoes-${campo}`}>
              Concluido
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
