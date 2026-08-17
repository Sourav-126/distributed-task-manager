import type { RoomZone, CharSkin, AuraConfig } from './types';

// ─── World dimensions ────────────────────────────────────────────────────────
export const WORLD_W = 1600;
export const WORLD_H = 1000;

// ─── Room layout — matches Phaser scene draw calls exactly ───────────────────
export const ROOMS: RoomZone[] = [
  {
    name: 'Engineering',
    x: 40, y: 40, w: 400, h: 280,
    floorKey: 'floor_checker',
    borderHex: 0x94a3b8,
    labelColor: '#475569',
  },
  {
    name: 'Product Team',
    x: 480, y: 40, w: 540, h: 280,
    floorKey: 'floor_checker',
    borderHex: 0x94a3b8,
    labelColor: '#475569',
  },
  {
    name: 'Design Studio',
    x: 1070, y: 40, w: 490, h: 280,
    floorKey: 'floor_checker',
    borderHex: 0x94a3b8,
    labelColor: '#475569',
  },
  {
    name: 'Conf Room A',
    x: 40, y: 380, w: 300, h: 240,
    floorKey: 'floor_carpet_blue',
    borderHex: 0x94a3b8,
    labelColor: '#475569',
  },
  {
    name: 'Conf Room B',
    x: 390, y: 380, w: 300, h: 240,
    floorKey: 'floor_carpet_blue',
    borderHex: 0x94a3b8,
    labelColor: '#475569',
  },
  {
    name: 'Break Room',
    x: 740, y: 380, w: 340, h: 240,
    floorKey: 'floor_carpet_green',
    borderHex: 0x94a3b8,
    labelColor: '#475569',
  },
  {
    name: 'Design Lounge',
    x: 1130, y: 380, w: 430, h: 240,
    floorKey: 'floor_carpet_warm',
    borderHex: 0x94a3b8,
    labelColor: '#475569',
  },
];

// ─── 5 distinct character skins (pixel-art Gather.town style) ─────────────────
export const CHAR_SKINS: CharSkin[] = [
  // Dark skin, black hair, green shirt
  { skin: 0x8B5E3C, hair: 0x1C0700, shirt: 0x16a34a, pants: 0x1e3a5f, shoe: 0x111111 },
  // Medium skin, dark brown hair, purple shirt
  { skin: 0xC8874A, hair: 0x3B1800, shirt: 0x7c3aed, pants: 0x1e293b, shoe: 0x1a1a2e },
  // Light skin, red hair, pink shirt
  { skin: 0xF2C8A0, hair: 0xC0392B, shirt: 0xdb2777, pants: 0x4c1d95, shoe: 0x1c1917 },
  // Fair skin, blonde hair, cyan shirt
  { skin: 0xFFDBB4, hair: 0xD4A017, shirt: 0x0891b2, pants: 0x164e63, shoe: 0x0c4a6e },
  // Olive skin, green hair, orange shirt
  { skin: 0xD4956A, hair: 0x166534, shirt: 0xea580c, pants: 0x431407, shoe: 0x1a0a00 },
];

// Local player skin — distinctive indigo/violet
export const LOCAL_SKIN: CharSkin = {
  skin: 0xFFDBB4, hair: 0x312e81, shirt: 0x6366f1, pants: 0x1e1b4b, shoe: 0x111827,
};

// ─── Aura configs ─────────────────────────────────────────────────────────────
export function getAuraConfig(aura: string): AuraConfig {
  switch (aura) {
    case 'red':   return { color: 0xf85149, alpha: 0.7, cssColor: '#f85149' };
    case 'amber': return { color: 0xfbbf24, alpha: 0.6, cssColor: '#fbbf24' };
    case 'blue':  return { color: 0x60a5fa, alpha: 0.6, cssColor: '#60a5fa' };
    default:      return { color: 0x4ade80, alpha: 0.6, cssColor: '#4ade80' };
  }
}

// ─── Room lookup ──────────────────────────────────────────────────────────────
export function getRoomForPosition(x: number, y: number): string {
  for (const r of ROOMS) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r.name;
  }
  return 'Hallway';
}
