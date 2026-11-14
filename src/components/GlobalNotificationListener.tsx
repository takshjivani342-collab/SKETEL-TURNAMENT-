import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Key, Trophy, Gift, ShieldCheck, Wallet, ChevronRight, Smartphone, CheckCircle2, Info } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, limit, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { Page, AppNotification, User } from '../types';
import {
  PUSH_PREF_KEY,
  PUSH_UPDATED_EVENT,
  dismissNotificationBanner,
  isNotificationBannerDismissed,
  isPushNotificationsEnabled,
  registerNotificationServiceWorker,
  requestMobileNotificationPermission,
  triggerMobileStatusBarNotification
} from '../utils/mobileNotificationHelper';

interface GlobalNotificationListenerProps {
  user?: User | null;
  joinedMatchIds?: string[];
  onPageChange: (page: Page, id?: string) => void;
  onOpenNotificationsModal?: () => void;
}

export default function GlobalNotificationListener({
  user,
  joinedMatchIds = [],
  onPageChange,
  onOpenNotificationsModal
}: GlobalNotificationListenerProps) {
  const [activePopup, setActivePopup] = useState<AppNotification | null>(null);
  const [showPermissionBanner, setShowPermissionBanner] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<{ text: string; ok: boolean } | null>(null);
  const [pushAllowed, setPushAllowed] = useState(() => isPushNotificationsEnabled());

  const seenNotifIds = useRef<Set<string>>(new Set());
  const initialLoadDone = useRef<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Listen to global push preference toggles from Profile or Modal
  useEffect(() => {
    const syncPushFlag = () => {
      const enabled = isPushNotificationsEnabled();
      setPushAllowed(enabled);
      if (enabled || isNotificationBannerDismissed()) {
        setShowPermissionBanner(false);
      }
    };
    window.addEventListener(PUSH_UPDATED_EVENT, syncPushFlag);
    window.addEventListener('storage', syncPushFlag);
    return () => {
      window.removeEventListener(PUSH_UPDATED_EVENT, syncPushFlag);
      window.removeEventListener('storage', syncPushFlag);
    };
  }, []);

  // Initialize Service Worker & check permission once user is signed in
  useEffect(() => {
    registerNotificationServiceWorker();

    if (!user?.id) {
      setShowPermissionBanner(false);
      return;
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (
        Notification.permission === 'default' &&
        !isNotificationBannerDismissed() &&
        localStorage.getItem(PUSH_PREF_KEY) !== 'false'
      ) {
        const timer = setTimeout(() => {
          setShowPermissionBanner(true);
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [user?.id]);

  // Listen for navigation requests coming from Service Worker notification clicks
  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'NAVIGATE_FROM_NOTIFICATION') {
        if (event.data.actionPage) {
          onPageChange(event.data.actionPage as Page, event.data.targetMatchId);
        } else if (onOpenNotificationsModal) {
          onOpenNotificationsModal();
        }
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      };
    }
  }, [onPageChange, onOpenNotificationsModal]);

  // Gentle audio chime
  const playAlertSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch {
      // Ignore audio restriction
    }
  };

  // Sync browser notification permission status to Firestore user document
  useEffect(() => {
    if (!user?.id) return;

    if ('Notification' in window && Notification.permission === 'granted' && localStorage.getItem(PUSH_PREF_KEY) !== 'false') {
      if (!user.fcmEnabled || !user.notificationsEnabled) {
        updateDoc(doc(db, 'users', user.id), {
          fcmEnabled: true,
          notificationsEnabled: true
        }).catch(() => {});
      }
    }
  }, [user?.id, user?.fcmEnabled, user?.notificationsEnabled]);

  // Listen to Firestore notifications in real-time (only when signed in)
  useEffect(() => {
    if (!user?.id) return;

    const q = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      if (!initialLoadDone.current) {
        snapshot.docs.forEach((d) => seenNotifIds.current.add(d.id));
        initialLoadDone.current = true;
        return;
      }

      // Skip alerts if user explicitly disabled Push Notifications in Profile
      if (localStorage.getItem(PUSH_PREF_KEY) === 'false') {
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const notifId = change.doc.id;
          if (seenNotifIds.current.has(notifId)) return;
          seenNotifIds.current.add(notifId);

          const data = { id: notifId, ...change.doc.data() } as AppNotification;

          let isForUser = true;
          if (data.audience === 'match' && data.targetMatchId) {
            isForUser = joinedMatchIds.includes(data.targetMatchId);
          } else if (data.audience === 'user' && data.targetUserId) {
            isForUser = user?.id === data.targetUserId;
          }

          if (isForUser) {
            setActivePopup(data);
            playAlertSound();

            triggerMobileStatusBarNotification(data.title, data.message, {
              tag: data.id || 'sketel-arena-alert',
              targetMatchId: data.targetMatchId,
              actionPage: data.actionPage,
              icon: '/assets/aistudio/file_00000000d12482108e623996537462ea_f1b955c6.png',
              badge: '/assets/aistudio/file_00000000d12482108e623996537462ea_f1b955c6.png'
            });

            setTimeout(() => {
              setActivePopup((curr) => (curr?.id === notifId ? null : curr));
            }, 6500);
          }
        }
      });
    }, (err) => {
      console.warn('Realtime notifications listener notice:', err);
    });

    return () => unsub();
  }, [user?.id, pushAllowed, JSON.stringify(joinedMatchIds)]);

  const showToast = (text: string, ok: boolean) => {
    setStatusFeedback({ text, ok });
    setTimeout(() => {
      setStatusFeedback((curr) => (curr?.text === text ? null : curr));
    }, 4000);
  };

  const handleEnablePermission = async () => {
    setIsRequestingPermission(true);
    try {
      const res = await requestMobileNotificationPermission(user?.id);
      dismissNotificationBanner();
      setShowPermissionBanner(false);
      setPushAllowed(true);

      if (res === 'granted') {
        showToast('Push notifications enabled!', true);
      } else {
        showToast('In-app alerts enabled! Allow site notifications in browser settings for phone bar.', false);
      }
    } catch (e) {
      console.error(e);
      dismissNotificationBanner();
      setShowPermissionBanner(false);
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const handleDismissPermissionBanner = () => {
    dismissNotificationBanner();
    setShowPermissionBanner(false);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActivePopup(null);
  };

  const handleTap = () => {
    if (!activePopup) return;

    if (user?.id && activePopup.id) {
      updateDoc(doc(db, 'notifications', activePopup.id), {
        readBy: arrayUnion(user.id)
      }).catch(() => {});
    }

    if (activePopup.actionPage) {
      onPageChange(activePopup.actionPage as Page, activePopup.targetMatchId);
    } else if (onOpenNotificationsModal) {
      onOpenNotificationsModal();
    }
    setActivePopup(null);
  };

  const getIcon = (type?: string) => {
    switch (type) {
      case 'room_creds': return <Key size={18} className="text-cyan-400" />;
      case 'tournament': return <Trophy size={18} className="text-amber-400" />;
      case 'offer': return <Gift size={18} className="text-sky-400" />;
      case 'wallet': return <Wallet size={18} className="text-emerald-400" />;
      case 'fairplay': return <ShieldCheck size={18} className="text-teal-400" />;
      default: return <Bell size={18} className="text-cyan-400" />;
    }
  };

  return (
    <>
      {/* 1. Mobile Status Bar Permission Prompt Banner (Sketel Arena Blue/Cyan & Emerald) */}
      <AnimatePresence>
        {showPermissionBanner && (
          <div className="fixed bottom-20 left-0 right-0 z-50 px-3 sm:px-4 pointer-events-none flex justify-center">
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              className="w-full max-w-md bg-[#08172e]/95 border border-cyan-400/50 backdrop-blur-xl p-4 rounded-3xl shadow-2xl shadow-cyan-950/70 pointer-events-auto flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-cyan-900/50">
                  <Smartphone size={20} className="animate-pulse" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-white uppercase tracking-tight truncate">
                    Enable Mobile Status Bar Alerts
                  </h4>
                  <p className="text-[10px] text-slate-300 font-medium truncate mt-0.5">
                    Get instant Room ID & Password in your phone notification bar!
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleEnablePermission}
                  disabled={isRequestingPermission}
                  className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 active:scale-95 text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md transition-all flex items-center gap-1"
                >
                  <Bell size={12} />
                  <span>{isRequestingPermission ? 'Enabling...' : 'Allow'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDismissPermissionBanner}
                  aria-label="Dismiss notification prompt"
                  className="p-1.5 text-slate-400 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Brief Status Feedback Toast */}
      <AnimatePresence>
        {statusFeedback && (
          <div className="fixed bottom-20 left-0 right-0 z-50 px-4 pointer-events-none flex justify-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className={`max-w-md px-4 py-2.5 rounded-2xl border backdrop-blur-xl shadow-xl flex items-center gap-2 text-[11px] font-bold pointer-events-auto ${
                statusFeedback.ok
                  ? 'bg-[#07261f]/95 border-emerald-500/50 text-emerald-300'
                  : 'bg-[#08172e]/95 border-cyan-500/50 text-cyan-200'
              }`}
            >
              {statusFeedback.ok ? (
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
              ) : (
                <Info size={15} className="text-cyan-400 shrink-0" />
              )}
              <span>{statusFeedback.text}</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Floating Live In-App Notification Banner (Sketel Arena Cyan/Blue) */}
      <AnimatePresence>
        {activePopup && (
          <div className="fixed top-3 left-0 right-0 z-50 px-3 sm:px-4 pointer-events-none flex justify-center">
            <motion.div
              initial={{ opacity: 0, y: -40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.95 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              onClick={handleTap}
              className="w-full max-w-md bg-[#081529]/95 backdrop-blur-xl border border-cyan-500/45 p-3.5 rounded-2xl shadow-2xl shadow-cyan-950/70 pointer-events-auto cursor-pointer flex items-center justify-between gap-3 group active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-400/35 flex items-center justify-center shrink-0 shadow-inner">
                  {getIcon(activePopup.type)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-black uppercase tracking-wider text-cyan-400">
                      Live Match Alert
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <h4 className="text-xs font-black text-white truncate leading-tight mt-0.5">
                    {activePopup.title}
                  </h4>
                  <p className="text-[11px] text-slate-300 truncate leading-tight mt-0.5 font-medium">
                    {activePopup.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <div className="w-7 h-7 rounded-lg bg-white/5 group-hover:bg-cyan-500/25 flex items-center justify-center text-slate-400 group-hover:text-white transition-colors">
                  <ChevronRight size={15} />
                </div>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
