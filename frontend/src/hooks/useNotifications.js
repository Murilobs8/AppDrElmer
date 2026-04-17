import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../lib/api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushPermission, setPushPermission] = useState('default');
  const intervalRef = useRef(null);

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setPushSupported(supported);
    if (supported) {
      setPushPermission(Notification.permission);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch (e) {
      // silent fail
    }
  }, []);

  const checkAlerts = useCallback(async () => {
    try {
      await api.post('/notifications/check');
      await fetchNotifications();
    } catch (e) {
      // silent fail
    }
  }, [fetchNotifications]);

  // Auto-check every 5 minutes and on mount
  useEffect(() => {
    checkAlerts();
    intervalRef.current = setInterval(checkAlerts, 5 * 60 * 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checkAlerts]);

  const markAsRead = useCallback(async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) { /* silent */ }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) { /* silent */ }
  }, []);

  const registerServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return null;
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      return registration;
    } catch (e) {
      console.error('SW registration failed:', e);
      return null;
    }
  }, []);

  const subscribeToPush = useCallback(async () => {
    if (!pushSupported) return false;
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      if (permission !== 'granted') return false;

      const registration = await registerServiceWorker();
      if (!registration) return false;

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      let vapidKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        const res = await api.get('/notifications/vapid-key');
        vapidKey = res.data.public_key;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      });

      const subJson = subscription.toJSON();
      await api.post('/notifications/subscribe', {
        endpoint: subJson.endpoint,
        keys: subJson.keys
      });

      setPushEnabled(true);
      return true;
    } catch (e) {
      console.error('Push subscription failed:', e);
      return false;
    }
  }, [pushSupported, registerServiceWorker]);

  const unsubscribeFromPush = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const subJson = subscription.toJSON();
        await api.post('/notifications/unsubscribe', {
          endpoint: subJson.endpoint,
          keys: subJson.keys
        });
        await subscription.unsubscribe();
      }
      setPushEnabled(false);
    } catch (e) {
      console.error('Unsubscribe failed:', e);
    }
  }, []);

  // Check existing subscription on mount
  useEffect(() => {
    if (!pushSupported) return;
    (async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setPushEnabled(!!subscription);
      } catch (e) { /* silent */ }
    })();
  }, [pushSupported]);

  return {
    notifications,
    unreadCount,
    pushSupported,
    pushEnabled,
    pushPermission,
    fetchNotifications,
    checkAlerts,
    markAsRead,
    markAllAsRead,
    subscribeToPush,
    unsubscribeFromPush,
  };
}
