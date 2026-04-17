import React, { useState, useRef, useEffect } from 'react';
import { Bell, BellRinging, Check, CheckCircle, X, PushPin } from '@phosphor-icons/react';
import { useNotifications } from '../hooks/useNotifications';

export default function NotificationBell() {
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
  const panelRef = useRef(null);

  // Close panel on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Show push prompt after first alerts if not subscribed
  useEffect(() => {
    if (unreadCount > 0 && pushSupported && !pushEnabled && pushPermission === 'default') {
      const dismissed = localStorage.getItem('pushPromptDismissed');
      if (!dismissed) {
        setShowPushPrompt(true);
      }
    }
  }, [unreadCount, pushSupported, pushEnabled, pushPermission]);

  const handleEnablePush = async () => {
    const success = await subscribeToPush();
    if (success) {
      setShowPushPrompt(false);
    }
  };

  const dismissPushPrompt = () => {
    setShowPushPrompt(false);
    localStorage.setItem('pushPromptDismissed', 'true');
  };

  const formatTimeAgo = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}min`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays}d`;
  };

  return (
    <div className="relative" ref={panelRef} data-testid="notification-bell-container">
      {/* Push Prompt Banner */}
      {showPushPrompt && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-[#4A6741] to-[#3B5233] text-white px-4 py-3 flex items-center justify-between shadow-lg" data-testid="push-prompt-banner">
          <div className="flex items-center gap-3">
            <BellRinging size={20} weight="fill" className="animate-pulse" />
            <span className="text-sm font-medium">
              Ativar notificacoes push para receber alertas mesmo com o app fechado?
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleEnablePush}
              className="px-3 py-1 bg-white text-[#4A6741] rounded-md text-sm font-medium hover:bg-[#F5F0E8] transition-colors"
              data-testid="enable-push-btn"
            >
              Ativar
            </button>
            <button
              onClick={dismissPushPrompt}
              className="p-1 hover:bg-white/20 rounded"
              data-testid="dismiss-push-btn"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Bell Button */}
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

      {/* Notification Panel */}
      {open && (
        <div className="fixed left-4 lg:left-[210px] top-[60px] w-[360px] max-h-[480px] bg-white rounded-xl shadow-2xl border border-[#E5E3DB] z-[100] overflow-hidden" data-testid="notification-panel">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E3DB] bg-[#FAFAF7]">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-[#1B2620] text-sm">Notificacoes</h3>
              {unreadCount > 0 && (
                <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full font-medium">
                  {unreadCount} nova(s)
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {/* Push toggle */}
              {pushSupported && (
                <button
                  onClick={pushEnabled ? unsubscribeFromPush : subscribeToPush}
                  className={`p-1.5 rounded-md text-xs transition-colors ${pushEnabled ? 'bg-[#4A6741]/10 text-[#4A6741]' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                  title={pushEnabled ? 'Push ativado - clique para desativar' : 'Ativar notificacoes push'}
                  data-testid="push-toggle-btn"
                >
                  <PushPin size={14} weight={pushEnabled ? 'fill' : 'regular'} />
                </button>
              )}
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="p-1.5 rounded-md hover:bg-[#F5F0E8] text-[#7A8780] transition-colors"
                  title="Marcar todas como lidas"
                  data-testid="mark-all-read-btn"
                >
                  <CheckCircle size={16} />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-md hover:bg-[#F5F0E8] text-[#7A8780] transition-colors"
                data-testid="close-notifications-btn"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto max-h-[400px]">
            {notifications.length === 0 ? (
              <div className="py-12 text-center" data-testid="no-notifications">
                <Bell size={36} className="mx-auto text-[#E5E3DB] mb-2" />
                <p className="text-sm text-[#7A8780]">Nenhuma notificacao</p>
                <p className="text-xs text-[#B0B8B2] mt-1">Os alertas aparecerão aqui</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`px-4 py-3 border-b border-[#F0EDE6] hover:bg-[#FAFAF7] transition-colors cursor-pointer flex items-start gap-3 ${!notif.read ? 'bg-amber-50/50' : ''}`}
                  onClick={() => { if (!notif.read) markAsRead(notif.id); }}
                  data-testid={`notification-item-${notif.id}`}
                >
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 ${
                    notif.urgente ? 'bg-red-100 text-red-500' : 'bg-amber-100 text-amber-500'
                  }`}>
                    <BellRinging size={14} weight="fill" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${!notif.read ? 'font-semibold text-[#1B2620]' : 'text-[#4A4A4A]'}`}>
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-[#B0B8B2] flex-shrink-0">
                        {formatTimeAgo(notif.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-[#7A8780] mt-0.5 line-clamp-2">{notif.body}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        notif.urgente ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                        {notif.urgente ? 'Nunca feito' : 'Vencido'}
                      </span>
                      {!notif.read && (
                        <span className="w-2 h-2 bg-[#4A6741] rounded-full"></span>
                      )}
                    </div>
                  </div>
                  {!notif.read && (
                    <button
                      onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                      className="p-1 rounded hover:bg-[#E5E3DB] text-[#7A8780] flex-shrink-0"
                      title="Marcar como lida"
                    >
                      <Check size={12} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
