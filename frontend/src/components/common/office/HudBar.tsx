import React from 'react';
import { motion } from 'framer-motion';
import type { PlayerData } from './types';

interface HudBarProps {
  currentRoom: string;
  playerPos: { x: number; y: number };
  activePlayers: PlayerData[];
  getAuraCss: (aura: string) => string;
  onCustomize: () => void;
  onWave?: (userId: number) => void;
}

export default function HudBar({ currentRoom, playerPos, activePlayers, getAuraCss, onCustomize, onWave }: HudBarProps) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '7px 18px',
        background: 'rgba(255, 255, 255, 0.95)',
        borderTop: '1px solid #e2e8f0',
        backdropFilter: 'blur(14px)',
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.03)',
        zIndex: 50,
      }}
    >
      {/* ── Left: room name + coordinates ─── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

        <div
          style={{
            fontSize: 10, fontWeight: 800, padding: '4px 10px',
            borderRadius: 8, background: 'rgba(37,99,235,0.08)',
            color: '#2563eb', border: '1px solid rgba(37,99,235,0.15)',
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}
        >
          📍 {currentRoom}
        </div>

        <button
          onClick={onCustomize}
          style={{
            fontSize: 9, fontWeight: 800, padding: '4px 10px',
            borderRadius: 8, background: '#1e293b',
            color: '#ffffff', border: 'none',
            cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          👕 Edit Avatar
        </button>

        <div style={{ fontSize: 9, fontWeight: 600, color: '#64748b', fontFamily: 'monospace' }}>
          {playerPos.x.toFixed(0)}, {playerPos.y.toFixed(0)}
        </div>
      </div>

      {/* ── Center: keyboard hints ─── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {['W', 'A', 'S', 'D', '↑', '↓', '←', '→'].map((k) => (
          <kbd
            key={k}
            style={{
              fontSize: 8, padding: '2px 5px', borderRadius: 4,
              background: '#f1f5f9', color: '#475569',
              border: '1px solid #cbd5e1', fontFamily: 'monospace', fontWeight: 700,
              boxShadow: '0 1px 1px rgba(0,0,0,0.05)',
            }}
          >
            {k}
          </kbd>
        ))}
        <span style={{ fontSize: 9, fontWeight: 600, color: '#64748b', marginLeft: 4 }}>to move</span>
      </div>

      {/* ── Right: online players ─── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Online
        </span>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {activePlayers.length === 0 ? (
            <span style={{ fontSize: 9, fontStyle: 'italic', color: '#94a3b8' }}>Only you</span>
          ) : (
            activePlayers.slice(0, 10).map((p) => (
              <motion.div
                key={p.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.06 }}
                onClick={() => onWave && onWave(p.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '3px 8px', borderRadius: 20,
                  background: 'rgba(241, 245, 249, 0.9)',
                  border: `1px solid ${getAuraCss(p.aura)}44`,
                  cursor: 'pointer',
                }}
                title={`Click to Wave at @${p.name}`}
              >
                <span
                  style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: getAuraCss(p.aura),
                    boxShadow: `0 0 6px ${getAuraCss(p.aura)}`,
                    display: 'inline-block',
                  }}
                />
                <span style={{ fontSize: 8, fontWeight: 700, color: '#1e293b' }}>
                  {p.name.split('@')[0].slice(0, 10)}
                </span>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
