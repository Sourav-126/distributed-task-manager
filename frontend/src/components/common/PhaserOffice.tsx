/**
 * PhaserOffice.tsx — Gather.town-style 2D virtual office
 *
 * Sub-modules (no Phaser import at module level, all SSR-safe):
 *   office/types.ts          — shared interfaces
 *   office/constants.ts      — ROOMS, CHAR_SKINS, helpers
 *   office/textures.ts       — all texture generation
 *   office/Minimap.tsx       — minimap React component
 *   office/ProximityBubble.tsx — proximity React component
 *   office/HudBar.tsx        — bottom HUD React component
 */

import React, { useEffect, useRef, useState } from 'react';
import type { PlayerData, CharSkin } from './office/types';
import { ROOMS, WORLD_W, WORLD_H, CHAR_SKINS, LOCAL_SKIN, getAuraConfig, getRoomForPosition } from './office/constants';
import { generateAllTextures, regenerateLocalPlayerTextures } from './office/textures';
import Minimap from './office/Minimap';
import ProximityBubble from './office/ProximityBubble';
import HudBar from './office/HudBar';

interface CharacterContainer {
  __auraGfx?: unknown;
  __auraColor?: number;
  __auraAlpha?: number;
  __sprite?: unknown;
  __skinIdx?: number;
  __isLocal?: boolean;
  __lastDir?: string;
  __statusDot?: unknown;
  __tagW?: number;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface PhaserOfficeProps {
  token: string;
  isMini?: boolean;
}

// ─── Aura CSS helper (re-exported from constants for JSX use) ─────────────────
const auraCss = (aura: string) => getAuraConfig(aura).cssColor;

// ─── Component ────────────────────────────────────────────────────────────────
export default function PhaserOffice({ token, isMini = false }: PhaserOfficeProps) {
  const containerRef     = useRef<HTMLDivElement>(null);
  const socketRef        = useRef<WebSocket | null>(null);
  const isInitRef        = useRef(false);
  const localUserRef     = useRef<{ id: number; email: string } | null>(null);
  const activePlayersRef = useRef<PlayerData[]>([]);
  const gameRef          = useRef<Phaser.Game | null>(null);

  const [activePlayers, setActivePlayers] = useState<PlayerData[]>([]);
  const [proximityUser, setProximityUser] = useState<PlayerData | null>(null);
  const [currentRoom,   setCurrentRoom]   = useState('Hallway');
  const [playerPos,     setPlayerPos]     = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('mo_last_position');
        if (saved) return JSON.parse(saved);
      } catch (_) {}
    }
    return { x: 720, y: 620 };
  });

  const [phaserLoaded, setPhaserLoaded] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  const [isCustomizing, setIsCustomizing] = useState(false);

  const [selectedHair, setSelectedHair] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('mo_custom_skin');
        if (saved) return JSON.parse(saved).hair;
      } catch (_) {}
    }
    return 0x312e81; // default indigo
  });

  const [selectedShirt, setSelectedShirt] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('mo_custom_skin');
        if (saved) return JSON.parse(saved).shirt;
      } catch (_) {}
    }
    return 0x6366f1; // default indigo
  });

  const [selectedPants, setSelectedPants] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('mo_custom_skin');
        if (saved) return JSON.parse(saved).pants;
      } catch (_) {}
    }
    return 0x1e1b4b;
  });

  const [selectedSkin, setSelectedSkin] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('mo_custom_skin');
        if (saved) return JSON.parse(saved).skin;
      } catch (_) {}
    }
    return 0xffdbb4;
  });

  const handleSaveAvatar = () => {
    const newSkin: CharSkin = {
      skin: selectedSkin,
      hair: selectedHair,
      shirt: selectedShirt,
      pants: selectedPants,
      shoe: 0x111827,
    };
    try {
      localStorage.setItem('mo_custom_skin', JSON.stringify(newSkin));
      const scene = gameRef.current?.scene.getScene('OfficeScene') as { updatePlayerSkin?: (skin: CharSkin) => void } | undefined;
      if (scene && typeof scene.updatePlayerSkin === 'function') {
        scene.updatePlayerSkin(newSkin);
      }
      setIsCustomizing(false);
    } catch (e) {
      console.error('Failed to save custom skin:', e);
    }
  };

  // ─── WebRTC Audio & Video Call States & Refs ───
  const [incomingCall, setIncomingCall] = useState<{ fromUserId: number; callType: 'voice' | 'video' } | null>(null);
  const [activeCall, setActiveCall] = useState<{ peerId: number } | null>(null);
  const [callType, setCallType] = useState<'voice' | 'video' | null>(null);
  const [incomingWave, setIncomingWave] = useState<{ fromUserId: number } | null>(null);
  const [localStreamState, setLocalStreamState] = useState<MediaStream | null>(null);
  const [remoteStreamState, setRemoteStreamState] = useState<MediaStream | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const iceCandidatesQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const activeCallRef = useRef<{ peerId: number } | null>(null);
  const incomingCallRef = useRef<{ fromUserId: number; callType: 'voice' | 'video' } | null>(null);
  const callTypeRef = useRef<'voice' | 'video' | null>(null);
  const incomingWaveRef = useRef<{ fromUserId: number } | null>(null);

  useEffect(() => {
    callTypeRef.current = callType;
  }, [callType]);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  useEffect(() => {
    incomingWaveRef.current = incomingWave;
  }, [incomingWave]);

  useEffect(() => {
    if (localVideoRef.current && localStreamState) {
      if (localVideoRef.current.srcObject !== localStreamState) {
        localVideoRef.current.srcObject = localStreamState;
      }
    }
  }, [localStreamState, activeCall, callType]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStreamState) {
      if (remoteVideoRef.current.srcObject !== remoteStreamState) {
        remoteVideoRef.current.srcObject = remoteStreamState;
      }
    }
  }, [remoteStreamState, activeCall, callType]);

  const rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
    ],
  };

  const cleanupCall = (notifyPeer = true) => {
    iceCandidatesQueueRef.current = [];

    if (notifyPeer) {
      const peerId = activeCallRef.current?.peerId;
      if (peerId && socketRef.current?.readyState === WebSocket.OPEN) {
        console.log('[WebRTC Debug] Sending CALL_END to peer:', peerId);
        socketRef.current.send(JSON.stringify({
          event: 'CALL_END',
          data: { to_user_id: peerId }
        }));
      }
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    setActiveCall(null);
    setIncomingCall(null);
    setCallType(null);
    setLocalStreamState(null);
    setRemoteStreamState(null);
  };

  const processIceQueue = async (pc: RTCPeerConnection) => {
    while (iceCandidatesQueueRef.current.length > 0) {
      const candidate = iceCandidatesQueueRef.current.shift();
      if (candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('[WebRTC] Error adding queued ICE candidate', e);
        }
      }
    }
  };

  const startWebRTCSession = async (peerId: number, isCaller: boolean, isVideoCall: boolean) => {
    console.log('[WebRTC Debug] startWebRTCSession triggered. peerId:', peerId, 'isCaller:', isCaller, 'isVideoCall:', isVideoCall);
    try {
      console.log('[WebRTC Debug] Requesting user media...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideoCall });
      console.log('[WebRTC Debug] User media GRANTED.');
      localStreamRef.current = stream;
      setLocalStreamState(stream);
      setCallType(isVideoCall ? 'video' : 'voice');

      console.log('[WebRTC Debug] Creating RTCPeerConnection...');
      const pc = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current = pc;

      console.log('[WebRTC Debug] Adding local tracks to peer connection...');
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        console.log('[WebRTC Debug] Remote track received! streams count:', event.streams.length, 'track kind:', event.track.kind);
        const remoteStream = event.streams[0] || new MediaStream([event.track]);
        
        if (isVideoCall) {
          if (event.track.kind === 'video' || remoteStream.getVideoTracks().length > 0) {
            console.log('[WebRTC Debug] Video track is present. Updating remoteStreamState.');
            setRemoteStreamState(remoteStream);
          }
        } else {
          setRemoteStreamState(remoteStream);
        }

        if (!isVideoCall) {
          if (remoteAudioRef.current) {
            if (remoteAudioRef.current.srcObject !== remoteStream) {
              remoteAudioRef.current.srcObject = remoteStream;
            }
            console.log('[WebRTC Debug] Playing remote audio...');
            remoteAudioRef.current.play().catch(err => console.error('[WebRTC Error] Audio play failed:', err));
          } else {
            console.warn('[WebRTC Debug] remoteAudioRef.current is NULL, cannot play remote audio!');
          }
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({
            event: 'WEBRTC_ICE',
            data: {
              to_user_id: peerId,
              payload: { candidate: event.candidate }
            }
          }));
        }
      };

      if (isCaller) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current?.send(JSON.stringify({
          event: 'WEBRTC_OFFER',
          data: {
            to_user_id: peerId,
            payload: { sdp: offer }
          }
        }));
      }
    } catch (err) {
      console.error('[WebRTC] Call setup failed', err);
      cleanupCall();
    }
  };

  const handleInitiateCall = (peerId: number, type: 'voice' | 'video') => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        event: 'CALL_USER',
        data: {
          to_user_id: peerId,
          payload: { call_type: type }
        }
      }));
      setCallType(type);
      setActiveCall({ peerId });
    }
  };

  const handleAcceptCall = () => {
    if (incomingCall && socketRef.current?.readyState === WebSocket.OPEN) {
      const isVideo = incomingCall.callType === 'video';
      socketRef.current.send(JSON.stringify({
        event: 'CALL_ACCEPT',
        data: {
          to_user_id: incomingCall.fromUserId,
          payload: { call_type: incomingCall.callType }
        }
      }));
      setCallType(incomingCall.callType);
      setActiveCall({ peerId: incomingCall.fromUserId });
      startWebRTCSession(incomingCall.fromUserId, false, isVideo);
      setIncomingCall(null);
    }
  };

  const handleRejectCall = () => {
    if (incomingCall && socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        event: 'CALL_REJECT',
        data: { to_user_id: incomingCall.fromUserId }
      }));
      setIncomingCall(null);
    }
  };

  const handleSendWave = (userId: number) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        event: 'PLAYER_WAVE',
        data: { to_user_id: userId }
      }));
      const name = activePlayers.find(p => p.id === userId)?.name?.split('@')[0] || `User #${userId}`;
      showToast(`Waved to @${name}!`);
    }
  };

  const handleWaveBack = () => {
    if (!incomingWave) return;
    const targetUserId = incomingWave.fromUserId;
    const targetUser = activePlayersRef.current.find(p => p.id === targetUserId);
    if (!targetUser) {
      console.warn('[WAVE] Could not locate teammate to teleport');
      setIncomingWave(null);
      return;
    }

    const game = gameRef.current;
    const scene = game?.scene.getScene('OfficeScene') as any;
    if (scene && scene.player) {
      let targetX = targetUser.x;
      let targetY = targetUser.y;
      let myDir = 'down';

      switch (targetUser.direction) {
        case 'down':
          targetY = targetUser.y + 42;
          myDir = 'up';
          break;
        case 'up':
          targetY = targetUser.y - 42;
          myDir = 'down';
          break;
        case 'left':
          targetX = targetUser.x - 42;
          myDir = 'right';
          break;
        case 'right':
          targetX = targetUser.x + 42;
          myDir = 'left';
          break;
        default:
          targetY = targetUser.y + 42;
          myDir = 'up';
      }

      const clampedX = Math.min(Math.max(targetX, 25), 1600 - 25);
      const clampedY = Math.min(Math.max(targetY, 25), 1000 - 25);

      const path = scene.findPath(scene.player.x, scene.player.y, clampedX, clampedY);
      scene.autoWalkPath = path;
      scene.autoWalkTargetDir = myDir;
    }

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        event: 'PLAYER_WAVE_BACK',
        data: { to_user_id: targetUserId }
      }));
    }
    setIncomingWave(null);
  };

  // Sync ref used inside Phaser update loop
  useEffect(() => { activePlayersRef.current = activePlayers; }, [activePlayers]);

  // ─── Phaser init ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || isInitRef.current) return;
    isInitRef.current = true;

    // Read local user from localStorage
    try {
      const stored = localStorage.getItem('user_profile');
      if (stored) localUserRef.current = JSON.parse(stored);
    } catch (_) {}

    let game: Phaser.Game | null = null;
    let destroyed = false;

    // Read starting position from localStorage (fallback to hallway center)
    let startX = 720;
    let startY = 620;
    try {
      const saved = localStorage.getItem('mo_last_position');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          startX = parsed.x;
          startY = parsed.y;
        }
      }
    } catch (_) {}

    import('phaser').then((Phaser) => {
      if (destroyed) return;

      // ─── Phaser Scene ───────────────────────────────────────────────────────
      class OfficeScene extends Phaser.Scene {
        private player!: Phaser.GameObjects.Container;
        private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
        private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
        private teammates = new Map<number, Phaser.GameObjects.Container>();
        private walls!: Phaser.Physics.Arcade.StaticGroup;
        private furniture!: Phaser.Physics.Arcade.StaticGroup;
        private lastSendTime = 0;
        private stoppedSent  = true;
        public obstacleRects: { x1: number; y1: number; x2: number; y2: number }[] = [];
        public autoWalkPath: { x: number; y: number }[] = [];
        public autoWalkTargetDir?: string;

        constructor() { super({ key: 'OfficeScene' }); }

        // ── preload ─────────────────────────────────────────────────────────
        preload() {
          generateAllTextures(this);
        }

        // ── create ──────────────────────────────────────────────────────────
        create() {
          this.walls     = this.physics.add.staticGroup();
          this.furniture = this.physics.add.staticGroup();

          // 1. Outdoor grass base
          this.add.tileSprite(0, 0, WORLD_W, WORLD_H, 'floor_grass').setOrigin(0, 0).setDepth(0);

          // 2. Indoor hall floor (between rooms) — tiled graphics grid
          const hallRect = this.add.graphics();
          hallRect.fillStyle(0xe8dcc8, 1);
          hallRect.fillRect(30, 30, WORLD_W - 60, WORLD_H - 100);
          hallRect.setDepth(1);

          // Draw hallway grid lines
          hallRect.lineStyle(0.5, 0xd4c8b0, 0.6);
          const startX = 30;
          const endX = WORLD_W - 30;
          const startY = 30;
          const endY = WORLD_H - 70;
          for (let tx = startX + 24; tx < endX; tx += 24) {
            hallRect.lineBetween(tx, startY, tx, endY);
          }
          for (let ty = startY + 24; ty < endY; ty += 24) {
            hallRect.lineBetween(startX, ty, endX, ty);
          }
          hallRect.setDepth(2);

          // 3. Build rooms
          ROOMS.forEach((r) => this.buildRoom(r));

          // 4. Decor and trees
          this.addOutdoorDecor();

          // 5. Furniture in each room
          this.populateFurniture();

          // 6. Local player — spawn in hallway center or last saved position
          const myId    = localUserRef.current?.id ?? 0;
          const skinIdx = myId % CHAR_SKINS.length;
          const spawnX  = 800;
          const spawnY  = 350;
          this.player   = this.spawnCharacter(spawnX, spawnY, 'You', 'green', true, skinIdx);

          this.physics.add.collider(this.player, this.walls);
          this.physics.add.collider(this.player, this.furniture);

          this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
          this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
          this.cameras.main.setZoom(isMini ? 0.45 : 1.8);

          this.cursors = this.input.keyboard!.createCursorKeys();
          this.wasd    = this.input.keyboard!.addKeys('W,A,S,D') as unknown as { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };

          this.connectWebSocket();

          this.time.delayedCall(100, () => {
            const cb = this.registry.get('onLoadComplete');
            if (cb) cb();
          });
        }

        private drawRoomFloor(x: number, y: number, w: number, h: number, floorKey: string) {
          const g = this.add.graphics().setDepth(3);
          const tileSize = 32;
          
          if (floorKey === 'floor_checker') {
            for (let rx = 0; rx < w; rx += tileSize) {
              for (let ry = 0; ry < h; ry += tileSize) {
                const isAlt = (Math.floor(rx / tileSize) + Math.floor(ry / tileSize)) % 2 === 1;
                g.fillStyle(isAlt ? 0xe2e0dc : 0xf0eeea, 1);
                g.fillRect(x + rx, y + ry, Math.min(tileSize, w - rx), Math.min(tileSize, h - ry));
                // grid border line
                g.lineStyle(0.4, 0xd0ceca, 0.4);
                g.strokeRect(x + rx, y + ry, Math.min(tileSize, w - rx), Math.min(tileSize, h - ry));
              }
            }
          } else if (floorKey === 'floor_carpet_blue') {
            for (let rx = 0; rx < w; rx += tileSize) {
              for (let ry = 0; ry < h; ry += tileSize) {
                const isAlt = (Math.floor(rx / tileSize) + Math.floor(ry / tileSize)) % 2 === 1;
                g.fillStyle(isAlt ? 0x9fa8da : 0xc5cae9, 1);
                g.fillRect(x + rx, y + ry, Math.min(tileSize, w - rx), Math.min(tileSize, h - ry));
                g.lineStyle(0.4, 0x7986cb, 0.5);
                g.strokeRect(x + rx, y + ry, Math.min(tileSize, w - rx), Math.min(tileSize, h - ry));
              }
            }
          } else if (floorKey === 'floor_carpet_green') {
            for (let rx = 0; rx < w; rx += tileSize) {
              for (let ry = 0; ry < h; ry += tileSize) {
                const isAlt = (Math.floor(rx / tileSize) + Math.floor(ry / tileSize)) % 2 === 1;
                g.fillStyle(isAlt ? 0xa5d6a7 : 0xc8e6c9, 1);
                g.fillRect(x + rx, y + ry, Math.min(tileSize, w - rx), Math.min(tileSize, h - ry));
                g.lineStyle(0.4, 0x81c784, 0.5);
                g.strokeRect(x + rx, y + ry, Math.min(tileSize, w - rx), Math.min(tileSize, h - ry));
              }
            }
          } else if (floorKey === 'floor_carpet_warm') {
            for (let rx = 0; rx < w; rx += tileSize) {
              for (let ry = 0; ry < h; ry += tileSize) {
                const isAlt = (Math.floor(rx / tileSize) + Math.floor(ry / tileSize)) % 2 === 1;
                g.fillStyle(isAlt ? 0xffab91 : 0xffccbc, 1);
                g.fillRect(x + rx, y + ry, Math.min(tileSize, w - rx), Math.min(tileSize, h - ry));
                g.lineStyle(0.4, 0xff8a65, 0.5);
                g.strokeRect(x + rx, y + ry, Math.min(tileSize, w - rx), Math.min(tileSize, h - ry));
              }
            }
          } else {
            g.fillStyle(0xf1f5f9, 1);
            g.fillRect(x, y, w, h);
          }
        }

        // ── buildRoom ───────────────────────────────────────────────────────
        private buildRoom(r: { name: string; x: number; y: number; w: number; h: number; floorKey: string; borderHex: number; labelColor: string }) {
          const { x, y, w, h, floorKey, borderHex, labelColor, name } = r;

          // Floor tile
          this.drawRoomFloor(x, y, w, h, floorKey);

          // Ambient room glow
          const glow = this.add.graphics().setDepth(4);
          glow.fillStyle(borderHex, 0.04);
          glow.fillRect(x, y, w, h);

          // ── Thick pixel-art walls ──────────────────────────────────────
          const wallG = this.add.graphics().setDepth(5);
          const W_T = 8; // wall thickness

          // Wall colors (lighter face, darker top edge)
          wallG.fillStyle(0x374151, 1);
          wallG.fillRect(x, y, w, W_T);             // top
          wallG.fillRect(x, y, W_T, h);             // left
          wallG.fillRect(x + w - W_T, y, W_T, h);  // right
          // Bottom wall (with door gap)
          const doorW = 64;
          const doorX = x + w / 2 - doorW / 2;
          wallG.fillRect(x, y + h - W_T, doorX - x, W_T);
          wallG.fillRect(doorX + doorW, y + h - W_T, (x + w) - (doorX + doorW), W_T);

          // Wall highlight edge (bright top)
          wallG.lineStyle(1.5, borderHex, 0.7);
          // top line
          wallG.lineBetween(x, y, x + w, y);
          // left
          wallG.lineBetween(x, y, x, y + h);
          // right
          wallG.lineBetween(x + w, y, x + w, y + h);
          // bottom-left
          wallG.lineBetween(x, y + h, doorX, y + h);
          // bottom-right
          wallG.lineBetween(doorX + doorW, y + h, x + w, y + h);

          // ── Room label pill (light theme) ────────────────────────────────
          const labelBg = this.add.graphics().setDepth(10);
          const textW   = name.length * 6.5 + 20;
          labelBg.fillStyle(0xffffff, 0.95);
          labelBg.fillRoundedRect(x + w / 2 - textW / 2, y - 22, textW, 18, 9);
          labelBg.lineStyle(1, 0xd1d5db, 0.9);
          labelBg.strokeRoundedRect(x + w / 2 - textW / 2, y - 22, textW, 18, 9);
          this.add.text(x + w / 2, y - 13, name, {
            fontFamily: 'Inter, sans-serif',
            fontSize: '10px',
            fontStyle: 'bold',
            color: '#374151',
          }).setOrigin(0.5, 0.5).setDepth(11);

          // ── Physics wall zones ─────────────────────────────────────────
          this.addWall(x + w / 2, y + W_T / 2, w, W_T);         // top
          this.addWall(x + W_T / 2, y + h / 2, W_T, h);         // left
          this.addWall(x + w - W_T / 2, y + h / 2, W_T, h);     // right
          this.addWall(doorX / 2 + x / 2, y + h - W_T / 2, doorX - x, W_T);          // bottom-left
          this.addWall((doorX + doorW + x + w) / 2, y + h - W_T / 2, (x + w) - (doorX + doorW), W_T); // bottom-right
        }

        private addWall(cx: number, cy: number, w: number, h: number) {
          const zone = this.add.zone(cx, cy, w, h);
          this.walls.add(zone);
          this.obstacleRects.push({ x1: cx - w / 2, y1: cy - h / 2, x2: cx + w / 2, y2: cy + h / 2 });
        }

        // ── Outdoor trees & decor ────────────────────────────────────────
        private addOutdoorDecor() {
          const positions = [
            [4, 4], [WORLD_W - 56, 4], [4, WORLD_H - 60], [WORLD_W - 56, WORLD_H - 60],
            [4, 340], [WORLD_W - 56, 340], [WORLD_W / 2 - 26, WORLD_H - 60],
          ];
          // Tree is 52 x 56 pixels, set depth to bottom-y (ty + 56)
          positions.forEach(([tx, ty]) => this.add.image(tx, ty, 'tree').setOrigin(0, 0).setDepth(ty + 56));
        }

        // ── Furniture ────────────────────────────────────────────────────
        private populateFurniture() {
          // Engineering (40,40, 400×280)
          [[100,150],[100,230],[190,150],[190,230],[290,150],[290,230],[380,150],[380,230]].forEach(([dx,dy]) => this.desk(dx,dy));
          // Bookshelf is 16 x 72 pixels, bottom y is y + 72
          this.add.image(430, 50, 'bookshelf_seg').setOrigin(0, 0).setDepth(50 + 72);
          this.add.image(430, 128, 'bookshelf_seg').setOrigin(0, 0).setDepth(128 + 72);
          this.add.image(430, 206, 'bookshelf_seg').setOrigin(0, 0).setDepth(206 + 72);
          // Plant is 28 x 38 pixels, bottom y is y + 38
          this.add.image(50, 60, 'plant').setOrigin(0, 0).setDepth(60 + 38);
          this.add.image(50, 270, 'plant').setOrigin(0, 0).setDepth(270 + 38);
          this.add.image(400, 270, 'plant').setOrigin(0, 0).setDepth(270 + 38);

          // Product Team (480,40, 540×280)
          [[530,150],[530,230],[630,150],[630,230],[730,150],[730,230],[830,150],[830,230],[930,150],[930,230]].forEach(([dx,dy]) => this.desk(dx,dy));
          // Water cooler is 28 x 46 pixels, bottom y is y + 46
          this.add.image(986, 50, 'water_cooler').setOrigin(0, 0).setDepth(50 + 46);
          this.add.image(486, 60, 'plant').setOrigin(0, 0).setDepth(60 + 38);
          this.add.image(990, 270, 'plant').setOrigin(0, 0).setDepth(270 + 38);

          // Design Studio (1070,40, 490×280)
          [[1120,150],[1120,230],[1220,150],[1220,230],[1320,150],[1320,230],[1420,150],[1420,230]].forEach(([dx,dy]) => this.desk(dx,dy));
          this.add.image(1076, 60, 'plant').setOrigin(0, 0).setDepth(60 + 38);
          this.add.image(1510, 270, 'plant').setOrigin(0, 0).setDepth(270 + 38);
          this.add.image(1076, 270, 'plant').setOrigin(0, 0).setDepth(270 + 38);

          // Conf Room A (40,380, 300×240)
          // Conf table is 172 x 72 pixels, bottom y is y + 72
          this.add.image(68, 430, 'conf_table').setOrigin(0, 0).setDepth(430 + 72);
          this.addFurZone(68 + 86, 430 + 36, 172, 72);
          this.add.image(50, 392, 'plant').setOrigin(0, 0).setDepth(392 + 38);
          this.add.image(278, 580, 'plant').setOrigin(0, 0).setDepth(580 + 38);
          // Lamp is 18 x 48 pixels, bottom y is y + 48
          this.add.image(48, 570, 'lamp').setOrigin(0, 0).setDepth(570 + 48);

          // Conf Room B (390,380, 300×240)
          this.add.image(418, 430, 'conf_table').setOrigin(0, 0).setDepth(430 + 72);
          this.addFurZone(418 + 86, 430 + 36, 172, 72);
          this.add.image(400, 392, 'plant').setOrigin(0, 0).setDepth(392 + 38);
          this.add.image(620, 580, 'plant').setOrigin(0, 0).setDepth(580 + 38);
          this.add.image(650, 392, 'lamp').setOrigin(0, 0).setDepth(392 + 48);

          // Break Room (740,380, 340×240)
          // Sofa is 104 x 44 pixels, bottom y is y + 44
          this.add.image(754, 450, 'sofa').setOrigin(0, 0).setDepth(450 + 44);
          this.addFurZone(754 + 52, 450 + 22, 104, 44);
          // Ping pong is 120 x 64 pixels, bottom y is y + 64
          this.add.image(762, 510, 'ping_pong').setOrigin(0, 0).setDepth(510 + 64);
          this.addFurZone(762 + 60, 510 + 32, 120, 64);
          // Coffee machine is 30 x 46 pixels, bottom y is y + 46
          this.add.image(990, 388, 'coffee').setOrigin(0, 0).setDepth(388 + 46);
          this.addFurZone(990 + 15, 388 + 23, 30, 46);
          this.add.image(1030, 388, 'water_cooler').setOrigin(0, 0).setDepth(388 + 46);
          this.addFurZone(1030 + 14, 388 + 23, 28, 46);
          this.add.image(752, 395, 'plant').setOrigin(0, 0).setDepth(395 + 38);
          this.add.image(1050, 585, 'plant').setOrigin(0, 0).setDepth(585 + 38);

          // Design Lounge (1130,380, 430×240)
          this.add.image(1144, 430, 'sofa').setOrigin(0, 0).setDepth(430 + 44);
          this.addFurZone(1144 + 52, 430 + 22, 104, 44);
          [[1310,460],[1310,540],[1410,460],[1410,540],[1490,460],[1490,540]].forEach(([dx,dy]) => this.desk(dx,dy));
          this.add.image(1144, 395, 'plant').setOrigin(0, 0).setDepth(395 + 38);
          this.add.image(1520, 580, 'plant').setOrigin(0, 0).setDepth(580 + 38);
        }

        private desk(x: number, y: number) {
          // Chair bottom y is y + 32
          this.add.image(x, y, 'chair').setOrigin(0.5, 0).setDepth(y + 32);
          // Desk is at y - 42, height 44, bottom y is y + 2
          this.add.image(x, y - 42, 'desk').setOrigin(0.5, 0).setDepth(y + 2);
          this.addFurZone(x, y - 20, 72, 44);
        }

        private addFurZone(cx: number, cy: number, w: number, h: number) {
          const zone = this.add.zone(cx, cy, w, h);
          this.furniture.add(zone);
          this.obstacleRects.push({ x1: cx - w / 2, y1: cy - h / 2, x2: cx + w / 2, y2: cy + h / 2 });
        }

        private isCellBlocked(gx: number, gy: number): boolean {
          const px = gx * 20 + 10;
          const py = gy * 20 + 10;
          if (px < 20 || px > WORLD_W - 20 || py < 20 || py > WORLD_H - 20) return true;
          for (const r of this.obstacleRects) {
            if (px >= r.x1 - 4 && px <= r.x2 + 4 && py >= r.y1 - 4 && py <= r.y2 + 4) {
              return true;
            }
          }
          return false;
        }

        public findPath(startX: number, startY: number, endX: number, endY: number): { x: number; y: number }[] {
          const cellSize = 20;
          const startGx = Math.floor(startX / cellSize);
          const startGy = Math.floor(startY / cellSize);
          const endGx = Math.floor(endX / cellSize);
          const endGy = Math.floor(endY / cellSize);

          if (startGx === endGx && startGy === endGy) {
            return [{ x: endX, y: endY }];
          }

          interface AStarNode {
            gx: number;
            gy: number;
            g: number;
            h: number;
            f: number;
            parent: AStarNode | null;
          }

          const openList: AStarNode[] = [];
          const closedSet = new Set<string>();

          const startNode: AStarNode = {
            gx: startGx,
            gy: startGy,
            g: 0,
            h: Math.abs(startGx - endGx) + Math.abs(startGy - endGy),
            f: 0,
            parent: null
          };
          startNode.f = startNode.g + startNode.h;
          openList.push(startNode);

          const getNeighbors = (node: AStarNode) => {
            const neighbors: { gx: number; gy: number }[] = [];
            const dirs = [
              { dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
              { dx: -1, dy: -1 }, { dx: 1, dy: -1 }, { dx: -1, dy: 1 }, { dx: 1, dy: 1 }
            ];

            for (const d of dirs) {
              const ngx = node.gx + d.dx;
              const ngy = node.gy + d.dy;
              if (ngx >= 0 && ngx < 80 && ngy >= 0 && ngy < 50) {
                const isTarget = (ngx === endGx && ngy === endGy);
                if (isTarget || !this.isCellBlocked(ngx, ngy)) {
                  neighbors.push({ gx: ngx, gy: ngy });
                }
              }
            }
            return neighbors;
          };

          let foundNode: AStarNode | null = null;
          let iterations = 0;
          const maxIterations = 2000;

          while (openList.length > 0 && iterations < maxIterations) {
            iterations++;
            openList.sort((a, b) => a.f - b.f);
            const current = openList.shift()!;
            closedSet.add(`${current.gx},${current.gy}`);

            if (current.gx === endGx && current.gy === endGy) {
              foundNode = current;
              break;
            }

            const neighbors = getNeighbors(current);
            for (const neighbor of neighbors) {
              const key = `${neighbor.gx},${neighbor.gy}`;
              if (closedSet.has(key)) continue;

              const isDiagonal = (neighbor.gx !== current.gx && neighbor.gy !== current.gy);
              const moveCost = isDiagonal ? 1.414 : 1.0;
              const tentativeG = current.g + moveCost;

              const existingOpen = openList.find(n => n.gx === neighbor.gx && n.gy === neighbor.gy);
              if (existingOpen) {
                if (tentativeG < existingOpen.g) {
                  existingOpen.g = tentativeG;
                  existingOpen.f = existingOpen.g + existingOpen.h;
                  existingOpen.parent = current;
                }
              } else {
                const h = Math.abs(neighbor.gx - endGx) + Math.abs(neighbor.gy - endGy);
                openList.push({
                  gx: neighbor.gx,
                  gy: neighbor.gy,
                  g: tentativeG,
                  h: h,
                  f: tentativeG + h,
                  parent: current
                });
              }
            }
          }

          if (!foundNode) {
            return [{ x: endX, y: endY }];
          }

          const pathPoints: { x: number; y: number }[] = [];
          let curr: AStarNode | null = foundNode;
          while (curr !== null) {
            pathPoints.push({
              x: curr.gx * cellSize + cellSize / 2,
              y: curr.gy * cellSize + cellSize / 2
            });
            curr = curr.parent;
          }
          pathPoints.reverse();
          pathPoints[pathPoints.length - 1] = { x: endX, y: endY };
          return pathPoints;
        }

        // ── Spawn / create a character container ─────────────────────────
        private spawnCharacter(
          x: number, y: number,
          name: string, aura: string,
          isLocal: boolean, skinIdx: number
        ): Phaser.GameObjects.Container {
          const c = this.add.container(x, y);
          c.setDepth(20);

          // ── Aura ring ──────────────────────────────────────────────────
          const auraGfx = this.add.graphics();
          const { color, alpha } = getAuraConfig(aura);
          this.drawAura(auraGfx, color, alpha);
          c.add(auraGfx);
          (c as any).__auraGfx = auraGfx;
          (c as any).__auraColor = color;
          (c as any).__auraAlpha = alpha;

          // ── Sprite ─────────────────────────────────────────────────────
          const texKey = isLocal ? 'char_local_down' : `char_${skinIdx}_down`;
          const sprite = this.add.image(0, -8, texKey).setOrigin(0.5, 0.5);
          c.add(sprite);
          (c as any).__sprite   = sprite;
          (c as any).__skinIdx  = skinIdx;
          (c as any).__isLocal  = isLocal;
          (c as any).__lastDir  = 'down';

          // ── Name tag ───────────────────────────────────────────────────
          const short  = name.split('@')[0].slice(0, 12);
          const displayName = isLocal ? 'You' : short;
          const tagW   = displayName.length * 7 + 22; // wider for status dot
          const tagBg  = this.add.graphics();
          tagBg.fillStyle(0x111827, 0.9); // dark slate/black Gather pill
          tagBg.fillRoundedRect(-tagW / 2, -50, tagW, 18, 9);
          tagBg.lineStyle(1, 0x000000, 0.15);
          tagBg.strokeRoundedRect(-tagW / 2, -50, tagW, 18, 9);
          c.add(tagBg);

          // Draw status dot inside the tag
          const dot = this.add.graphics();
          dot.fillStyle(isLocal ? 0x22c55e : color, 1);
          dot.fillCircle(-tagW / 2 + 10, -41, 3.5);
          c.add(dot);

          const tag = this.add.text(-tagW / 2 + 17, -41, displayName, {
            fontFamily: 'Inter, sans-serif',
            fontSize: '9px',
            fontStyle: 'bold',
            color: '#ffffff',
          }).setOrigin(0, 0.5);
          c.add(tag);

          (c as any).__statusDot = dot;
          (c as any).__tagW = tagW;

          // ── Physics for local player ────────────────────────────────────
          if (isLocal) {
            this.physics.add.existing(c);
            const body = c.body as Phaser.Physics.Arcade.Body;
            body.setCollideWorldBounds(true);
            body.setSize(22, 26);
            body.setOffset(-11, -10);
          }

          return c;
        }

        private drawAura(g: Phaser.GameObjects.Graphics, color: number, alpha: number) {
          g.clear();
          g.fillStyle(color, alpha * 0.3);
          g.fillCircle(0, 4, 22);
          g.lineStyle(2, color, alpha);
          g.strokeCircle(0, 4, 22);
        }

        private setAura(c: Phaser.GameObjects.Container, aura: string) {
          const { color, alpha } = getAuraConfig(aura);
          const cc = c as unknown as CharacterContainer;
          const auraGfx = cc.__auraGfx as Phaser.GameObjects.Graphics | undefined;
          if (auraGfx) this.drawAura(auraGfx, color, alpha);

          const statusDot = cc.__statusDot as Phaser.GameObjects.Graphics | undefined;
          const isLocal = cc.__isLocal;
          const tagW = cc.__tagW || 40;
          if (statusDot) {
            statusDot.clear();
            statusDot.fillStyle(isLocal ? 0x22c55e : color, 1);
            statusDot.fillCircle(-tagW / 2 + 10, -41, 3.5);
          }
        }

        private setSprite(c: Phaser.GameObjects.Container, dir: string, frameSuffix: string = '') {
          const cc = c as unknown as CharacterContainer;
          const isLocal  = cc.__isLocal;
          const skinIdx  = cc.__skinIdx ?? 0;
          const texKey   = isLocal ? `char_local_${dir}${frameSuffix}` : `char_${skinIdx}_${dir}${frameSuffix}`;
          const sprite = cc.__sprite as Phaser.GameObjects.Image | undefined;
          if (sprite && this.textures.exists(texKey)) sprite.setTexture(texKey);
          cc.__lastDir = dir;
        }

        public updatePlayerSkin(skin: CharSkin) {
          regenerateLocalPlayerTextures(this, skin);
          const cc = this.player as unknown as CharacterContainer;
          const sprite = cc.__sprite as Phaser.GameObjects.Image | undefined;
          if (sprite) {
            sprite.setTexture('dust'); // break cached texture check
          }
          this.setSprite(this.player, cc.__lastDir || 'down', '');
        }

        // ── update ──────────────────────────────────────────────────────
        update(time: number, _delta: number) {
          if (!this.player) return;

          let vx = 0, vy = 0;
          const cc = this.player as unknown as CharacterContainer;
          let dir   = cc.__lastDir ?? 'down';
          let moving = false;

          const isKeyActive = this.cursors.left.isDown || this.cursors.right.isDown || this.cursors.up.isDown || this.cursors.down.isDown ||
                            this.wasd.A.isDown || this.wasd.D.isDown || this.wasd.W.isDown || this.wasd.S.isDown;

          if (isKeyActive) {
            this.autoWalkPath = []; // Cancel auto-walk if manual input is received
          }

          if (this.autoWalkPath.length > 0) {
            const target = this.autoWalkPath[0];
            const dx = target.x - this.player.x;
            const dy = target.y - this.player.y;
            const dist = Math.hypot(dx, dy);

            if (dist < 10) {
              this.autoWalkPath.shift();
              if (this.autoWalkPath.length === 0) {
                vx = 0;
                vy = 0;
                moving = false;
                if (this.autoWalkTargetDir) {
                  dir = this.autoWalkTargetDir;
                  this.autoWalkTargetDir = undefined;
                }
              } else {
                const nextTarget = this.autoWalkPath[0];
                const ndx = nextTarget.x - this.player.x;
                const ndy = nextTarget.y - this.player.y;
                const ndist = Math.hypot(ndx, ndy);
                if (ndist > 0) {
                  vx = (ndx / ndist) * 200;
                  vy = (ndy / ndist) * 200;
                  if (Math.abs(ndx) > Math.abs(ndy)) {
                    dir = ndx > 0 ? 'right' : 'left';
                  } else {
                    dir = ndy > 0 ? 'down' : 'up';
                  }
                  moving = true;
                }
              }
            } else {
              vx = (dx / dist) * 200;
              vy = (dy / dist) * 200;
              if (Math.abs(dx) > Math.abs(dy)) {
                dir = dx > 0 ? 'right' : 'left';
              } else {
                dir = dy > 0 ? 'down' : 'up';
              }
              moving = true;
            }
          } else {
            if (this.cursors.left.isDown  || this.wasd.A.isDown)  { vx = -200; dir = 'left';  moving = true; }
            if (this.cursors.right.isDown || this.wasd.D.isDown)   { vx =  200; dir = 'right'; moving = true; }
            if (this.cursors.up.isDown    || this.wasd.W.isDown)   { vy = -200; dir = 'up';    moving = true; }
            if (this.cursors.down.isDown  || this.wasd.S.isDown)   { vy =  200; dir = 'down';  moving = true; }
            if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }
          }

          const body = this.player.body as Phaser.Physics.Arcade.Body;
          if (body) body.setVelocity(vx, vy);

          // Walk bob
          const spr = cc.__sprite as Phaser.GameObjects.Image | undefined;
          if (moving) {
            const frameNum = Math.floor(time * 0.006) % 2 === 0 ? '_w1' : '_w2';
            this.setSprite(this.player, dir, frameNum);
            if (spr) spr.y = -8; // Keep body height stable while legs are animating

            // Dust puffs
            if (Math.random() < 0.15) {
              const puff = this.add.image(
                this.player.x + (Math.random() - 0.5) * 12,
                this.player.y + 14, 'dust'
              ).setDepth(Math.round(this.player.y) + 15);
              this.tweens.add({ targets: puff, y: puff.y - 8, alpha: 0, scale: 1.6, duration: 350, onComplete: () => puff.destroy() });
            }
            this.stoppedSent = false;
            if (time - this.lastSendTime > 60) {
              this.lastSendTime = time;
              this.sendPos(dir, true);
            }
          } else {
            if (spr) spr.y = -8;
            this.setSprite(this.player, dir, '');
            this.player.setScale(1, 1 + Math.sin(time * 0.003) * 0.012);
            if (!this.stoppedSent) { this.stoppedSent = true; this.sendPos(dir, false); }
          }

          // Aura pulse
          const auraGfx = cc.__auraGfx as Phaser.GameObjects.Graphics | undefined;
          if (auraGfx) auraGfx.setAlpha(0.8 + Math.sin(time * 0.003) * 0.2);

          this.player.x = Phaser.Math.Clamp(this.player.x, 20, WORLD_W - 20);
          this.player.y = Phaser.Math.Clamp(this.player.y, 20, WORLD_H - 20);

          const px = Math.round(this.player.x);
          const py = Math.round(this.player.y);
          setPlayerPos({ x: px, y: py });
          setCurrentRoom(getRoomForPosition(px, py));
          // Y-sort local player dynamically
          this.player.setDepth(Math.round(this.player.y));
          this.evalProximity();
        }

        private sendPos(dir: string, isMoving: boolean) {
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
              event: 'PLAYER_MOVE',
              data: { x: this.player.x, y: this.player.y, direction: dir, is_moving: isMoving },
            }));
          }
        }

        private connectWebSocket() {
          if (destroyed) return;
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          const host = window.location.host;
          const wsUrl = `${protocol}//${host}/ws/office?token=${encodeURIComponent(token)}`;
          const ws   = new WebSocket(wsUrl);
          socketRef.current = ws;

          ws.onopen  = () => console.log('[MetaOffice WS] Connected');
          ws.onerror = (e) => console.error('[MetaOffice WS] Error', e);
          
          ws.onclose = () => {
            console.warn('[MetaOffice WS] Closed');
            if (!destroyed) {
              console.log('[MetaOffice WS] Connection lost. Attempting to reconnect in 3 seconds...');
              this.time.delayedCall(3000, () => {
                this.connectWebSocket();
              });
            }
          };

          ws.onmessage = async (ev) => {
            try {
              const res = JSON.parse(ev.data);
              if (res.event === 'WORLD_TICK' && res.data?.players) {
                const players: PlayerData[] = res.data.players;
                setActivePlayers(players);
                this.syncTeammates(players);

                // Auto-cleanup calls if the peer disconnected/left the workspace
                if (activeCallRef.current) {
                  const peerStillConnected = players.some(p => p.id === activeCallRef.current!.peerId);
                  if (!peerStillConnected) {
                    console.log(`[WebRTC Debug] Call peer ${activeCallRef.current!.peerId} left the workspace. Terminating call.`);
                    showToast('Call ended because your teammate left the workspace.');
                    cleanupCall(false);
                  }
                }
                if (incomingCallRef.current) {
                  const peerStillConnected = players.some(p => p.id === incomingCallRef.current!.fromUserId);
                  if (!peerStillConnected) {
                    console.log(`[WebRTC Debug] Incoming call peer ${incomingCallRef.current!.fromUserId} left the workspace. Dismissing call invitation.`);
                    cleanupCall(false);
                  }
                }
              } else if (res.event === 'CALL_USER') {
                console.log('[WebRTC Debug] Received CALL_USER from:', res.data.from_user_id);
                if (activeCallRef.current || incomingCallRef.current) {
                  console.log('[WebRTC Debug] User is busy. Rejecting call from:', res.data.from_user_id);
                  socketRef.current?.send(JSON.stringify({
                    event: 'CALL_REJECT',
                    data: {
                      to_user_id: res.data.from_user_id,
                      payload: { reason: 'busy' }
                    }
                  }));
                  return;
                }
                const type = res.data.payload?.call_type || 'voice';
                setIncomingCall({ fromUserId: res.data.from_user_id, callType: type });
              } else if (res.event === 'CALL_ACCEPT') {
                console.log('[WebRTC Debug] Received CALL_ACCEPT from:', res.data.from_user_id);
                const type = res.data.payload?.call_type || 'voice';
                setActiveCall({ peerId: res.data.from_user_id });
                setCallType(type);
                await startWebRTCSession(res.data.from_user_id, true, type === 'video');
              } else if (res.event === 'CALL_REJECT') {
                console.log('[WebRTC Debug] Received CALL_REJECT from:', res.data.from_user_id);
                const reason = res.data.payload?.reason;
                if (reason === 'busy') {
                  showToast('Teammate is currently busy on another call.');
                } else {
                  console.warn(`Call was declined by teammate (ID: ${res.data.from_user_id}).`);
                }
                cleanupCall(false);
              } else if (res.event === 'CALL_END') {
                console.log('[WebRTC Debug] Received CALL_END from:', res.data.from_user_id);
                showToast('Call ended.');
                cleanupCall(false);
              } else if (res.event === 'PLAYER_WAVE') {
                console.log('[WAVE] Received wave from User:', res.data.from_user_id);
                setIncomingWave({ fromUserId: res.data.from_user_id });
              } else if (res.event === 'PLAYER_WAVE_BACK') {
                console.log('[WAVE] Teammate waved back:', res.data.from_user_id);
                const name = activePlayersRef.current.find(p => p.id === res.data.from_user_id)?.name?.split('@')[0] || `User #${res.data.from_user_id}`;
                showToast(`👋 @${name} waved back and walked to your desk!`);
              } else if (res.event === 'WEBRTC_OFFER') {
                console.log('[WebRTC Debug] Received WEBRTC_OFFER from:', res.data.from_user_id);
                const offerPayload = res.data.payload;
                if (offerPayload?.sdp) {
                  let pc = peerConnectionRef.current;
                  if (!pc) {
                    console.log('[WebRTC Debug] No existing peer connection. Creating new RTCPeerConnection for receiver...');
                    pc = new RTCPeerConnection(rtcConfig);
                    peerConnectionRef.current = pc;
                    
                    // Setup tracks
                    if (localStreamRef.current) {
                      console.log('[WebRTC Debug] Reusing local stream tracks for receiver...');
                      localStreamRef.current.getTracks().forEach(t => pc!.addTrack(t, localStreamRef.current!));
                    } else {
                      console.log('[WebRTC Debug] Requesting user media for receiver...');
                      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                      console.log('[WebRTC Debug] User media GRANTED for receiver.');
                      localStreamRef.current = stream;
                      stream.getTracks().forEach(t => pc!.addTrack(t, stream));
                    }

                    pc.ontrack = (event) => {
                      console.log('[WebRTC Debug] Remote track received on receiver! streams:', event.streams.length);
                      const remoteStream = event.streams[0] || new MediaStream([event.track]);
                      const isVideo = callTypeRef.current === 'video';

                      if (isVideo) {
                        if (event.track.kind === 'video' || remoteStream.getVideoTracks().length > 0) {
                          console.log('[WebRTC Debug] Video track present on receiver. Updating remoteStreamState.');
                          setRemoteStreamState(remoteStream);
                        }
                      } else {
                        setRemoteStreamState(remoteStream);
                        if (remoteAudioRef.current) {
                          if (remoteAudioRef.current.srcObject !== remoteStream) {
                            remoteAudioRef.current.srcObject = remoteStream;
                          }
                          console.log('[WebRTC Debug] Playing remote audio on receiver...');
                          remoteAudioRef.current.play().catch(console.error);
                        }
                      }
                    };

                    pc.onicecandidate = (event) => {
                      if (event.candidate && socketRef.current?.readyState === WebSocket.OPEN) {
                        console.log('[WebRTC Debug] Generated ICE candidate on receiver, sending...');
                        socketRef.current.send(JSON.stringify({
                          event: 'WEBRTC_ICE',
                          data: {
                            to_user_id: res.data.from_user_id,
                            payload: { candidate: event.candidate }
                          }
                        }));
                      }
                    };
                  }

                  console.log('[WebRTC Debug] Setting remote description (offer sdp) on receiver...');
                  await pc.setRemoteDescription(new RTCSessionDescription(offerPayload.sdp));
                  console.log('[WebRTC Debug] Creating answer...');
                  const answer = await pc.createAnswer();
                  console.log('[WebRTC Debug] Setting local description (answer sdp) on receiver...');
                  await pc.setLocalDescription(answer);
                  console.log('[WebRTC Debug] Sending WEBRTC_ANSWER to caller...');
                  socketRef.current?.send(JSON.stringify({
                    event: 'WEBRTC_ANSWER',
                    data: {
                      to_user_id: res.data.from_user_id,
                      payload: { sdp: answer }
                    }
                  }));
                  await processIceQueue(pc);
                }
              } else if (res.event === 'WEBRTC_ANSWER') {
                console.log('[WebRTC Debug] Received WEBRTC_ANSWER from:', res.data.from_user_id);
                const answerPayload = res.data.payload;
                const pc = peerConnectionRef.current;
                if (answerPayload?.sdp && pc) {
                  console.log('[WebRTC Debug] Setting remote description (answer sdp) on caller...');
                  await pc.setRemoteDescription(new RTCSessionDescription(answerPayload.sdp));
                  await processIceQueue(pc);
                }
              } else if (res.event === 'WEBRTC_ICE') {
                console.log('[WebRTC Debug] Received WEBRTC_ICE from:', res.data.from_user_id);
                const icePayload = res.data.payload;
                if (icePayload?.candidate) {
                  const pc = peerConnectionRef.current;
                  if (pc && pc.remoteDescription) {
                    console.log('[WebRTC Debug] Adding ICE candidate directly...');
                    await pc.addIceCandidate(new RTCIceCandidate(icePayload.candidate));
                  } else {
                    console.log('[WebRTC Debug] Remote description not set yet, queuing ICE candidate...');
                    iceCandidatesQueueRef.current.push(icePayload.candidate);
                  }
                }
              }
            } catch (err) { console.error('[MetaOffice WS] Parse error', err); }
          };
        }

        private syncTeammates(players: PlayerData[]) {
          const myId = localUserRef.current?.id;
          players.forEach((p) => {
            if (p.id === myId) { this.setAura(this.player, p.aura); return; }
            const skinIdx = p.id % CHAR_SKINS.length;
            let c = this.teammates.get(p.id);
            if (!c) {
              c = this.spawnCharacter(p.x, p.y, p.name, p.aura, false, skinIdx);
              this.teammates.set(p.id, c);
            }
            this.tweens.add({ targets: c, x: p.x, y: p.y, duration: 60, ease: 'Linear' });
            this.setAura(c, p.aura);
            const dir = p.direction || 'down';
            
            // Alternate walk frames for teammates if moving
            const frameNum = p.is_moving ? (Math.floor(this.time.now * 0.006) % 2 === 0 ? '_w1' : '_w2') : '';
            this.setSprite(c, dir, frameNum);
            
            // Y-sort remote teammates dynamically
            c.setDepth(Math.round(p.y));
          });

          this.teammates.forEach((c, id) => {
            if (!players.some((p) => p.id === id)) { c.destroy(); this.teammates.delete(id); }
          });
        }

        private evalProximity() {
          const myId = localUserRef.current?.id;
          let nearest: PlayerData | null = null;
          let minDist = 90;
          activePlayersRef.current.forEach((p) => {
            if (p.id === myId) return; // Skip yourself
            const dx = p.x - this.player.x, dy = p.y - this.player.y;
            const d  = Math.sqrt(dx * dx + dy * dy);
            if (d < minDist) { minDist = d; nearest = p; }
          });
          setProximityUser(nearest);
        }
      }

      // ── Phaser game config ────────────────────────────────────────────────
      const canvasW = isMini
        ? (containerRef.current?.clientWidth  || 380)
        : (containerRef.current?.clientWidth  || 1440);
      const canvasH = isMini
        ? (containerRef.current?.clientHeight || 240)
        : (containerRef.current?.clientHeight || 900);

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: containerRef.current || undefined,
        width:  canvasW,
        height: canvasH,
        backgroundColor: '#7ab648',  // bright outdoor green matching Gather.town grass
        physics: {
          default: 'arcade',
          arcade:  { gravity: { x: 0, y: 0 }, debug: false },
        },
        scene: [OfficeScene],
        callbacks: {
          postBoot: (g) => {
            g.registry.set('onLoadComplete', () => {
              setPhaserLoaded(true);
            });
          }
        }
      };

      game = new Phaser.Game(config);
      gameRef.current = game;
    });

    return () => {
      destroyed = true;
      isInitRef.current = false;
      game?.destroy(true);
      socketRef.current?.close();
    };
  }, [token]);

  // Handle dynamic resizing when switching between PiP and full screen
  useEffect(() => {
    const game = gameRef.current;
    if (game) {
      setTimeout(() => {
        const w = containerRef.current?.clientWidth || (isMini ? 380 : 1400);
        const h = containerRef.current?.clientHeight || (isMini ? 220 : 900);
        game.scale.resize(w, h);
        try {
          const scene = game.scene.getScene('OfficeScene');
          if (scene) {
            scene.cameras.main.setZoom(isMini ? 0.45 : 1.8);
          }
        } catch (_) {}
      }, 50);
    }
  }, [isMini]);

  // ─── Mini PiP render ─────────────────────────────────────────────────────
  if (isMini) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%', background: '#0d1117', overflow: 'hidden' }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        {/* Minimal room badge */}
        <div
          style={{
            position: 'absolute', bottom: 6, left: 8, right: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              fontSize: 8, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
              background: 'rgba(13,17,23,0.85)', color: '#60a5fa',
              border: '1px solid #1f6feb', letterSpacing: '0.1em', textTransform: 'uppercase',
            }}
          >
            📍 {currentRoom}
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {activePlayers.slice(0, 4).map((p) => (
              <div
                key={p.id}
                title={p.name}
                style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: auraCss(p.aura),
                  boxShadow: `0 0 5px ${auraCss(p.aura)}`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Full render ─────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#0d1117', overflow: 'hidden' }}>
      {/* ── Premium Loading Overlay ── */}
      {!phaserLoaded && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            fontFamily: "'Outfit', 'Inter', sans-serif",
          }}
        >
          {/* Animated Pulsing Icon */}
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'pulseGlow 2s infinite ease-in-out',
              marginBottom: 24,
            }}
          >
            <span style={{ fontSize: 36, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.25))' }}>🏢</span>
          </div>

          <h2 style={{ color: '#f8fafc', margin: '0 0 10px 0', fontSize: 22, fontWeight: 900, letterSpacing: '0.04em' }}>
            Entering MetaOffice
          </h2>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: 13, fontWeight: 500, letterSpacing: '0.01em' }}>
            Preparing your desk and syncing with teammates...
          </p>

          <style dangerouslySetInnerHTML={{__html: `
            @keyframes pulseGlow {
              0% { transform: scale(1); box-shadow: 0 0 30px rgba(59, 130, 246, 0.4); }
              50% { transform: scale(1.06); box-shadow: 0 0 60px rgba(139, 92, 246, 0.65); }
              100% { transform: scale(1); box-shadow: 0 0 30px rgba(59, 130, 246, 0.4); }
            }
          `}} />
        </div>
      )}

      {/* ── Hidden Audio Element for WebRTC ── */}
      <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />

      {/* ── Custom Toast Notification ── */}
      {toastMessage && (
        <div
          style={{
            position: 'absolute',
            top: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#1e293b',
            border: '1px solid #dc2626',
            borderRadius: 12,
            padding: '10px 20px',
            color: '#f8fafc',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.04em',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)',
            zIndex: 100000,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: "'Inter', sans-serif",
            animation: 'fadeInDown 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <span>⚠️ {toastMessage}</span>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes fadeInDown {
              from { opacity: 0; transform: translate(-50%, -10px); }
              to { opacity: 1; transform: translate(-50%, 0); }
            }
          `}} />
        </div>
      )}

      {/* ── Incoming Wave Request Modal ── */}
      {incomingWave && (
        <div
          style={{
            position: 'absolute',
            top: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#ffffff',
            borderRadius: 16,
            padding: '12px 20px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            zIndex: 10000,
            fontFamily: "'Inter', sans-serif",
            animation: 'fadeInDown 0.3s ease-out',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>👋 Teammate Waved</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#334155' }}>
              @{activePlayers.find(p => p.id === incomingWave.fromUserId)?.name?.split('@')[0] || `User #${incomingWave.fromUserId}`} waved at you
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setIncomingWave(null)}
              style={{
                fontSize: 10, fontWeight: 700, padding: '6px 12px', borderRadius: 8,
                background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0',
                cursor: 'pointer',
              }}
            >
              Ignore
            </button>
            <button
              onClick={handleWaveBack}
              style={{
                fontSize: 10, fontWeight: 700, padding: '6px 12px', borderRadius: 8,
                background: '#16a34a', color: '#ffffff', border: 'none',
                cursor: 'pointer',
              }}
            >
              Wave Back
            </button>
          </div>
        </div>
      )}

      {/* ── Incoming Call Modal overlay ── */}
      {incomingCall && (
        <div
          style={{
            position: 'absolute',
            top: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#ffffff',
            borderRadius: 16,
            padding: '12px 20px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            zIndex: 10000,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Incoming {incomingCall.callType === 'video' ? 'Video Meeting' : 'Voice Call'}
            </span>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#334155' }}>
              @{activePlayers.find(p => p.id === incomingCall.fromUserId)?.name?.split('@')[0] || `User #${incomingCall.fromUserId}`} wants to connect
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleRejectCall}
              style={{
                fontSize: 10, fontWeight: 700, padding: '6px 12px', borderRadius: 8,
                background: '#fef2f2', color: '#dc2626', border: '1px solid #fee2e2',
                cursor: 'pointer',
              }}
            >
              Decline
            </button>
            <button
              onClick={handleAcceptCall}
              style={{
                fontSize: 10, fontWeight: 700, padding: '6px 12px', borderRadius: 8,
                background: '#2563eb', color: '#ffffff', border: 'none',
                cursor: 'pointer',
              }}
            >
              Accept
            </button>
          </div>
        </div>
      )}

      {/* ── Floating Video Call Grid ── */}
      {activeCall && callType === 'video' && (
        <div
          style={{
            position: 'absolute',
            top: 24,
            right: 24,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 12,
            zIndex: 10000,
            pointerEvents: 'auto',
            fontFamily: "'Inter', sans-serif",
            animation: 'fadeInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div style={{ display: 'flex', gap: 16 }}>
            {/* Local Video Window */}
            <div
              style={{
                position: 'relative',
                width: 200,
                height: 136,
                borderRadius: 14,
                border: '3.5px solid #ffffff',
                overflow: 'hidden',
                background: '#1e293b',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3), 0 8px 10px -6px rgba(0,0,0,0.3)',
              }}
            >
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  background: 'rgba(15, 23, 42, 0.8)',
                  color: '#ffffff',
                  padding: '3px 8px',
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  backdropFilter: 'blur(4px)',
                }}
              >
                You
              </div>
              <div
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 2,
                  height: 12,
                }}
              >
                <span style={{ width: 2, height: 4, background: '#22c55e', borderRadius: 1 }} />
                <span style={{ width: 2, height: 6, background: '#22c55e', borderRadius: 1 }} />
                <span style={{ width: 2, height: 9, background: '#22c55e', borderRadius: 1 }} />
                <span style={{ width: 2, height: 12, background: '#22c55e', borderRadius: 1 }} />
              </div>
            </div>

            {/* Remote Video Window */}
            <div
              style={{
                position: 'relative',
                width: 200,
                height: 136,
                borderRadius: 14,
                border: '3.5px solid #ffffff',
                overflow: 'hidden',
                background: '#1e293b',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3), 0 8px 10px -6px rgba(0,0,0,0.3)',
              }}
            >
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  background: 'rgba(15, 23, 42, 0.8)',
                  color: '#ffffff',
                  padding: '3px 8px',
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  backdropFilter: 'blur(4px)',
                }}
              >
                {activePlayers.find(p => p.id === activeCall.peerId)?.name?.split('@')[0] || `User #${activeCall.peerId}`}
              </div>
              <div
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 2,
                  height: 12,
                }}
              >
                <span style={{ width: 2, height: 4, background: '#22c55e', borderRadius: 1 }} />
                <span style={{ width: 2, height: 6, background: '#22c55e', borderRadius: 1 }} />
                <span style={{ width: 2, height: 9, background: '#22c55e', borderRadius: 1 }} />
                <span style={{ width: 2, height: 12, background: '#22c55e', borderRadius: 1 }} />
              </div>
            </div>
          </div>

          <button
            onClick={() => cleanupCall(true)}
            style={{
              fontSize: 9,
              fontWeight: 800,
              padding: '6px 14px',
              borderRadius: 8,
              background: '#dc2626',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
              transition: 'all 0.2s',
            }}
          >
            End Call
          </button>
          
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes fadeInRight {
              from { opacity: 0; transform: translateX(20px); }
              to { opacity: 1; transform: translateX(0); }
            }
          `}} />
        </div>
      )}

      {/* ── Active Call HUD Indicator ── */}
      {activeCall && callType === 'voice' && (
        <div
          style={{
            position: 'absolute',
            top: 24,
            right: 24,
            background: 'rgba(15, 23, 42, 0.9)',
            borderRadius: 12,
            padding: '8px 16px',
            border: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            zIndex: 10000,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ position: 'relative', display: 'flex', height: 8, width: 8 }}>
              <span style={{ position: 'absolute', display: 'inline-flex', height: '100%', width: '100%', borderRadius: '50%', background: '#22c55e', opacity: 0.75, animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
              <span style={{ position: 'relative', display: 'inline-flex', borderRadius: '50%', height: 8, width: 8, background: '#22c55e' }} />
            </span>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Connected to User #{activeCall.peerId}
            </span>
          </div>
          <button
            onClick={() => cleanupCall()}
            style={{
              fontSize: 9, fontWeight: 800, padding: '4px 8px', borderRadius: 6,
              background: '#dc2626', color: '#ffffff', border: 'none',
              cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.04em',
            }}
          >
            End Call
          </button>
        </div>
      )}
      {/* Phaser canvas mount */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* ── Proximity bubble ── */}
      <ProximityBubble
        user={proximityUser}
        getAuraCss={auraCss}
        onInitiateCall={handleInitiateCall}
        activeCall={activeCall}
        onEndCall={() => cleanupCall()}
        onWave={handleSendWave}
      />

      {/* ── Minimap ── */}
      <Minimap
        rooms={ROOMS}
        activePlayers={activePlayers}
        playerPos={playerPos}
        worldW={WORLD_W}
        worldH={WORLD_H}
        getAuraCss={auraCss}
      />

      {/* ── Bottom HUD ── */}
      <HudBar
        currentRoom={currentRoom}
        playerPos={playerPos}
        activePlayers={activePlayers}
        getAuraCss={auraCss}
        onCustomize={() => setIsCustomizing(true)}
        onWave={handleSendWave}
      />

      {/* ── Avatar Customizer Modal ── */}
      {isCustomizing && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 24,
              padding: '24px 28px',
              width: 380,
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
              border: '1px solid #e2e8f0',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#1e293b' }}>
                👕 Customize Your Avatar
              </h3>
              <button
                onClick={() => setIsCustomizing(false)}
                style={{
                  background: 'none', border: 'none', fontSize: 18, color: '#64748b', cursor: 'pointer', fontWeight: 'bold'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Hair Color */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                  Hair Color
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { label: 'Indigo', hex: '#312e81', val: 0x312e81 },
                    { label: 'Black', hex: '#1c0700', val: 0x1c0700 },
                    { label: 'Brown', hex: '#3b1800', val: 0x3b1800 },
                    { label: 'Red', hex: '#c0392b', val: 0xc0392b },
                    { label: 'Blonde', hex: '#d4a017', val: 0xd4a017 },
                    { label: 'Grey', hex: '#64748b', val: 0x64748b },
                  ].map((h) => (
                    <button
                      key={h.val}
                      onClick={() => setSelectedHair(h.val)}
                      style={{
                        width: 24, height: 24, borderRadius: '50%', background: h.hex,
                        border: selectedHair === h.val ? '3px solid #3b82f6' : '1px solid #cbd5e1',
                        cursor: 'pointer', outline: 'none'
                      }}
                      title={h.label}
                    />
                  ))}
                </div>
              </div>

              {/* Shirt Color */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                  Shirt Color
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { label: 'Indigo', hex: '#6366f1', val: 0x6366f1 },
                    { label: 'Green', hex: '#16a34a', val: 0x16a34a },
                    { label: 'Red', hex: '#dc2626', val: 0xdc2626 },
                    { label: 'Purple', hex: '#7c3aed', val: 0x7c3aed },
                    { label: 'Orange', hex: '#ea580c', val: 0xea580c },
                    { label: 'Cyan', hex: '#0891b2', val: 0x0891b2 },
                  ].map((s) => (
                    <button
                      key={s.val}
                      onClick={() => setSelectedShirt(s.val)}
                      style={{
                        width: 24, height: 24, borderRadius: '50%', background: s.hex,
                        border: selectedShirt === s.val ? '3px solid #3b82f6' : '1px solid #cbd5e1',
                        cursor: 'pointer', outline: 'none'
                      }}
                      title={s.label}
                    />
                  ))}
                </div>
              </div>

              {/* Pants Color */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                  Pants Color
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { label: 'Dark Blue', hex: '#1e1b4b', val: 0x1e1b4b },
                    { label: 'Dark Grey', hex: '#1e293b', val: 0x1e293b },
                    { label: 'Brown', hex: '#431407', val: 0x431407 },
                    { label: 'Teal', hex: '#164e63', val: 0x164e63 },
                  ].map((p) => (
                    <button
                      key={p.val}
                      onClick={() => setSelectedPants(p.val)}
                      style={{
                        width: 24, height: 24, borderRadius: '50%', background: p.hex,
                        border: selectedPants === p.val ? '3px solid #3b82f6' : '1px solid #cbd5e1',
                        cursor: 'pointer', outline: 'none'
                      }}
                      title={p.label}
                    />
                  ))}
                </div>
              </div>

              {/* Skin Tone */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                  Skin Tone
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { label: 'Fair', hex: '#ffdbb4', val: 0xffdbb4 },
                    { label: 'Olive', hex: '#d4956a', val: 0xd4956a },
                    { label: 'Medium', hex: '#c8874a', val: 0xc8874a },
                    { label: 'Dark', hex: '#8b5e3c', val: 0x8b5e3c },
                  ].map((sk) => (
                    <button
                      key={sk.val}
                      onClick={() => setSelectedSkin(sk.val)}
                      style={{
                        width: 24, height: 24, borderRadius: '50%', background: sk.hex,
                        border: selectedSkin === sk.val ? '3px solid #3b82f6' : '1px solid #cbd5e1',
                        cursor: 'pointer', outline: 'none'
                      }}
                      title={sk.label}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 24, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setIsCustomizing(false)}
                style={{
                  fontSize: 11, fontWeight: 700, padding: '8px 16px', borderRadius: 8,
                  background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1',
                  cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAvatar}
                style={{
                  fontSize: 11, fontWeight: 700, padding: '8px 16px', borderRadius: 8,
                  background: '#2563eb', color: '#ffffff', border: 'none',
                  cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em',
                  boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                }}
              >
                Save & Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
