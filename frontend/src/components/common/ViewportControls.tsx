import React from 'react';
import { motion } from 'framer-motion';

interface ViewportControlsProps {
  zoom: number;
  minZoom: number;
  maxZoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRecenter: () => void;
  onToggleGrid: () => void;
  showGrid: boolean;
}

export const ViewportControls: React.FC<ViewportControlsProps> = ({
  zoom,
  minZoom = 0.5,
  maxZoom = 3,
  onZoomIn,
  onZoomOut,
  onRecenter,
  onToggleGrid,
  showGrid = false,
}) => {
  const zoomPercent = Math.round(zoom * 100);

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="fixed bottom-6 right-6 z-30"
    >
      <div
        className="flex flex-col items-center space-y-1.5 px-2.5 py-2.5 rounded-2xl"
        style={{
          background: 'rgba(20, 24, 30, 0.85)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        {/* Zoom In */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onZoomIn}
          disabled={zoom >= maxZoom}
          className="flex items-center justify-center w-10 h-10 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Zoom in"
          title="Zoom in (+)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </motion.button>

        {/* Divider */}
        <div className="w-6 h-px bg-gray-600/30 mx-0.5" />

        {/* Zoom Level Display */}
        <div className="px-2 py-0.5 text-[11px] font-bold text-gray-300 w-20 text-center">
          {zoomPercent}%
        </div>

        {/* Divider */}
        <div className="w-6 h-px bg-gray-600/30 mx-0.5" />

        {/* Zoom Out */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onZoomOut}
          disabled={zoom <= minZoom}
          className="flex items-center justify-center w-10 h-10 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Zoom out"
          title="Zoom out (-)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </motion.button>

        {/* Divider */}
        <div className="w-6 h-px bg-gray-600/30 mx-0.5" />

        {/* Recenter / Home */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRecenter}
          className="flex items-center justify-center w-10 h-10 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Recenter view"
          title="Recenter (Home)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2" />
          </svg>
        </motion.button>

        {/* Grid Toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleGrid}
          className={`flex items-center justify-center w-10 h-10 rounded-xl transition-colors ${
            showGrid
              ? 'text-blue-400 hover:text-blue-300 bg-blue-400/10'
              : 'text-gray-300 hover:text-white hover:bg-white/10'
          }`}
          aria-label={showGrid ? 'Hide grid' : 'Show grid'}
          title={showGrid ? 'Hide grid (G)' : 'Show grid (G)'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
          </svg>
        </motion.button>
      </div>
    </motion.div>
  );
};

export default ViewportControls;