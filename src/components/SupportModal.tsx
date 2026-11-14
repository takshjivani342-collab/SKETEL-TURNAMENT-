import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, Mail, X, ExternalLink, ShieldCheck, ChevronRight, Loader2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SupportModal({ isOpen, onClose }: SupportModalProps) {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      const fetchSettings = async () => {
        try {
          const snap = await getDoc(doc(db, 'appSettings', 'referral_support'));
          if (snap.exists()) {
            setSettings(snap.data().support);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      };
      fetchSettings();
    }
  }, [isOpen]);

  const rawDiscord = settings?.discord?.trim() || 'https://discord.com';
  const discordLink =
    rawDiscord.startsWith('http://') || rawDiscord.startsWith('https://')
      ? rawDiscord
      : `https://${rawDiscord}`;

  const supportEmail = settings?.email?.trim() || 'support@sketelarena.com';

  const DiscordIcon = ({ size = 24 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );

  const supportOptions = [
    { 
      label: 'Discord', 
      icon: DiscordIcon, 
      color: 'bg-[#5865F2]', 
      link: discordLink,
      desc: 'Join our Discord server for instant support'
    },
    { 
      label: 'Email', 
      icon: Mail, 
      color: 'bg-purple-600', 
      link: `mailto:${supportEmail}`,
      desc: supportEmail
    },
    ...(settings?.telegram?.trim() ? [{
      label: 'Telegram', 
      icon: Send, 
      color: 'bg-[#0088cc]', 
      link: settings.telegram.trim().startsWith('http') ? settings.telegram.trim() : `https://${settings.telegram.trim()}`,
      desc: 'Join our community channel'
    }] : []),
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 md:p-5">
           <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
           />
           
           <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-lg bg-neutral-900 rounded-t-[3rem] p-8 pb-12 border-t border-neutral-800 flex flex-col max-h-[80vh] overflow-hidden"
           >
             <div className="flex justify-between items-center mb-8">
               <div>
                  <h3 className="text-xl font-bold tracking-tighter uppercase italic text-white leading-none">
                    Customer <span className="text-purple-500">Support</span>
                  </h3>
                  <p className="text-[8px] font-black uppercase tracking-widest text-neutral-600 mt-1">We're here to help you</p>
               </div>
               <button onClick={onClose} className="p-2 text-neutral-500 hover:text-white transition-colors">
                 <X size={24} />
               </button>
             </div>

             <div className="overflow-y-auto no-scrollbar space-y-6">
                {/* Status Card */}
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">System Status: Operational</span>
                   </div>
                   <ShieldCheck size={14} className="text-emerald-500/30" />
                </div>

                {loading ? (
                  <div className="py-20 flex flex-col items-center justify-center">
                    <Loader2 className="text-purple-500 animate-spin mb-4" size={32} />
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-600 italic">Syncing communication channels...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {supportOptions.map((opt) => (
                      <a 
                        key={opt.label}
                        href={opt.link}
                        target={opt.link.startsWith('mailto:') ? undefined : '_blank'}
                        rel={opt.link.startsWith('mailto:') ? undefined : 'noreferrer'}
                        className="p-5 bg-neutral-800 border border-neutral-700 rounded-3xl flex items-center justify-between group active:scale-[0.98] transition-all hover:bg-neutral-800/80 hover:border-purple-500/30"
                      >
                        <div className="flex items-center gap-5">
                          <div className={`w-12 h-12 rounded-2xl ${opt.color} flex items-center justify-center text-white shadow-lg`}>
                            <opt.icon size={24} />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold uppercase tracking-tight text-white">{opt.label}</h4>
                            <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500 italic">{opt.desc}</p>
                          </div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center text-neutral-600 group-hover:text-purple-500 transition-colors">
                           <ChevronRight size={18} />
                        </div>
                      </a>
                    ))}
                  </div>
                )}
                
                <div className="p-6 bg-black/40 rounded-3xl border border-white/5 mt-4">
                   <p className="text-[8px] font-black italic text-neutral-600 uppercase tracking-[0.2em] leading-relaxed text-center">
                      Our support team typically responds within 30-60 minutes during active hours. For transaction issues, please provide your Transaction ID.
                   </p>
                </div>
             </div>
           </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
