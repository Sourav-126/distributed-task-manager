import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BottomMediaToolbarProps {
  micEnabled: boolean;
  cameraEnabled: boolean;
  screenSharing: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onEmojiPicker: () => void;
  onMoreOptions: () => void;
  onLeave: () => void;
}

interface ToolButtonProps {
  active?: boolean;
  danger?: boolean;
  onClick?: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
}

const ToolButton: React.FC<ToolButtonProps> = ({ active, danger, onClick, icon, label }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`relative flex items-center justify-center w-11 h-11 rounded-full transition-all duration-200 ${
        danger
          ? 'text-white hover:opacity-90'
          : active
          ? 'text-blue-400 hover:text-blue-300'
          : 'text-gray-300 hover:text-white hover:bg-white/10'
      }`}
      style={{
        background: danger
          ? 'rgba(239, 68, 68, 0.9)'
          : active
          ? 'rgba(59, 130, 246, 0.15)'
          : 'transparent',
      }}
      aria-label={label}
      title={label}
    >
      {icon}
    </motion.button>
  );
};

export const BottomMediaToolbar: React.FC<BottomMediaToolbarProps> = ({
  micEnabled,
  cameraEnabled,
  screenSharing,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onEmojiPicker,
  onMoreOptions,
  onLeave,
}) => {
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const emojis = ['👋', '🎉', '❤️', '😂', '🔥', '👍', '🤝', '💡', '✨', '🚀'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30"
    >
      <div
        className="flex items-center space-x-1 px-2 py-2 rounded-full"
        style={{
          background: 'rgba(20, 24, 30, 0.85)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        {/* Avatar / Profile toggle */}
        <ToolButton
          label="Profile"
          onClick={onToggleCamera}
          active={cameraEnabled}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          }
        />

        {/* Mic toggle */}
        <ToolButton
          label={micEnabled ? 'Mute' : 'Unmute'}
          onClick={onToggleMic}
          active={micEnabled}
          icon={
            micEnabled ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            )
          }
        />

        {/* Camera toggle */}
        <ToolButton
          label={cameraEnabled ? 'Camera On' : 'Camera Off'}
          onClick={onToggleCamera}
          active={cameraEnabled}
          icon={
            cameraEnabled ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7" />
                <path d="M1 5h15v14H1z" />
                <line x1="2" y1="2" x2="22" y2="22" />
              </svg>
            )
          }
        />

        {/* Screen share */}
        <ToolButton
          label="Share Screen"
          onClick={onToggleScreenShare}
          active={screenSharing}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          }
        />

        {/* Emoji / Reactions */}
        <div className="relative">
          <ToolButton
            label="Reactions"
            onClick={() => {
              setShowEmoji(!showEmoji);
              setShowMore(false);
            }}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            }
          />

          <AnimatePresence>
            {showEmoji && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                className="absolute bottom-14 left-1/2 -translate-x-1/2 grid grid-cols-5 gap-1 p-2 rounded-2xl"
                style={{
                  background: 'rgba(20, 24, 30, 0.95)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                {emojis.map((emoji, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      onEmojiPicker();
                      setShowEmoji(false);
                    }}
                    className="w-8 h-8 flex items-center justify-center text-xl rounded-lg hover:bg-white/10 transition-colors"
                  >
                    {emoji}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* More options */}
        <div className="relative">
          <ToolButton
            label="More"
            onClick={() => {
              setShowMore(!showMore);
              setShowEmoji(false);
            }}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1" />
                <circle cx="12" cy="5" r="1" />
                <circle cx="12" cy="19" r="1" />
              </svg>
            }
          />

          <AnimatePresence>
            {showMore && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                className="absolute bottom-14 right-0 w-48 p-1.5 rounded-2xl"
                style={{
                  background: 'rgba(20, 24, 30, 0.95)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                {[
                  { label: 'Settings', icon: '⚙️' },
                  { label: 'Invite People', icon: '➕' },
                  { label: 'Keyboard Shortcuts', icon: '⌨️' },
                  { label: 'Help & Support', icon: '❓' },
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={onMoreOptions}
                    className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-sm text-gray-200 hover:bg-white/10 transition-colors"
                  >
                    <span className="text-base">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-600/30 mx-1.5" />

        {/* Leave / End Call */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onLeave}
          className="flex items-center justify-center w-12 h-11 rounded-full text-white hover:opacity-90 transition-opacity ml-0.5"
          style={{
            background: 'rgba(239, 68, 68, 0.9)',
            boxShadow: '0 4px 16px rgba(239, 68, 68, 0.4)',
          }}
          aria-label="Leave space"
          title="Leave space"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </motion.button>
      </div>
    </motion.div>
  );
};

export default BottomMediaToolbar;