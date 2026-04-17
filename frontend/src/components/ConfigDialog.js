import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { useConfig } from '../contexts/ConfigContext';

export default function ConfigDialog({ open, onClose }) {
  const { config, salvarConfig } = useConfig();
  const [form, setForm] = useState({ nome_fazenda: '', subtitulo: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        nome_fazenda: config.nome_fazenda || '',
        subtitulo: config.subtitulo || '',
      });
    }
  }, [open, config.nome_fazenda, config.subtitulo]);

  const handleSalvar = async () => {
    if (!form.nome_fazenda.trim()) {
      toast.error('Informe o nome da fazenda');
      return;
    }
    setSaving(true);
    try {
      await salvarConfig({
        nome_fazenda: form.nome_fazenda.trim(),
        subtitulo: form.subtitulo.trim() || 'Gestão Rural',
      });
      toast.success('Configurações atualizadas!');
      onClose();
    } catch (e) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md" data-testid="config-dialog">
        <DialogHeader>
          <DialogTitle>Configurações gerais</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-xs text-[#7A8780]">
            Esses valores aparecem no menu lateral, na tela inicial e no título da aba do navegador.
          </p>
          <div>
            <Label htmlFor="cfg-nome">Nome da fazenda *</Label>
            <Input
              id="cfg-nome"
              value={form.nome_fazenda}
              onChange={(e) => setForm({ ...form, nome_fazenda: e.target.value })}
              placeholder="Ex: Filadélfia"
              data-testid="config-nome-fazenda-input"
            />
          </div>
          <div>
            <Label htmlFor="cfg-sub">Subtítulo (topo da sidebar)</Label>
            <Input
              id="cfg-sub"
              value={form.subtitulo}
              onChange={(e) => setForm({ ...form, subtitulo: e.target.value })}
              placeholder="Ex: Gestão Rural"
              data-testid="config-subtitulo-input"
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button
              onClick={handleSalvar}
              disabled={saving}
              className="bg-[#4A6741] hover:bg-[#3B5334] text-white"
              data-testid="config-salvar-btn"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
