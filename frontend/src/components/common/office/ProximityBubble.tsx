import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PlayerData } from './types';
import { toast } from '@/utils/toast';

interface ProximityBubbleProps {
  user: PlayerData | null;
  getAuraCss: (aura: string) => string;
  onInitiateCall?: (userId: number, type: 'voice' | 'video') => void;
  activeCall?: { peerId: number } | null;
  onEndCall?: () => void;
  onWave?: (userId: number) => void;
}

function auraLabel(aura: string): string {
  switch (aura) {
    case 'red':   return '🔴 Overloaded';
    case 'amber': return '🟡 Busy';
    case 'blue':  return '🔵 Focus Mode';
    default:      return '🟢 Available';
  }
}

export default function ProximityBubble({
  user,
  getAuraCss,
  onInitiateCall,
  activeCall,
  onEndCall,
  onWave,
}: ProximityBubbleProps) {
  const [confirmCallType, setConfirmCallType] = React.useState<'voice' | 'video' | null>(null);

  React.useEffect(() => {
    setConfirmCallType(null);
  }, [user?.id]);

  return (
    <AnimatePresence>
      {user && (
        <motion.div
          key={`prox-${user.id}`}
          initial={{ opacity: 0, y: -14, scale: 0.88 }}
          animate={{ opacity: 1, y: 0,   scale: 1 }}
          exit  ={{ opacity: 0, y: -8,  scale: 0.93 }}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          style={{
            position: 'absolute',
            top: 56,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '10px 18px',
            borderRadius: 18,
            background: 'rgba(255, 255, 255, 0.96)',
            border: `1px solid ${getAuraCss(user.aura)}77`,
            backdropFilter: 'blur(18px)',
            boxShadow: `0 10px 30px rgba(0,0,0,0.08), 0 0 20px ${getAuraCss(user.aura)}15`,
            whiteSpace: 'nowrap',
          }}
        >
          {/* Live ping dot */}
          <span style={{ position: 'relative', display: 'flex', width: 12, height: 12 }}>
            <span
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: getAuraCss(user.aura),
                opacity: 0.4,
                animation: 'ping 1.2s ease-in-out infinite',
              }}
            />
            <span
              style={{
                position: 'relative',
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: getAuraCss(user.aura),
                boxShadow: `0 0 8px ${getAuraCss(user.aura)}`,
                display: 'inline-flex',
              }}
            />
          </span>

          {/* Info */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, color: '#1e293b', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
              Nearby — {user.name.split('@')[0]}
            </p>
            <p style={{ fontSize: 9, fontWeight: 600, color: '#64748b', marginTop: 2, margin: 0 }}>
              {user.role} · {auraLabel(user.aura)}
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {activeCall && activeCall.peerId === user.id ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Pulse Visualizer Spectrum */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '0 4px' }}>
                  <span style={{ width: 3, height: 16, background: '#2563eb', borderRadius: 2, animation: 'bounceWave 0.8s ease-in-out infinite alternate', animationDelay: '0.1s' }} />
                  <span style={{ width: 3, height: 26, background: '#3b82f6', borderRadius: 2, animation: 'bounceWave 0.8s ease-in-out infinite alternate', animationDelay: '0.3s' }} />
                  <span style={{ width: 3, height: 12, background: '#60a5fa', borderRadius: 2, animation: 'bounceWave 0.8s ease-in-out infinite alternate', animationDelay: '0.5s' }} />
                  <span style={{ width: 3, height: 20, background: '#2563eb', borderRadius: 2, animation: 'bounceWave 0.8s ease-in-out infinite alternate', animationDelay: '0.2s' }} />
                </div>
                
                <button
                  onClick={onEndCall}
                  style={{
                    fontSize: 10, fontWeight: 800, padding: '6px 14px',
                    borderRadius: 8, border: 'none',
                    background: '#dc2626', color: '#ffffff',
                    cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase',
                    boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.2)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = '#b91c1c')}
                  onMouseOut={(e) => (e.currentTarget.style.background = '#dc2626')}
                >
                  End Call
                </button>
                
                <style dangerouslySetInnerHTML={{__html: `
                  @keyframes bounceWave {
                    0% { transform: scaleY(0.2); }
                    100% { transform: scaleY(1); }
                  }
                `}} />
              </div>
            ) : (
              <>
                {confirmCallType === null ? (
                  <>
                    <button
                      onClick={() => {
                        if (onWave) {
                          onWave(user.id);
                        } else {
                          toast.success(`👋 Waved to @${user.name}`);
                        }
                      }}
                      style={{
                        fontSize: 10, fontWeight: 800, padding: '6px 12px',
                        borderRadius: 8, border: '1px solid rgba(34,197,94,0.3)',
                        background: 'rgba(34,197,94,0.08)', color: '#16a34a',
                        cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase',
                      }}
                    >
                      👋 Wave
                    </button>

                    <button
                      onClick={() => setConfirmCallType('voice')}
                      style={{
                        fontSize: 10, fontWeight: 800, padding: '6px 12px',
                        borderRadius: 8, border: '1px solid rgba(59,130,246,0.3)',
                        background: 'rgba(59,130,246,0.08)', color: '#2563eb',
                        cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase',
                      }}
                    >
                      🎙️ Voice
                    </button>

                    <button
                      onClick={() => setConfirmCallType('video')}
                      style={{
                        fontSize: 10, fontWeight: 800, padding: '6px 12px',
                        borderRadius: 8, border: '1px solid rgba(139,92,246,0.3)',
                        background: 'rgba(139,92,246,0.08)', color: '#7c3aed',
                        cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase',
                      }}
                    >
                      📹 Video
                    </button>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Start {confirmCallType === 'video' ? 'Video meeting' : 'Voice call'}?
                    </span>
                    <button
                      onClick={() => {
                        const callType = confirmCallType;
                        setConfirmCallType(null);
                        if (onInitiateCall) {
                          onInitiateCall(user.id, callType);
                        }
                      }}
                      style={{
                        fontSize: 11, padding: '4px 8px', borderRadius: 6,
                        border: '1px solid #bbf7d0', background: '#f0fdf4',
                        color: '#16a34a', cursor: 'pointer', outline: 'none',
                      }}
                      title="Confirm"
                    >
                      ✔️
                    </button>
                    <button
                      onClick={() => setConfirmCallType(null)}
                      style={{
                        fontSize: 11, padding: '4px 8px', borderRadius: 6,
                        border: '1px solid #fecaca', background: '#fef2f2',
                        color: '#dc2626', cursor: 'pointer', outline: 'none',
                      }}
                      title="Cancel"
                    >
                      ❌
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
