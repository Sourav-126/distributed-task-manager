import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';

interface NavItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  badge?: number;
  onClick?: () => void;
  href?: string;
}

export const LeftNavRail: React.FC = () => {
  const router = useRouter();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const navItems: NavItem[] = [
    {
      id: 'search',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      ),
      label: 'Search',
      shortcut: '⌘K',
      onClick: () => {}, // Search modal trigger
    },
    {
      id: 'map',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
      label: 'Map',
      shortcut: 'M',
      href: '/metaoffice',
    },
    {
      id: 'chat',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
      label: 'Chat',
      shortcut: 'C',
      href: '/chat',
    },
    {
      id: 'calendar',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
      label: 'Calendar',
      shortcut: 'L',
      href: '/calendar',
    },
    {
      id: 'notifications',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ),
      label: 'Notifications',
      shortcut: 'N',
      badge: 3,
      onClick: () => {}, // Notification panel trigger
    },
    {
      id: 'gifts',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 12 20 22 4 22 4 12" />
          <rect x="2" y="7" width="20" height="5" rx="1" />
          <line x1="12" y1="22" x2="12" y2="7" />
          <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
          <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
        </svg>
      ),
      label: 'Gifts',
      shortcut: 'G',
      onClick: () => {},
    },
    {
      id: 'settings',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
      label: 'Settings',
      shortcut: 'S',
      href: '/settings',
    },
  ];

  const isActive = (item: NavItem) => {
    if (item.href) return router.pathname === item.href;
    return false;
  };

  return (
    <nav
      className="fixed left-0 top-0 bottom-0 z-40 flex flex-col items-center"
      style={{
        width: 64,
        background: 'rgba(248, 250, 252, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid #E2E8F0',
      }}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Top section - primary navigation */}
      <div className="flex flex-col items-center pt-4 pb-2 space-y-1 flex-1 overflow-y-auto">
        {navItems.map((item) => (
          <motion.button
            key={item.id}
            onClick={item.onClick || (item.href ? () => router.push(item.href) : undefined)}
            onMouseEnter={() => setHoveredItem(item.id)}
            onMouseLeave={() => setHoveredItem(null)}
            className={`relative flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 ${
              isActive(item)
                ? 'bg-primary/10'
                : 'hover:bg-gray-100 text-gray-500'
            }`}
            style={{
              color: isActive(item) ? '#3B82F6' : undefined,
            }}
            aria-label={item.label}
            title={`${item.label}${item.shortcut ? ` (${item.shortcut})` : ''}`}
          >
            <div className="relative flex items-center justify-center">
              {item.icon}
              {item.badge && item.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </div>

            {/* Active indicator dot */}
            {isActive(item) && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
                style={{ background: '#3B82F6' }}
              />
            )}

            {/* Hover tooltip with shortcut */}
            {(hoveredItem === item.id || isActive(item)) && item.shortcut && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="absolute left-full ml-3 px-2 py-1 rounded-lg text-[11px] font-medium text-white whitespace-nowrap shadow-lg"
                style={{ background: 'rgba(20, 24, 30, 0.95)' }}
              >
                {item.shortcut}
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>

      {/* Bottom section - could add user avatar or logout */}
      <div className="pb-4 border-t border-gray-200 w-full flex flex-col items-center px-4 space-y-2">
        <div className="w-full h-px bg-gray-200" />
        <motion.button
          className="w-12 h-12 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="User menu"
          title="Your profile"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </motion.button>
      </div>
    </nav>
  );
};

export default LeftNavRail;