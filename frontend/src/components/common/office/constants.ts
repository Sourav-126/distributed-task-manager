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
    borderHex: 0x58a6ff,
    labelColor: '#58a6ff',
  },
  {
    name: 'Product Team',
    x: 480, y: 40, w: 540, h: 280,
    floorKey: 'floor_carpet_blue',
    borderHex: 0xa371f7,
    labelColor: '#a371f7',
  },
  {
    name: 'Design Studio',
    x: 1070, y: 40, w: 490, h: 280,
    floorKey: 'floor_carpet_warm',
    borderHex: 0xf85149,
    labelColor: '#f85149',
  },
  {
    name: 'Conf Room A',
    x: 40, y: 380, w: 300, h: 240,
    floorKey: 'floor_carpet_blue',
    borderHex: 0x3fb950,
    labelColor: '#3fb950',
  },
  {
    name: 'Conf Room B',
    x: 390, y: 380, w: 300, h: 240,
    floorKey: 'floor_carpet_blue',
    borderHex: 0x3fb950,
    labelColor: '#3fb950',
  },
  {
    name: 'Break Room',
    x: 740, y: 380, w: 340, h: 240,
    floorKey: 'floor_carpet_green',
    borderHex: 0xd29922,
    labelColor: '#d29922',
  },
  {
    name: 'Design Lounge',
    x: 1130, y: 380, w: 430, h: 240,
    floorKey: 'floor_carpet_warm',
    borderHex: 0xa371f7,
    labelColor: '#a371f7',
  },
];

// ─── 5 distinct character skins (Gather.town pixel-art style) ─────────────────
export const CHAR_SKINS: CharSkin[] = [
  // Dark skin, indigo hair, blue shirt
  { skin: 0x8B5E3C, hair: 0x312e81, shirt: 0x58a6ff, pants: 0x1e1b4b, shoe: 0x111827 },
  // Medium skin, purple hair, purple shirt
  { skin: 0xC8874A, hair: 0x7c3aed, shirt: 0xa371f7, pants: 0x1e293b, shoe: 0x1a1a2e },
  // Light skin, red hair, red shirt
  { skin: 0xF2C8A0, hair: 0xf85149, shirt: 0xf85149, pants: 0x4c1d95, shoe: 0x1c1917 },
  // Fair skin, blonde hair, amber shirt
  { skin: 0xFFDBB4, hair: 0xd29922, shirt: 0xd29922, pants: 0x164e63, shoe: 0x0c4a6e },
  // Olive skin, green hair, green shirt
  { skin: 0xD4956A, hair: 0x3fb950, shirt: 0x3fb950, pants: 0x431407, shoe: 0x1a0a00 },
];

// Local player skin — distinctive indigo/violet (Gather default)
export const LOCAL_SKIN: CharSkin = {
  skin: 0xFFDBB4, hair: 0x312e81, shirt: 0x58a6ff, pants: 0x1e1b4b, shoe: 0x111827,
};

// ─── Aura configs (Gather-style) ─────────────────────────────────────────────
export function getAuraConfig(aura: string): AuraConfig {
  switch (aura) {
    case 'red':   return { color: 0xf85149, alpha: 0.7, cssColor: '#f85149' };
    case 'amber': return { color: 0xd29922, alpha: 0.6, cssColor: '#d29922' };
    case 'blue':  return { color: 0x58a6ff, alpha: 0.6, cssColor: '#58a6ff' };
    default:      return { color: 0x3fb950, alpha: 0.6, cssColor: '#3fb950' };
  }
}

// ─── Room lookup ──────────────────────────────────────────────────────────────
export function getRoomForPosition(x: number, y: number): string {
  for (const r of ROOMS) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r.name;
  }
  return 'Hallway';
}
