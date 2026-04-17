import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellRinging, Check, CheckCircle, X, PushPin, CaretDown, CaretRight } from '@phosphor-icons/react';
import { useNotifications } from '../hooks/useNotifications';

export default function NotificationBell() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    pushSupported,
    pushEnabled,
    pushPermission,
    markAsRead,
    markAllAsRead,
    subscribeToPush,
    unsubscribeFromPush,
    checkAlerts,
  } = useNotifications();

  const [open, setOpen] = useState(false);
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [expandidos, setExpandidos] = useState(new Set());
  const panelRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (unreadCount > 0 && pushSupported && !pushEnabled && pushPermission === 'default') {
      const dismissed = localStorage.getItem('pushPromptDismissed');
      if (!dismissed) setShowPushPrompt(true);
    }
  }, [unreadCount, pushSupported, pushEnabled, pushPermission]);

  const handleEnablePush = async () => {
    const success = await subscribeToPush();
    if (success) setShowPushPrompt(false);
  };
  const dismissPushPrompt = () => {
    setShowPushPrompt(false);
    localStorage.setItem('pushPromptDismissed', 'true');
  };

  // Extrai o nome do lembrete (fallback para notifs antigas sem lembrete_nome)
  const getLembreteNome = (n) => {
    if (n.lembrete_nome) return n.lembrete_nome;
    // Fallback: body = "nome: tag (tipo)" → pega nome antes de ":"
    if (n.body && n.body.includes(':')) return n.body.split(':')[0].trim();
    return n.title || 'Geral';
  };

  // Agrupamento em 3 níveis: tipo_acao → lembrete_nome → notificações
  const gruposAcao = useMemo(() => {
    const porAcao = new Map();
    for (const n of notifications) {
      const tipoKey = n.tipo_acao || 'outro';
      if (!porAcao.has(tipoKey)) {
        porAcao.set(tipoKey, {
          tipo_acao: tipoKey,
          itensTotal: 0,
          urgentesTotal: 0,
          unreadTotal: 0,
          lembretes: new Map(),
        });
      }
      const ga = porAcao.get(tipoKey);
      ga.itensTotal += 1;
      if (n.urgente) ga.urgentesTotal += 1;
      if (!n.read) ga.unreadTotal += 1;

      // Nivel 2
      const lembKey = getLembreteNome(n);
      if (!ga.lembretes.has(lembKey)) {
        ga.lembretes.set(lembKey, {
          lembrete_nome: lembKey,
          tipo_acao: tipoKey,
          mensagem: n.mensagem || '',
          itens: [],
          urgentes: 0,
          unreadCount: 0,
        });
      }
      const gl = ga.lembretes.get(lembKey);
      gl.itens.push(n);
      if (n.urgente) gl.urgentes += 1;
      if (!n.read) gl.unreadCount += 1;
    }
    return Array.from(porAcao.values())
      .map(g => ({
        ...g,
        lembretes: Array.from(g.lembretes.values()).sort((a, b) => {
          if (b.unreadCount !== a.unreadCount) return b.unreadCount - a.unreadCount;
          if (b.urgentes !== a.urgentes) return b.urgentes - a.urgentes;
          return a.lembrete_nome.localeCompare(b.lembrete_nome);
        }),
      }))
      .sort((a, b) => {
        if (b.unreadTotal !== a.unreadTotal) return b.unreadTotal - a.unreadTotal;
        if (b.urgentesTotal !== a.urgentesTotal) return b.urgentesTotal - a.urgentesTotal;
        return a.tipo_acao.localeCompare(b.tipo_acao);
      });
  }, [notifications]);

  const toggleGrupo = (key) => {
    const n = new Set(expandidos);
    if (n.has(key)) n.delete(key); else n.add(key);
    setExpandidos(n);
  };

  const marcarGrupoLido = async (itens, e) => {
    e.stopPropagation();
    for (const n of itens) {
      if (!n.read) await markAsRead(n.id);
    }
  };

  const abrirHistorico = (animalId, notifId, e) => {
    e.stopPropagation();
    if (notifId) markAsRead(notifId);
    if (animalId) {
      setOpen(false);
      navigate(`/animais?open=${animalId}`);
    }
  };

  return (
    <div className="relative" ref={panelRef} data-testid="notification-bell-container">
      {showPushPrompt && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-[#4A6741] to-[#3B5233] text-white px-4 py-3 flex items-center justify-between shadow-lg" data-testid="push-prompt-banner">
          <div className="flex items-center gap-3">
            <BellRinging size={20} weight="fill" className="animate-pulse" />
            <span className="text-sm font-medium">Ativar notificações push para receber alertas mesmo com o app fechado?</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleEnablePush} className="px-3 py-1 bg-white text-[#4A6741] rounded-md text-sm font-medium hover:bg-[#F5F0E8] transition-colors" data-testid="enable-push-btn">Ativar</button>
            <button onClick={dismissPushPrompt} className="p-1 hover:bg-white/20 rounded" data-testid="dismiss-push-btn"><X size={16} /></button>
          </div>
        </div>
      )}

      <button
        onClick={() => { setOpen(!open); if (!open) checkAlerts(); }}
        className="relative p-2 rounded-lg hover:bg-[#2A3730] transition-colors"
        data-testid="notification-bell-btn"
      >
        {unreadCount > 0 ? (
          <BellRinging size={22} weight="fill" className="text-amber-400 animate-pulse" />
        ) : (
          <Bell size={22} className="text-[#E5E3DB]" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center" data-testid="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed left-4 lg:left-[210px] top-[60px] w-[400px] max-h-[560px] bg-white dark:bg-[#1B2620] rounded-xl shadow-2xl border border-[#E5E3DB] dark:border-[#2A3530] z-[100] overflow-hidden" data-testid="notification-panel">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E3DB] dark:border-[#2A3530] bg-[#FAFAF7] dark:bg-[#141C18]">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-[#1B2620] dark:text-[#E5E3DB] text-sm">Notificações</h3>
              {unreadCount > 0 && (
                <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full font-medium">{unreadCount} nova(s)</span>
              )}
              {notifications.length > 0 && (
                <span className="bg-[#4A6741]/10 text-[#4A6741] text-xs px-2 py-0.5 rounded-full font-medium">{gruposAcao.length} ação(ões)</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {pushSupported && (
                <button
                  onClick={pushEnabled ? unsubscribeFromPush : subscribeToPush}
                  className={`p-1.5 rounded-md text-xs transition-colors ${pushEnabled ? 'bg-[#4A6741]/10 text-[#4A6741]' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                  title={pushEnabled ? 'Push ativado - clique para desativar' : 'Ativar notificações push'}
                  data-testid="push-toggle-btn"
                >
                  <PushPin size={14} weight={pushEnabled ? 'fill' : 'regular'} />
                </button>
              )}
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="p-1.5 rounded-md hover:bg-[#F5F0E8] text-[#7A8780] transition-colors" title="Marcar todas como lidas" data-testid="mark-all-read-btn"><CheckCircle size={16} /></button>
              )}
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-md hover:bg-[#F5F0E8] text-[#7A8780] transition-colors" data-testid="close-notifications-btn"><X size={16} /></button>
            </div>
          </div>

          <div className="overflow-y-auto max-h-[480px]">
            {notifications.length === 0 ? (
              <div className="py-12 text-center" data-testid="no-notifications">
                <Bell size={36} className="mx-auto text-[#E5E3DB] mb-2" />
                <p className="text-sm text-[#7A8780]">Nenhuma notificação</p>
                <p className="text-xs text-[#B0B8B2] mt-1">Os alertas aparecerão aqui</p>
              </div>
            ) : (
              gruposAcao.map((ga) => {
                const keyAcao = `acao||${ga.tipo_acao}`;
                const acaoAberto = expandidos.has(keyAcao);
                return (
                  <div key={keyAcao} className="border-b border-[#F0EDE6] dark:border-[#2A3530]">
                    {/* NÍVEL 1: tipo_acao */}
                    <button
                      onClick={() => toggleGrupo(keyAcao)}
                      className={`w-full text-left px-4 py-3 hover:bg-[#FAFAF7] dark:hover:bg-[#243029] transition-colors ${ga.unreadTotal > 0 ? 'bg-amber-50/50 dark:bg-amber-50/20' : ''}`}
                      data-testid={`notif-acao-${ga.tipo_acao}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[#7A8780] flex-shrink-0">{acaoAberto ? <CaretDown size={14} /> : <CaretRight size={14} />}</span>
                        <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center ${ga.urgentesTotal > 0 ? 'bg-red-100 text-red-500' : 'bg-amber-100 text-amber-500'}`}>
                          <BellRinging size={16} weight="fill" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold uppercase tracking-wide text-[#1B2620] dark:text-[#E5E3DB]">{ga.tipo_acao}</p>
                          <div className="flex items-center gap-1 flex-wrap mt-0.5">
                            <span className="text-[10px] bg-[#4A6741]/15 text-[#4A6741] px-1.5 py-0.5 rounded-full font-medium">{ga.lembretes.length} lembrete(s)</span>
                            <span className="text-[10px] bg-[#4A6741]/10 text-[#4A6741] px-1.5 py-0.5 rounded-full font-medium">{ga.itensTotal} animal(is)</span>
                            {ga.urgentesTotal > 0 && (
                              <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">{ga.urgentesTotal} nunca feito</span>
                            )}
                            {ga.unreadTotal > 0 && (
                              <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-medium">{ga.unreadTotal} nova(s)</span>
                            )}
                          </div>
                        </div>
                        {ga.unreadTotal > 0 && (
                          <button
                            onClick={(e) => {
                              const itens = ga.lembretes.flatMap(l => l.itens);
                              marcarGrupoLido(itens, e);
                            }}
                            className="p-1 rounded hover:bg-[#E5E3DB] dark:hover:bg-[#2A3530] text-[#7A8780] flex-shrink-0"
                            title="Marcar todas dessa ação como lidas"
                            data-testid={`mark-acao-read-${ga.tipo_acao}`}
                          >
                            <Check size={14} />
                          </button>
                        )}
                      </div>
                    </button>

                    {/* NÍVEL 2: lembrete_nome */}
                    {acaoAberto && (
                      <div className="bg-[#FAFAF7] dark:bg-[#141C18] border-t border-[#F0EDE6] dark:border-[#2A3530]">
                        {ga.lembretes.map((g) => {
                          const keyLemb = `lemb||${ga.tipo_acao}||${g.lembrete_nome}`;
                          const lembAberto = expandidos.has(keyLemb);
                          return (
                            <div key={keyLemb} className="border-b border-[#F0EDE6] dark:border-[#2A3530] last:border-0">
                              <button
                                onClick={() => toggleGrupo(keyLemb)}
                                className={`w-full text-left pl-10 pr-4 py-2 hover:bg-white dark:hover:bg-[#243029] transition-colors`}
                                data-testid={`notif-lembrete-${keyLemb}`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-[#7A8780] flex-shrink-0">{lembAberto ? <CaretDown size={12} /> : <CaretRight size={12} />}</span>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-xs truncate ${g.unreadCount > 0 ? 'font-semibold text-[#1B2620] dark:text-[#E5E3DB]' : 'text-[#4A4A4A] dark:text-[#8FA099]'}`}>
                                      {g.lembrete_nome}
                                    </p>
                                    <div className="flex items-center gap-1 flex-wrap mt-0.5">
                                      <span className="text-[9px] bg-[#4A6741]/10 text-[#4A6741] px-1.5 py-0.5 rounded-full">{g.itens.length}</span>
                                      {g.urgentes > 0 && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">{g.urgentes} nunca feito</span>}
                                      {g.unreadCount > 0 && <span className="text-[9px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-medium">{g.unreadCount} nova(s)</span>}
                                    </div>
                                  </div>
                                  {g.unreadCount > 0 && (
                                    <button
                                      onClick={(e) => marcarGrupoLido(g.itens, e)}
                                      className="p-1 rounded hover:bg-[#E5E3DB] dark:hover:bg-[#2A3530] text-[#7A8780] flex-shrink-0"
                                      title="Marcar este lembrete como lido"
                                    >
                                      <Check size={12} />
                                    </button>
                                  )}
                                </div>
                              </button>

                              {/* NÍVEL 3: animais */}
                              {lembAberto && (
                                <div className="bg-white dark:bg-[#1B2620] pl-14 pr-4 py-2 space-y-1 border-t border-[#F0EDE6] dark:border-[#2A3530]">
                                  {g.itens.map((n) => (
                                    <div key={n.id} className={`flex items-center justify-between px-2 py-1.5 bg-[#FAFAF7] dark:bg-[#141C18] rounded border border-[#E5E3DB] dark:border-[#2A3530] ${!n.read ? 'border-l-2 border-l-amber-400' : ''}`}>
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <button
                                          onClick={(e) => abrirHistorico(n.animal_id, n.id, e)}
                                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#E8F0E6] text-[#4A6741] hover:bg-[#4A6741] hover:text-white transition-colors font-medium text-[10px] flex-shrink-0"
                                          data-testid={`notif-animal-${n.animal_tag}`}
                                          title="Abrir histórico do animal"
                                        >
                                          {n.animal_tag}
                                          {n.animal_tipo && <span className="opacity-60">({n.animal_tipo})</span>}
                                        </button>
                                        <span className="text-[9px] text-[#7A8780] truncate">
                                          {n.ultimo_evento ? new Date(n.ultimo_evento + 'T00:00:00').toLocaleDateString('pt-BR') : 'Nunca'}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1 flex-shrink-0">
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${n.urgente ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                                          {n.urgente ? 'Nunca' : 'Vencido'}
                                        </span>
                                        {!n.read && (
                                          <button
                                            onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                                            className="p-0.5 rounded hover:bg-[#E5E3DB] dark:hover:bg-[#2A3530] text-[#7A8780]"
                                            title="Marcar como lida"
                                          >
                                            <Check size={10} />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
