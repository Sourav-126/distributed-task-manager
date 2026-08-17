import React from 'react';
import type { PlayerData, RoomZone } from './types';

interface MinimapProps {
  rooms: RoomZone[];
  activePlayers: PlayerData[];
  playerPos: { x: number; y: number };
  worldW: number;
  worldH: number;
  getAuraCss: (aura: string) => string;
}

const MW = 170;
const MH = 108;

export default function Minimap({ rooms, activePlayers, playerPos, worldW, worldH, getAuraCss }: MinimapProps) {
  const tx = (wx: number) => (wx / worldW) * MW;
  const ty = (wy: number) => (wy / worldH) * MH;

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        right: 12,
        width: MW,
        height: MH,
        background: 'rgba(13,17,23,0.90)',
        border: '1px solid #30363d',
        borderRadius: 10,
        backdropFilter: 'blur(8px)',
        boxShadow: '0 0 24px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        zIndex: 50,
      }}
    >
      {/* Room outlines */}
      {rooms.map((r) => (
        <div
          key={r.name}
          style={{
            position: 'absolute',
            left:   tx(r.x),
            top:    ty(r.y),
            width:  tx(r.w),
            height: ty(r.h),
            background: `${r.labelColor}18`,
            border: `1px solid ${r.labelColor}55`,
            borderRadius: 2,
          }}
        />
      ))}

      {/* Other players */}
      {activePlayers.map((p) => (
        <div
          key={p.id}
          title={p.name}
          style={{
            position: 'absolute',
            left:   tx(p.x) - 3,
            top:    ty(p.y) - 3,
            width:  6,
            height: 6,
            background: getAuraCss(p.aura),
            boxShadow: `0 0 6px ${getAuraCss(p.aura)}`,
            borderRadius: '50%',
          }}
        />
      ))}

      {/* Local player — brighter, bigger */}
      <div
        style={{
          position: 'absolute',
          left:   tx(playerPos.x) - 4,
          top:    ty(playerPos.y) - 4,
          width:  8,
          height: 8,
          background: '#a5b4fc',
          boxShadow: '0 0 10px #6366f1, 0 0 4px #fff',
          border: '1.5px solid #fff',
          borderRadius: '50%',
          zIndex: 2,
        }}
      />

      {/* Corner label */}
      <div
        style={{
          position: 'absolute',
          bottom: 3,
          left: 5,
          fontSize: 6,
          fontWeight: 700,
          letterSpacing: '0.15em',
          color: '#484f58',
          textTransform: 'uppercase',
        }}
      >
        MAP
      </div>
    </div>
  );
}
