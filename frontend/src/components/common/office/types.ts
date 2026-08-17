// ─── Shared types for the MetaOffice Phaser canvas ───────────────────────────

export interface PlayerData {
  id: number;
  name: string;
  role: string;
  x: number;
  y: number;
  direction: string;
  is_moving: boolean;
  aura: string;
}

export interface RoomZone {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  floorKey: string;
  borderHex: number;
  labelColor: string;
}

export interface CharSkin {
  skin: number;   // face/hands
  hair: number;   // hair color
  shirt: number;  // shirt/jacket
  pants: number;  // trousers
  shoe: number;   // shoes
}

export interface AuraConfig {
  color: number;
  alpha: number;
  cssColor: string;
}

export interface PhaserOfficeCallbacks {
  setActivePlayers: (p: PlayerData[]) => void;
  setProximityUser: (p: PlayerData | null) => void;
  setCurrentRoom:   (r: string) => void;
  setPlayerPos:     (pos: { x: number; y: number }) => void;
  getLocalUser:     () => { id: number; email: string } | null;
  getActivePlayers: () => PlayerData[];
  token: string;
  isMini: boolean;
}
