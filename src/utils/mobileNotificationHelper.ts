import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export const PUSH_PREF_KEY = 'sketelarena_push_notifications';
export const BANNER_DISMISSED_KEY = 'sketelarena_notif_banner_dismissed';
export const PUSH_UPDATED_EVENT = 'sketelarena:push-updated';

const LOGO_ICON = '/assets/aistudio/file_00000000d12482108e623996537462ea_f1b955c6.png';

export function emitPushStateUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PUSH_UPDATED_EVENT));
  }
}

export function isPushNotificationsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const saved = localStorage.getItem(PUSH_PREF_KEY);
  if (saved === 'false') return false;
  if (saved === 'true') return true;
  if ('Notification' in window && Notification.permission === 'granted') {
    return true;
  }
  return false;
}

export function isNotificationBannerDismissed(): boolean {
  if (typeof window === 'undefined') return true;
  return (
    localStorage.getItem(BANNER_DISMISSED_KEY) === 'true' ||
    sessionStorage.getItem('kg_notif_banner_dismissed') === 'true'
  );
}

export function dismissNotificationBanner() {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
  sessionStorage.setItem('kg_notif_banner_dismissed', 'true');
  emitPushStateUpdated();
}

export async function syncPushPreferenceToFirestore(
  userId: string | undefined,
  enabled: boolean,
  browserPermission?: NotificationPermission
) {
  if (!userId) return;
  const effectivePermission =
    browserPermission ||
    (typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied');

  try {
    await updateDoc(doc(db, 'users', userId), {
      fcmEnabled: enabled && effectivePermission === 'granted',
      notificationsEnabled: enabled
    });
  } catch {
    // Non-fatal if offline or permissions restricted
  }
}

export async function setPushNotificationsPreference(enabled: boolean, userId?: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PUSH_PREF_KEY, String(enabled));
  if (enabled) {
    localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
    sessionStorage.setItem('kg_notif_banner_dismissed', 'true');
  }
  emitPushStateUpdated();
  await syncPushPreferenceToFirestore(userId, enabled);
}

// Register Service Worker for Mobile Notifications
export async function registerNotificationServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  // Avoid claiming root scope inside embedded preview iframes
  if (window.self !== window.top) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    return registration;
  } catch (err) {
    console.warn('Service Worker registration failed:', err);
    return null;
  }
}

// Request Notification Permission from User & Sync with Firestore
export async function requestMobileNotificationPermission(userId?: string): Promise<NotificationPermission> {
  if (typeof window === 'undefined') return 'denied';

  // Always record user intent to enable in-app push alerts and dismiss the prompt banner
  localStorage.setItem(PUSH_PREF_KEY, 'true');
  localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
  sessionStorage.setItem('kg_notif_banner_dismissed', 'true');

  if (!('Notification' in window)) {
    emitPushStateUpdated();
    await syncPushPreferenceToFirestore(userId, true, 'denied');
    return 'denied';
  }

  try {
    let permission: NotificationPermission = Notification.permission;

    if (permission === 'default') {
      const req = Notification.requestPermission();
      if (req && typeof req.then === 'function') {
        permission = await req;
      } else {
        permission = await new Promise<NotificationPermission>((resolve) => {
          Notification.requestPermission((res) => resolve(res));
        });
      }
    }

    if (permission === 'granted') {
      await registerNotificationServiceWorker();
      triggerMobileStatusBarNotification(
        '🔔 Notifications Enabled!',
        'You will now receive instant Room ID, Password, and Match alerts in Sketel Arena.',
        { tag: 'welcome-notification', force: true }
      );
    }

    emitPushStateUpdated();
    await syncPushPreferenceToFirestore(userId, true, permission);
    return permission;
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    emitPushStateUpdated();
    await syncPushPreferenceToFirestore(userId, true, 'denied');
    return 'denied';
  }
}

export interface MobileNotificationOptions {
  tag?: string;
  targetMatchId?: string;
  actionPage?: string;
  icon?: string;
  badge?: string;
  data?: any;
  force?: boolean;
}

// Trigger Native Mobile Status Bar & Lock Screen Notification
export async function triggerMobileStatusBarNotification(
  title: string,
  body: string,
  options: MobileNotificationOptions = {}
) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (!options.force && localStorage.getItem(PUSH_PREF_KEY) === 'false') {
    return;
  }

  if (Notification.permission !== 'granted') {
    return;
  }

  const notifData = {
    url: window.location.origin,
    targetMatchId: options.targetMatchId,
    actionPage: options.actionPage,
    ...(options.data || {})
  };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration('/');
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          icon: options.icon || LOGO_ICON,
          badge: options.badge || LOGO_ICON,
          vibrate: [250, 100, 250, 100, 250],
          tag: options.tag || `sketel-arena-${Date.now()}`,
          renotify: true,
          data: notifData
        } as any);
        return;
      }
    }

    // Standard fallback when no ServiceWorker registration is active
    new Notification(title, {
      body,
      icon: options.icon || LOGO_ICON,
      tag: options.tag || `sketel-arena-${Date.now()}`
    });
  } catch (err) {
    console.warn('Native mobile notification trigger failed:', err);
  }
}
