import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface MinimapOverlayProps {
  players: Array<{
    id: number;
    x: number;
    y: number;
    name: string;
    color: string;
    isLocal?: boolean;
  }>;
  rooms: Array<{
    name: string;
    x: number;
    y: number;
    w: number;
    h: number;
    color: string;
  }>;
  viewport: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  worldWidth: number;
  worldHeight: number;
  onTeleport: (x: number, y: number) => void;
  isOpen?: boolean;
}

export const MinimapOverlay: React.FC<MinimapOverlayProps> = ({
  players,
  rooms,
  viewport,
  worldWidth,
  worldHeight,
  onTeleport,
  isOpen = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredPlayer, setHoveredPlayer] = useState<number | null>(null);

  const scaleX = 180 / worldWidth;
  const scaleY = 120 / worldHeight;
  const scale = Math.min(scaleX, scaleY);

  // Draw minimap
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = 180 * dpr;
    canvas.height = 120 * dpr;
    canvas.style.width = '180px';
    canvas.style.height = '120px';
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, 180, 120);

    // Background
    ctx.fillStyle = '#0D1117';
    ctx.fillRect(0, 0, 180, 120);

    // World boundary
    ctx.strokeStyle = 'rgba(48, 54, 61, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, 180, 120);

    // Draw rooms
    rooms.forEach((room) => {
      const x = room.x * scale;
      const y = room.y * scale;
      const w = room.w * scale;
      const h = room.h * scale;

      // Room fill
      ctx.fillStyle = room.color + '33'; // 20% opacity
      ctx.fillRect(x, y, w, h);

      // Room border
      ctx.strokeStyle = room.color + '80';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);

      // Room label (if big enough)
      if (w > 40 && h > 25) {
        ctx.font = '9px Inter, sans-serif';
        ctx.fillStyle = room.color + 'CC';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(room.name, x + w / 2, y + h / 2);
      }
    });

    // Viewport indicator
    const vx = viewport.x * scale;
    const vy = viewport.y * scale;
    const vw = viewport.width * scale;
    const vh = viewport.height * scale;

    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(vx, vy, vw, vh);
    ctx.setLineDash([]);

    // Viewport fill
    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
    ctx.fillRect(vx, vy, vw, vh);

    // Draw players
    players.forEach((player) => {
      const px = player.x * scale;
      const py = player.y * scale;

      // Player dot
      ctx.beginPath();
      ctx.arc(px, py, player.isLocal ? 4 : 3, 0, Math.PI * 2);
      ctx.fillStyle = player.isLocal ? '#3B82F6' : player.color;
      ctx.fill();

      // Player border
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = player.isLocal ? 2 : 1.5;
      ctx.stroke();

      // Player name on hover
      if (hoveredPlayer === player.id) {
        ctx.font = '10px Inter, sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(player.name, px, py - 8);
      }
    });
  }, [players, rooms, viewport, worldWidth, worldHeight, hoveredPlayer]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    // Clamp to world bounds
    const clampedX = Math.max(0, Math.min(worldWidth, x));
    const clampedY = Math.max(0, Math.min(worldHeight, y));

    onTeleport(clampedX, clampedY);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    // Check if hovering over a player
    let found = null;
    for (const player of players) {
      const px = player.x * scale;
      const py = player.y * scale;
      const dist = Math.sqrt((px - e.clientX + rect.left) ** 2 + (py - e.clientY + rect.top) ** 2);
      if (dist < 12) {
        found = player.id;
        break;
      }
    }
    setHoveredPlayer(found);
  };

  const handleMouseLeave = () => {
    setHoveredPlayer(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, x: -10 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.9, x: -10 }}
      className="fixed bottom-6 left-6 z-30"
      style={{
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        background: 'rgba(20, 24, 30, 0.9)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
      }}
    >
      <canvas
        ref={canvasRef}
        width={180}
        height={120}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          display: 'block',
          cursor: 'crosshair',
          touchAction: 'none',
        }}
        title="Click to teleport"
      />
    </motion.div>
  );
};

export default MinimapOverlay;