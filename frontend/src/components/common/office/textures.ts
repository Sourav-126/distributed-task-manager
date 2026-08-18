/**
 * textures.ts
 * All Phaser texture generation for the MetaOffice canvas.
 * Accepts a Phaser.Scene instance (typed as `any` to avoid SSR Phaser import).
 *
 * Texture key index:
 *   Floors:     floor_hall | floor_checker | floor_carpet_blue | floor_carpet_green | floor_carpet_warm | floor_grass
 *   Characters: char_local_{dir} | char_{0-4}_{dir}   (dir: down | up | left | right)
 *   Furniture:  desk | chair | conf_table | sofa | ping_pong | bookshelf_seg | coffee | water_cooler
 *   Decor:      plant | tree | lamp | dust
 */

import type Phaser from 'phaser';
import type { CharSkin } from './types';
import { CHAR_SKINS, LOCAL_SKIN } from './constants';

// ─── Public entry ─────────────────────────────────────────────────────────────
export function generateAllTextures(scene: Phaser.Scene): void {
  generateFloors(scene);
  generateCharacters(scene);
  generateFurniture(scene);
  generateDecor(scene);
}

// ─────────────────────────────── FLOORS ──────────────────────────────────────

function generateFloors(scene: Phaser.Scene) {
  // ──  Hallway — dark slate, subtle tile grid (Gather dark) ───────────────────
  const hall = scene.make.graphics({ x: 0, y: 0 }, false);
  hall.fillStyle(0x161b22, 1);
  hall.fillRect(0, 0, 48, 48);
  hall.lineStyle(0.5, 0x30363d, 0.4);
  hall.strokeRect(0, 0, 48, 48);
  hall.lineBetween(24, 0, 24, 48);
  hall.lineBetween(0, 24, 48, 24);
  hall.generateTexture('floor_hall', 48, 48);
  hall.destroy();

  // ── Gray Checker — main office rooms (dark slate checkerboard) ────────────
  const ch = scene.make.graphics({ x: 0, y: 0 }, false);
  ch.fillStyle(0x161b22, 1); // base dark
  ch.fillRect(0, 0, 32, 32);
  ch.fillRect(32, 32, 32, 32);
  ch.fillStyle(0x21262d, 1); // slightly lighter
  ch.fillRect(32, 0, 32, 32);
  ch.fillRect(0, 32, 32, 32);
  // Subtle grid lines
  ch.lineStyle(0.4, 0x30363d, 0.3);
  ch.strokeRect(0, 0, 32, 32);
  ch.strokeRect(32, 0, 32, 32);
  ch.strokeRect(0, 32, 32, 32);
  ch.strokeRect(32, 32, 32, 32);
  ch.generateTexture('floor_checker', 64, 64);
  ch.destroy();

  // ── Blue Carpet — conference rooms (dark blue carpet) ─────────────────
  const bc = scene.make.graphics({ x: 0, y: 0 }, false);
  bc.fillStyle(0x0d2a4a, 1);
  bc.fillRect(0, 0, 32, 32);
  bc.fillRect(32, 32, 32, 32);
  bc.fillStyle(0x123a5e, 1);
  bc.fillRect(32, 0, 32, 32);
  bc.fillRect(0, 32, 32, 32);
  bc.lineStyle(0.4, 0x1f6feb, 0.3);
  bc.strokeRect(0, 0, 32, 32);
  bc.strokeRect(32, 0, 32, 32);
  bc.strokeRect(0, 32, 32, 32);
  bc.strokeRect(32, 32, 32, 32);
  bc.generateTexture('floor_carpet_blue', 64, 64);
  bc.destroy();

  // ── Green Carpet — break room (dark sage green carpet) ───────────────────
  const gc = scene.make.graphics({ x: 0, y: 0 }, false);
  gc.fillStyle(0x0d2a1a, 1);
  gc.fillRect(0, 0, 32, 32);
  gc.fillRect(32, 32, 32, 32);
  gc.fillStyle(0x123a1f, 1);
  gc.fillRect(32, 0, 32, 32);
  gc.fillRect(0, 32, 32, 32);
  gc.lineStyle(0.4, 0x238636, 0.3);
  gc.strokeRect(0, 0, 32, 32);
  gc.strokeRect(32, 0, 32, 32);
  gc.strokeRect(0, 32, 32, 32);
  gc.strokeRect(32, 32, 32, 32);
  gc.generateTexture('floor_carpet_green', 64, 64);
  gc.destroy();

  // ── Warm Carpet — lounge (dark terracotta carpet) ──────────────────────────
  const wc = scene.make.graphics({ x: 0, y: 0 }, false);
  wc.fillStyle(0x3d1a10, 1);
  wc.fillRect(0, 0, 32, 32);
  wc.fillRect(32, 32, 32, 32);
  wc.fillStyle(0x4d2414, 1);
  wc.fillRect(32, 0, 32, 32);
  wc.fillRect(0, 32, 32, 32);
  wc.lineStyle(0.4, 0xbc4c00, 0.3);
  wc.strokeRect(0, 0, 32, 32);
  wc.strokeRect(32, 0, 32, 32);
  wc.strokeRect(0, 32, 32, 32);
  wc.strokeRect(32, 32, 32, 32);
  wc.generateTexture('floor_carpet_warm', 64, 64);
  wc.destroy();

  // ── Outdoor Grass (dark pixel grass) ────────────────────────────────────
  const gr = scene.make.graphics({ x: 0, y: 0 }, false);
  gr.fillStyle(0x0d1117, 1);
  gr.fillRect(0, 0, 32, 32);
  gr.fillStyle(0x1a2a10, 0.6);
  for (let i = 0; i < 5; i++) {
    gr.fillRect(i * 6 + 1, 2, 2, 6);
    gr.fillRect(i * 6 + 3, 4, 1, 4);
  }
  gr.generateTexture('floor_grass', 32, 32);
  gr.destroy();
}

// ─────────────────────────────── CHARACTERS ──────────────────────────────────

function generateCharacters(scene: Phaser.Scene) {
  // Generate 5 team-member skins + 1 local-player skin
  CHAR_SKINS.forEach((skin, idx) => {
    // Generate idle
    drawCharDown(scene, `char_${idx}_down`, skin, false, 0);
    drawCharUp(scene, `char_${idx}_up`, skin, false, 0);
    drawCharSide(scene, `char_${idx}_left`, skin, false, true, 0);
    drawCharSide(scene, `char_${idx}_right`, skin, false, false, 0);

    // Generate walking frame 1
    drawCharDown(scene, `char_${idx}_down_w1`, skin, false, 1);
    drawCharUp(scene, `char_${idx}_up_w1`, skin, false, 1);
    drawCharSide(scene, `char_${idx}_left_w1`, skin, false, true, 1);
    drawCharSide(scene, `char_${idx}_right_w1`, skin, false, false, 1);

    // Generate walking frame 2
    drawCharDown(scene, `char_${idx}_down_w2`, skin, false, 2);
    drawCharUp(scene, `char_${idx}_up_w2`, skin, false, 2);
    drawCharSide(scene, `char_${idx}_left_w2`, skin, false, true, 2);
    drawCharSide(scene, `char_${idx}_right_w2`, skin, false, false, 2);
  });

  const localSkin = getLocalSkin();
  regenerateLocalPlayerTextures(scene, localSkin);
}

// Helper to load customized local skin
export function getLocalSkin(): CharSkin {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('mo_custom_skin');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
  }
  return LOCAL_SKIN; // default local skin
}

// Regenerates local player textures on demand
export function regenerateLocalPlayerTextures(scene: Phaser.Scene, skin: CharSkin) {
  const suffixes = ['', '_w1', '_w2'];
  const directions = ['down', 'up', 'left', 'right'];
  directions.forEach((dir) => {
    suffixes.forEach((suf) => {
      const key = `char_local_${dir}${suf}`;
      if (scene.textures.exists(key)) {
        scene.textures.remove(key);
      }
    });
  });

  // Idle
  drawCharDown(scene, 'char_local_down', skin, true, 0);
  drawCharUp(scene, 'char_local_up', skin, true, 0);
  drawCharSide(scene, 'char_local_left', skin, true, true, 0);
  drawCharSide(scene, 'char_local_right', skin, true, false, 0);

  // Walk 1
  drawCharDown(scene, 'char_local_down_w1', skin, true, 1);
  drawCharUp(scene, 'char_local_up_w1', skin, true, 1);
  drawCharSide(scene, 'char_local_left_w1', skin, true, true, 1);
  drawCharSide(scene, 'char_local_right_w1', skin, true, false, 1);

  // Walk 2
  drawCharDown(scene, 'char_local_down_w2', skin, true, 2);
  drawCharUp(scene, 'char_local_up_w2', skin, true, 2);
  drawCharSide(scene, 'char_local_left_w2', skin, true, true, 2);
  drawCharSide(scene, 'char_local_right_w2', skin, true, false, 2);
}

/** Front-facing (down) character — 32 × 54 pixels with top-down Gather.town anatomy */
function drawCharDown(scene: Phaser.Scene, key: string, s: CharSkin, isLocal: boolean, frame: number = 0) {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  // Drop shadow
  g.fillStyle(0x000000, 0.2);
  g.fillEllipse(16, 43, 20, 6);

  // ── Torso (Shirt) ──
  g.fillStyle(s.shirt, 1);
  g.fillRoundedRect(9, 24, 14, 13, 2);

  // Shirt shading
  g.fillStyle(0x000000, 0.12);
  g.fillRect(9, 32, 14, 5);

  if (isLocal) {
    g.lineStyle(1.2, 0x3b82f6, 0.8);
    g.strokeRoundedRect(9, 24, 14, 13, 2);
  }

  // ── Arms ──
  // Slightly swing arms during walk cycles
  const armOffset = frame === 1 ? -1 : frame === 2 ? 1 : 0;
  g.fillStyle(s.shirt, 1);
  g.fillRoundedRect(5, 24 + armOffset, 4, 9, 1);
  g.fillRoundedRect(23, 24 - armOffset, 4, 9, 1);

  // Hands
  g.fillStyle(s.skin, 1);
  g.fillCircle(7, 34 + armOffset, 2);
  g.fillCircle(25, 34 - armOffset, 2);

  // ── Pants ──
  const legL = frame === 1 ? 35 : frame === 2 ? 38 : 37;
  const legR = frame === 1 ? 38 : frame === 2 ? 35 : 37;
  g.fillStyle(s.pants, 1);
  g.fillRect(9, legL, 6, 6);
  g.fillRect(17, legR, 6, 6);

  // ── Shoes ──
  const shoeL = frame === 1 ? 40 : frame === 2 ? 43 : 42;
  const shoeR = frame === 1 ? 43 : frame === 2 ? 40 : 42;
  g.fillStyle(s.shoe, 1);
  g.fillRect(8, shoeL, 6, 3);
  g.fillRect(18, shoeR, 6, 3);

  // ── Head & Hair (drawn overlapping/torso layer) ──
  // Hair back-layer
  g.fillStyle(s.hair, 1);
  g.fillCircle(16, 15, 9);
  g.fillRoundedRect(7, 7, 18, 11, 4);

  // Head/Skin face base
  g.fillStyle(s.skin, 1);
  g.fillRoundedRect(8, 9, 16, 14, 4);

  // Hair overlay / front bangs
  g.fillStyle(s.hair, 1);
  g.fillRoundedRect(7, 6, 18, 5, 2);
  g.fillRect(7, 11, 3, 3);
  g.fillRect(22, 11, 3, 3);

  // ── Eyes ──
  // Eye white
  g.fillStyle(0xffffff, 1);
  g.fillRect(10, 14, 3, 3);
  g.fillRect(19, 14, 3, 3);
  // Pupil
  g.fillStyle(0x0f172a, 1);
  g.fillRect(11, 14, 1, 2);
  g.fillRect(20, 14, 1, 2);

  // ── Nose ──
  g.fillStyle(s.skin - 0x120a0a, 1);
  g.fillRect(15, 17, 2, 2);

  // ── Mouth ──
  g.fillStyle(0xa03535, 1);
  g.fillRect(14, 20, 4, 1);

  g.generateTexture(key, 32, 54);
  g.destroy();
}

/** Back-facing (up) character — 32 × 54 pixels */
function drawCharUp(scene: Phaser.Scene, key: string, s: CharSkin, isLocal: boolean, frame: number = 0) {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  // Drop shadow
  g.fillStyle(0x000000, 0.2);
  g.fillEllipse(16, 43, 20, 6);

  // ── Torso ──
  g.fillStyle(s.shirt, 1);
  g.fillRoundedRect(9, 24, 14, 13, 2);
  g.fillStyle(0x000000, 0.1);
  g.fillRect(9, 28, 14, 9);

  if (isLocal) {
    g.lineStyle(1.2, 0x3b82f6, 0.8);
    g.strokeRoundedRect(9, 24, 14, 13, 2);
  }

  // Arms
  const armOffset = frame === 1 ? -1 : frame === 2 ? 1 : 0;
  g.fillStyle(s.shirt, 1);
  g.fillRoundedRect(5, 24 + armOffset, 4, 9, 1);
  g.fillRoundedRect(23, 24 - armOffset, 4, 9, 1);

  // Hands (back view)
  g.fillStyle(s.skin, 1);
  g.fillCircle(7, 34 + armOffset, 1.5);
  g.fillCircle(25, 34 - armOffset, 1.5);

  // Pants
  const legL = frame === 1 ? 35 : frame === 2 ? 38 : 37;
  const legR = frame === 1 ? 38 : frame === 2 ? 35 : 37;
  g.fillStyle(s.pants, 1);
  g.fillRect(9, legL, 6, 6);
  g.fillRect(17, legR, 6, 6);

  // Shoes (heels)
  const shoeL = frame === 1 ? 40 : frame === 2 ? 43 : 42;
  const shoeR = frame === 1 ? 43 : frame === 2 ? 40 : 42;
  g.fillStyle(s.shoe, 1);
  g.fillRect(9, shoeL, 5, 2);
  g.fillRect(18, shoeR, 5, 2);

  // ── Head (Back view - full hair covering the face) ──
  g.fillStyle(s.hair, 1);
  g.fillCircle(16, 15, 9);
  g.fillRoundedRect(7, 6, 18, 15, 4);

  g.generateTexture(key, 32, 54);
  g.destroy();
}

/** Side-facing (left/right) character — 28 × 54 pixels */
function drawCharSide(scene: Phaser.Scene, key: string, s: CharSkin, isLocal: boolean, facingLeft: boolean, frame: number = 0) {
  const W = 28;

  // We write left-facing directly, then mirror for right
  const drawSingleSide = (g: Phaser.GameObjects.Graphics, reflect: boolean) => {
    const flipX = (x: number, w: number = 0) => reflect ? W - x - w : x;

    // Drop shadow
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(14, 43, 18, 6);

    // ── Torso ──
    g.fillStyle(s.shirt, 1);
    g.fillRoundedRect(flipX(9, 10), 24, 10, 13, 2);
    g.fillStyle(0x000000, 0.12);
    g.fillRect(flipX(9, 10), 30, 10, 7);

    if (isLocal) {
      g.lineStyle(1.2, 0x3b82f6, 0.8);
      g.strokeRoundedRect(flipX(9, 10), 24, 10, 13, 2);
    }

    // ── Pants (two legs) ──
    const legL = frame === 1 ? -1.5 : frame === 2 ? 1.5 : 0;
    const legR = frame === 1 ? 1.5 : frame === 2 ? -1.5 : 0;

    g.fillStyle(s.pants, 1);
    g.fillRect(flipX(9 + legL, 4), 37, 4, 6);
    g.fillRect(flipX(14 + legR, 4), 37, 4, 6);

    // ── Shoes (two shoes matching the legs) ──
    const stepL = frame === 1 ? -2.5 : frame === 2 ? 2.5 : 0;
    const stepR = frame === 1 ? 2.5 : frame === 2 ? -2.5 : 0;

    g.fillStyle(s.shoe, 1);
    g.fillRect(flipX(8 + stepL, 5), 42, 5, 3);
    g.fillRect(flipX(13 + stepR, 5), 42, 5, 3);

    // ── Arm (only the side arm is prominently visible) ──
    const armSwing = frame === 1 ? 1 : frame === 2 ? -1 : 0;
    g.fillStyle(s.shirt, 1);
    g.fillRoundedRect(flipX(12 + armSwing, 4), 24, 4, 9, 1);
    g.fillStyle(s.skin, 1);
    g.fillCircle(flipX(14 + armSwing), 34, 2);

    // ── Head & Hair ──
    // Back hair
    g.fillStyle(s.hair, 1);
    g.fillCircle(14, 15, 8.5);
    g.fillRoundedRect(flipX(6, 16), 7, 16, 12, 4);

    // Face skin
    g.fillStyle(s.skin, 1);
    g.fillRoundedRect(flipX(8, 12), 9, 12, 13, 4);

    // Hair overlays
    g.fillStyle(s.hair, 1);
    g.fillRoundedRect(flipX(6, 16), 6, 16, 5, 2);
    g.fillRect(flipX(6, 3), 10, 3, 4); // sideburns / bangs

    // ── One Eye ──
    g.fillStyle(0xffffff, 1);
    g.fillRect(flipX(9, 3), 14, 3, 3);
    g.fillStyle(0x0f172a, 1);
    g.fillRect(flipX(9, 1), 14, 1, 2);

    // Nose
    g.fillStyle(s.skin - 0x120a0a, 1);
    g.fillRect(flipX(7, 2), 17, 2, 2);
  };

  if (facingLeft) {
    const gL = scene.make.graphics({ x: 0, y: 0 }, false);
    drawSingleSide(gL, false);
    gL.generateTexture(key, W, 54);
    gL.destroy();
  } else {
    const gR = scene.make.graphics({ x: 0, y: 0 }, false);
    drawSingleSide(gR, true);
    gR.generateTexture(key, W, 54);
    gR.destroy();
  }
}

// ─────────────────────────────── FURNITURE ───────────────────────────────────

export function generateFurniture(scene: Phaser.Scene) {
  // ── Office Desk (72 × 44) ─────────────────────────────────────────────────
  const desk = scene.make.graphics({ x: 0, y: 0 }, false);
  // Desk surface — warm wood
  desk.fillStyle(0x8B5E3C, 1);
  desk.fillRoundedRect(0, 4, 72, 36, 4);
  desk.fillStyle(0x6d4828, 1);
  desk.fillRoundedRect(0, 4, 72, 36, 4);
  desk.fillStyle(0x9E6B44, 1);
  desk.fillRoundedRect(2, 4, 68, 32, 3);
  // Desk edge shadow
  desk.fillStyle(0x000000, 0.15);
  desk.fillRect(2, 33, 68, 7);
  // Monitor stand
  desk.fillStyle(0x374151, 1);
  desk.fillRect(30, 0, 12, 6);
  // Monitor body
  desk.fillStyle(0x1e293b, 1);
  desk.fillRoundedRect(18, -14, 36, 18, 3);
  // Screen (blue-lit)
  desk.fillStyle(0x1d4ed8, 0.85);
  desk.fillRoundedRect(20, -12, 32, 14, 2);
  // Screen content lines
  desk.fillStyle(0x93c5fd, 0.6);
  desk.fillRect(22, -10, 20, 2);
  desk.fillRect(22, -6, 12, 2);
  // Keyboard
  desk.fillStyle(0x4b5563, 1);
  desk.fillRoundedRect(16, 10, 32, 10, 2);
  desk.fillStyle(0x6b7280, 0.5);
  desk.fillRect(18, 12, 28, 2);
  desk.fillRect(18, 15, 28, 2);
  // Mouse
  desk.fillStyle(0x6b7280, 1);
  desk.fillRoundedRect(52, 10, 12, 16, 4);
  desk.fillStyle(0x000000, 0.2);
  desk.lineBetween(58, 10, 58, 26);
  desk.generateTexture('desk', 72, 44);
  desk.destroy();

  // ── Swivel Chair (32 × 32) ────────────────────────────────────────────────
  const chair = scene.make.graphics({ x: 0, y: 0 }, false);
  // Seat shadow
  chair.fillStyle(0x000000, 0.15);
  chair.fillEllipse(16, 28, 26, 8);
  // Backrest
  chair.fillStyle(0x1e293b, 1);
  chair.fillRoundedRect(6, 4, 20, 14, 3);
  chair.fillStyle(0x334155, 1);
  chair.fillRoundedRect(8, 6, 16, 10, 2);
  // Seat
  chair.fillStyle(0x374151, 1);
  chair.fillEllipse(16, 20, 22, 10);
  chair.fillStyle(0x4b5563, 1);
  chair.fillEllipse(16, 19, 20, 8);
  // Wheel base
  chair.fillStyle(0x1e293b, 1);
  chair.fillCircle(16, 26, 4);
  chair.generateTexture('chair', 32, 32);
  chair.destroy();

  // ── Conference Table (172 × 72) ───────────────────────────────────────────
  const ct = scene.make.graphics({ x: 0, y: 0 }, false);
  ct.fillStyle(0x7B4F2E, 1);
  ct.fillRoundedRect(0, 0, 172, 72, 6);
  ct.fillStyle(0x9E6B44, 1);
  ct.fillRoundedRect(2, 2, 168, 68, 5);
  ct.fillStyle(0xB07848, 0.4);
  ct.fillRect(10, 10, 152, 52);
  // Table center line/crease
  ct.lineStyle(1, 0x7B4F2E, 0.4);
  ct.lineBetween(4, 36, 168, 36);
  ct.generateTexture('conf_table', 172, 72);
  ct.destroy();

  // ── Sofa (104 × 44) ───────────────────────────────────────────────────────
  const sofa = scene.make.graphics({ x: 0, y: 0 }, false);
  // Sofa frame
  sofa.fillStyle(0x166534, 1);
  sofa.fillRoundedRect(0, 10, 104, 34, 6);
  // Backrest
  sofa.fillStyle(0x14532d, 1);
  sofa.fillRoundedRect(0, 0, 104, 12, 4);
  // Armrests
  sofa.fillStyle(0x14532d, 1);
  sofa.fillRect(0, 10, 12, 34);
  sofa.fillRect(92, 10, 12, 34);
  // Seat cushions
  sofa.fillStyle(0x16a34a, 1);
  sofa.fillRoundedRect(14, 14, 34, 26, 3);
  sofa.fillRoundedRect(56, 14, 34, 26, 3);
  // Cushion details
  sofa.fillStyle(0x15803d, 0.5);
  sofa.fillRect(14, 30, 34, 4);
  sofa.fillRect(56, 30, 34, 4);
  sofa.generateTexture('sofa', 104, 44);
  sofa.destroy();

  // ── Ping Pong Table (120 × 64) ────────────────────────────────────────────
  const pp = scene.make.graphics({ x: 0, y: 0 }, false);
  pp.fillStyle(0x166534, 1);
  pp.fillRoundedRect(0, 0, 120, 64, 4);
  pp.lineStyle(2.5, 0xffffff, 0.95);
  pp.strokeRoundedRect(0, 0, 120, 64, 4);
  // Center line (net)
  pp.fillStyle(0x374151, 1);
  pp.fillRect(57, 0, 6, 64);
  pp.fillStyle(0xffffff, 0.9);
  pp.fillRect(58, 0, 4, 64);
  // Lines
  pp.lineStyle(1, 0xffffff, 0.5);
  pp.lineBetween(0, 32, 120, 32);
  // Balls
  pp.fillStyle(0xfef3c7, 1);
  pp.fillCircle(20, 16, 4);
  pp.fillCircle(100, 48, 4);
  pp.generateTexture('ping_pong', 120, 64);
  pp.destroy();

  // ── Bookshelf segment (16 × 72) ───────────────────────────────────────────
  const shelf = scene.make.graphics({ x: 0, y: 0 }, false);
  shelf.fillStyle(0x6d4828, 1);
  shelf.fillRect(0, 0, 16, 72);
  shelf.lineStyle(0.5, 0x4a2f18, 0.6);
  shelf.lineBetween(0, 18, 16, 18);
  shelf.lineBetween(0, 36, 16, 36);
  shelf.lineBetween(0, 54, 16, 54);
  const bkCols = [0x6366f1, 0xf59e0b, 0x10b981, 0xec4899, 0x06b6d4, 0xef4444];
  for (let i = 0; i < 4; i++) {
    const rowY = i * 18 + 1;
    let bx = 1;
    while (bx < 14) {
      const bw = 2 + Math.floor(Math.random() * 2);
      shelf.fillStyle(bkCols[(i * 3 + bx) % bkCols.length], 0.9);
      shelf.fillRect(bx, rowY + 1, bw, 15);
      bx += bw + 1;
    }
  }
  shelf.generateTexture('bookshelf_seg', 16, 72);
  shelf.destroy();

  // ── Coffee Machine (30 × 46) ──────────────────────────────────────────────
  const coffee = scene.make.graphics({ x: 0, y: 0 }, false);
  coffee.fillStyle(0x1e293b, 1);
  coffee.fillRoundedRect(2, 2, 26, 42, 4);
  // Machine front panel
  coffee.fillStyle(0x334155, 1);
  coffee.fillRoundedRect(4, 4, 22, 36, 3);
  // Coffee pod circle
  coffee.fillStyle(0x0f172a, 1);
  coffee.fillCircle(15, 14, 7);
  coffee.fillStyle(0xd29922, 0.9);
  coffee.fillCircle(15, 14, 5);
  coffee.fillStyle(0xfbbf24, 0.7);
  coffee.fillCircle(15, 14, 3);
  // Buttons
  coffee.fillStyle(0x3b82f6, 1);
  coffee.fillCircle(9, 28, 3);
  coffee.fillStyle(0x22c55e, 1);
  coffee.fillCircle(21, 28, 3);
  // Cup tray
  coffee.fillStyle(0x475569, 1);
  coffee.fillRoundedRect(6, 35, 18, 4, 1);
  // Steam
  coffee.lineStyle(1, 0xffffff, 0.3);
  coffee.strokeCircle(12, 1, 3);
  coffee.strokeCircle(18, 0, 2);
  coffee.generateTexture('coffee', 30, 46);
  coffee.destroy();

  // ── Water Cooler (28 × 46) ────────────────────────────────────────────────
  const watC = scene.make.graphics({ x: 0, y: 0 }, false);
  watC.fillStyle(0x374151, 1);
  watC.fillRoundedRect(4, 16, 20, 28, 3);
  // Water bottle (clear blue)
  watC.fillStyle(0x7dd3fc, 0.85);
  watC.fillRoundedRect(5, 2, 18, 16, 4);
  watC.lineStyle(1, 0x38bdf8, 0.9);
  watC.strokeRoundedRect(5, 2, 18, 16, 4);
  // Bottle highlight
  watC.fillStyle(0xffffff, 0.2);
  watC.fillRect(7, 4, 4, 10);
  // Buttons
  watC.fillStyle(0xef4444, 1);
  watC.fillCircle(10, 28, 3);
  watC.fillStyle(0x3b82f6, 1);
  watC.fillCircle(18, 28, 3);
  // Base
  watC.fillStyle(0x1e293b, 1);
  watC.fillRoundedRect(2, 40, 24, 6, 2);
  watC.generateTexture('water_cooler', 28, 46);
  watC.destroy();
}

// ─────────────────────────────── DECOR ───────────────────────────────────────

export function generateDecor(scene: Phaser.Scene) {
  // ── Potted Plant (28 × 38) ────────────────────────────────────────────────
  const pl = scene.make.graphics({ x: 0, y: 0 }, false);
  // Pot
  pl.fillStyle(0x92400e, 1);
  pl.fillPoints([{ x: 7, y: 24 }, { x: 21, y: 24 }, { x: 18, y: 36 }, { x: 10, y: 36 }] as unknown as Phaser.Math.Vector2[], true);
  pl.fillStyle(0x78350f, 0.4);
  pl.fillRect(10, 28, 8, 8);
  // Soil
  pl.fillStyle(0x451a03, 1);
  pl.fillRect(7, 22, 14, 3);
  // Leaves
  pl.fillStyle(0x166534, 1);
  pl.fillCircle(14, 12, 10);
  pl.fillStyle(0x15803d, 1);
  pl.fillCircle(14, 9, 8);
  pl.fillCircle(7, 14, 6);
  pl.fillCircle(21, 14, 6);
  // Leaf highlight
  pl.fillStyle(0x4ade80, 0.3);
  pl.fillCircle(12, 8, 4);
  pl.generateTexture('plant', 28, 38);
  pl.destroy();

  // ── Outdoor Tree (52 × 56) ────────────────────────────────────────────────
  const tr = scene.make.graphics({ x: 0, y: 0 }, false);
  // Trunk
  tr.fillStyle(0x78350f, 1);
  tr.fillRect(22, 38, 8, 18);
  tr.fillStyle(0x6d3009, 0.5);
  tr.fillRect(26, 38, 4, 18);
  // Foliage (layered circles for depth)
  tr.fillStyle(0x14532d, 1);
  tr.fillCircle(26, 24, 22);
  tr.fillStyle(0x166534, 1);
  tr.fillCircle(26, 20, 19);
  tr.fillStyle(0x16a34a, 1);
  tr.fillCircle(26, 16, 15);
  // Highlights
  tr.fillStyle(0x4ade80, 0.25);
  tr.fillCircle(21, 14, 8);
  tr.generateTexture('tree', 52, 56);
  tr.destroy();

  // ── Floor Lamp (18 × 48) ──────────────────────────────────────────────────
  const lamp = scene.make.graphics({ x: 0, y: 0 }, false);
  lamp.fillStyle(0x374151, 1);
  lamp.fillRect(8, 22, 2, 22);
  lamp.fillEllipse(9, 44, 16, 5);
  // Shade
  lamp.fillStyle(0xfbbf24, 0.9);
  lamp.fillTriangle(9, 6, 1, 24, 17, 24);
  lamp.fillStyle(0x000000, 0.2);
  lamp.fillTriangle(9, 6, 9, 24, 17, 24);
  // Bulb
  lamp.fillStyle(0xfef9c3, 1);
  lamp.fillCircle(9, 6, 3);
  lamp.generateTexture('lamp', 18, 48);
  lamp.destroy();

  // ── Walking dust puff ─────────────────────────────────────────────────────
  const dust = scene.make.graphics({ x: 0, y: 0 }, false);
  dust.fillStyle(0xffffff, 0.5);
  dust.fillCircle(4, 4, 4);
  dust.generateTexture('dust', 8, 8);
  dust.destroy();
}
