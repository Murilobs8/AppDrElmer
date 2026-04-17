import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { MagnifyingGlass, Cow, ArrowsLeftRight, Calendar, CurrencyDollar, Drop, Bell, X } from '@phosphor-icons/react';

/**
 * Busca global com atalho Ctrl+K / ⌘K.
 * Carrega dados de todas as coleções quando aberto e filtra client-side.
 */
export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ animais: [], movimentacoes: [], eventos: [], despesas: [], producoes: [], lembretes: [], categorias: [] });
  const [sel, setSel] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) { setQ(''); setSel(0); return; }
    setTimeout(() => inputRef.current?.focus(), 50);
    // Só carrega quando abre pela primeira vez ou se data estiver vazia
    if (data.animais.length === 0) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const carregar = async () => {
    setLoading(true);
    try {
      const [a, m, e, d, p, l, c] = await Promise.all([
        api.get('/animais').catch(() => ({ data: [] })),
        api.get('/movimentacoes').catch(() => ({ data: [] })),
        api.get('/eventos').catch(() => ({ data: [] })),
        api.get('/despesas').catch(() => ({ data: [] })),
        api.get('/producoes').catch(() => ({ data: [] })),
        api.get('/lembretes').catch(() => ({ data: [] })),
        api.get('/categorias').catch(() => ({ data: [] })),
      ]);
      setData({ animais: a.data, movimentacoes: m.data, eventos: e.data, despesas: d.data, producoes: p.data, lembretes: l.data, categorias: c.data });
    } finally { setLoading(false); }
  };

  const resultados = useMemo(() => {
    if (!q.trim()) return [];
    const s = q.toLowerCase();
    const out = [];
    const tagAnimal = (id) => data.animais.find(a => a.id === id);

    // Animais por tag/tipo/observações
    for (const a of data.animais) {
      if (out.length >= 30) break;
      if (
        a.tag?.toLowerCase().includes(s) ||
        a.tipo?.toLowerCase().includes(s) ||
        a.observacoes?.toLowerCase().includes(s)
      ) {
        out.push({
          tipo: 'animal',
          icon: Cow,
          titulo: a.tag,
          subtitulo: `${a.tipo || ''} · ${a.sexo === 'macho' ? 'Macho' : a.sexo === 'femea' ? 'Fêmea' : 'Sem sexo'} · ${a.status}`,
          onClick: () => navigate(`/animais?open=${a.id}`),
        });
      }
    }
    // Movimentações por motivo/observações + tag do animal
    for (const m of data.movimentacoes) {
      if (out.length >= 40) break;
      const an = tagAnimal(m.animal_id);
      if (
        m.motivo?.toLowerCase().includes(s) ||
        m.observacoes?.toLowerCase().includes(s) ||
        (an?.tag || '').toLowerCase().includes(s)
      ) {
        out.push({
          tipo: 'movimentacao',
          icon: ArrowsLeftRight,
          titulo: `${m.tipo === 'entrada' ? 'Entrada' : m.tipo === 'saida' ? 'Saída' : 'Movim.'} · ${m.motivo}`,
          subtitulo: `${an ? an.tag + ' · ' : ''}${new Date(m.data + 'T00:00:00').toLocaleDateString('pt-BR')}${m.valor ? ` · R$ ${m.valor}` : ''}`,
          onClick: () => navigate('/movimentacoes'),
        });
      }
    }
    // Eventos
    for (const ev of data.eventos) {
      if (out.length >= 50) break;
      const an = tagAnimal(ev.animal_id);
      if (
        ev.tipo?.toLowerCase().includes(s) ||
        ev.vacina?.toLowerCase().includes(s) ||
        ev.detalhes?.toLowerCase().includes(s) ||
        (an?.tag || '').toLowerCase().includes(s)
      ) {
        out.push({
          tipo: 'evento',
          icon: Calendar,
          titulo: `${ev.tipo}${ev.vacina ? ' · ' + ev.vacina : ''}`,
          subtitulo: `${an ? an.tag + ' · ' : ''}${new Date(ev.data + 'T00:00:00').toLocaleDateString('pt-BR')}${ev.peso ? ` · ${ev.peso}kg` : ''}`,
          onClick: () => an ? navigate(`/animais?open=${an.id}`) : navigate('/eventos'),
        });
      }
    }
    // Despesas
    for (const d of data.despesas) {
      if (out.length >= 60) break;
      const cat = data.categorias.find(c => c.id === d.categoria_id);
      if (
        d.descricao?.toLowerCase().includes(s) ||
        (cat?.nome || '').toLowerCase().includes(s)
      ) {
        out.push({
          tipo: 'despesa',
          icon: CurrencyDollar,
          titulo: d.descricao || (cat?.nome || 'Despesa'),
          subtitulo: `${cat?.nome || ''} · R$ ${d.valor} · ${new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR')}`,
          onClick: () => navigate('/despesas'),
        });
      }
    }
    // Produções
    for (const p of data.producoes) {
      if (out.length >= 70) break;
      if (
        p.motivo?.toLowerCase().includes(s) ||
        p.observacoes?.toLowerCase().includes(s) ||
        (p.tipo_animal || '').toLowerCase().includes(s)
      ) {
        out.push({
          tipo: 'producao',
          icon: Drop,
          titulo: `Produção · ${p.motivo}`,
          subtitulo: `${p.tipo_animal || ''} · ${p.quantidade}${p.unidade ? ' ' + p.unidade : ''}${p.valor ? ` · R$ ${p.valor}` : ''}`,
          onClick: () => navigate('/producao'),
        });
      }
    }
    // Lembretes (regras)
    for (const l of data.lembretes) {
      if (out.length >= 80) break;
      if (
        l.nome?.toLowerCase().includes(s) ||
        l.tipo_acao?.toLowerCase().includes(s) ||
        l.mensagem?.toLowerCase().includes(s)
      ) {
        out.push({
          tipo: 'lembrete',
          icon: Bell,
          titulo: l.nome,
          subtitulo: `${l.tipo_acao}${l.ativo ? '' : ' · inativo'}`,
          onClick: () => navigate('/lembretes'),
        });
      }
    }
    return out;
  }, [q, data, navigate]);

  const escolher = (item) => {
    item?.onClick?.();
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, resultados.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
      else if (e.key === 'Enter') { e.preventDefault(); if (resultados[sel]) escolher(resultados[sel]); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resultados, sel]);

  useEffect(() => { setSel(0); }, [q]);

  if (!open) return null;

  const grupos = resultados.reduce((acc, r) => {
    if (!acc[r.tipo]) acc[r.tipo] = [];
    acc[r.tipo].push(r);
    return acc;
  }, {});
  const ordem = ['animal', 'movimentacao', 'evento', 'producao', 'despesa', 'lembrete'];
  const labels = { animal: 'Animais', movimentacao: 'Movimentações', evento: 'Eventos', producao: 'Produção', despesa: 'Despesas', lembrete: 'Lembretes' };

  let idx = -1;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] bg-black/50 backdrop-blur-sm" onClick={onClose} data-testid="cmd-palette">
      <div className="w-full max-w-2xl mx-4 bg-white dark:bg-[#1B2620] rounded-xl shadow-2xl border border-[#E5E3DB] dark:border-[#2A3530] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E5E3DB] dark:border-[#2A3530]">
          <MagnifyingGlass size={20} className="text-[#7A8780]" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar animais, movimentações, eventos, despesas, produções..."
            className="flex-1 bg-transparent outline-none text-[#1B2620] dark:text-[#E5E3DB] placeholder:text-[#7A8780] text-sm"
            data-testid="cmd-input"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-[#F4F3F0] dark:bg-[#141C18] text-[#7A8780] border border-[#E5E3DB] dark:border-[#2A3530]">ESC</kbd>
          <button onClick={onClose} className="text-[#7A8780] hover:text-[#1B2620] dark:hover:text-[#E5E3DB]"><X size={16} /></button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {loading && <div className="p-6 text-center text-sm text-[#7A8780]">Carregando dados...</div>}
          {!loading && !q && <div className="p-6 text-center text-sm text-[#7A8780]">Digite para buscar em todas as abas do sistema · Use ↑ ↓ e Enter</div>}
          {!loading && q && resultados.length === 0 && <div className="p-6 text-center text-sm text-[#7A8780]">Nada encontrado para "{q}"</div>}
          {!loading && resultados.length > 0 && (
            <div className="py-2">
              {ordem.filter(o => grupos[o]?.length).map(grupoKey => (
                <div key={grupoKey} className="mb-1">
                  <div className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#7A8780]">{labels[grupoKey]} ({grupos[grupoKey].length})</div>
                  {grupos[grupoKey].map((r, i) => {
                    idx++;
                    const atual = idx === sel;
                    const Icon = r.icon;
                    return (
                      <button
                        key={`${grupoKey}-${i}`}
                        onClick={() => escolher(r)}
                        onMouseEnter={() => setSel(idx)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${atual ? 'bg-[#E8F0E6] dark:bg-[#243029]' : 'hover:bg-[#F4F3F0] dark:hover:bg-[#243029]'}`}
                        data-testid={`cmd-item-${grupoKey}-${i}`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${atual ? 'bg-[#4A6741] text-white' : 'bg-[#F4F3F0] dark:bg-[#141C18] text-[#4A6741]'}`}>
                          <Icon size={16} weight={atual ? 'fill' : 'regular'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1B2620] dark:text-[#E5E3DB] truncate">{r.titulo}</p>
                          <p className="text-xs text-[#7A8780] truncate">{r.subtitulo}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-2 border-t border-[#E5E3DB] dark:border-[#2A3530] bg-[#F4F3F0] dark:bg-[#141C18] text-[10px] text-[#7A8780]">
          <span>{resultados.length > 0 ? `${resultados.length} resultado(s)` : `${data.animais.length + data.movimentacoes.length + data.eventos.length + data.despesas.length + data.producoes.length + data.lembretes.length} item(ns) no total`}</span>
          <div className="flex items-center gap-3">
            <span><kbd className="text-[10px] px-1 py-0.5 rounded bg-white dark:bg-[#1B2620] border border-[#E5E3DB] dark:border-[#2A3530]">↑↓</kbd> navegar</span>
            <span><kbd className="text-[10px] px-1 py-0.5 rounded bg-white dark:bg-[#1B2620] border border-[#E5E3DB] dark:border-[#2A3530]">↵</kbd> abrir</span>
          </div>
        </div>
      </div>
    </div>
  );
}
