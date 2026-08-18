import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Person {
  id: number;
  name: string;
  email: string;
  role: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  activity?: string;
  avatarUrl?: string;
}

interface DirectoryPanelProps {
  spaceName: string;
  people: Person[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const STATUS_COLORS = {
  online: '#10B981',
  offline: '#94A3B8',
  away: '#F59E0B',
  busy: '#EF4444',
};

const STATUS_LABELS = {
  online: 'Active',
  offline: 'Offline',
  away: 'Away',
  busy: 'Busy',
};

export const DirectoryPanel: React.FC<DirectoryPanelProps> = ({
  spaceName,
  people,
  isCollapsed,
  onToggleCollapse,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    online: true,
    offline: true,
  });

  const filteredPeople = people.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onlinePeople = filteredPeople.filter((p) => p.status === 'online');
  const offlinePeople = filteredPeople.filter((p) => p.status !== 'online');

  const toggleSearchHint = () => {
    // Ctrl+F hint - could focus search input
    const searchInput = document.getElementById('directory-search');
    searchInput?.focus();
  };

  const renderPerson = (person: Person) => (
    <motion.div
      key={person.id}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.04)' }}
      className="flex items-center space-x-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors"
      style={{ border: '1px solid transparent' }}
    >
      <div className="relative">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-sm"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}
        >
          {person.name.charAt(0).toUpperCase()}
        </div>
        <span
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
          style={{ background: STATUS_COLORS[person.status] }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-semibold text-gray-900 truncate">{person.name}</p>
          {person.status === 'online' && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}
            >
              {STATUS_LABELS[person.status]}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 truncate">
          {person.activity || person.role}
        </p>
      </div>
    </motion.div>
  );

  return (
    <AnimatePresence>
      {!isCollapsed && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 280, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="flex flex-col h-full overflow-hidden border-r border-gray-200"
          style={{
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Header: Space title + collapse toggle */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
            <div className="flex items-center space-x-2 min-w-0">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-sm text-gray-900 truncate">{spaceName}</h2>
                <p className="text-[11px] text-gray-500 truncate">{people.length} members</p>
              </div>
            </div>
            <button
              onClick={onToggleCollapse}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              aria-label="Collapse panel"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          </div>

          {/* Search Bar */}
          <div className="px-4 py-3">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                id="directory-search"
                type="text"
                placeholder="Search people"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={toggleSearchHint}
                className="w-full pl-9 pr-12 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
              />
              <span
                className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px] font-semibold text-gray-400 border border-gray-200 bg-white"
              >
                Ctrl + F
              </span>
            </div>
          </div>

          {/* People List */}
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            {/* Online Section */}
            <button
              onClick={() => setExpandedSections(s => ({ ...s, online: !s.online }))}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
                  style={{ transform: expandedSections.online ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                <span>Online ({onlinePeople.length})</span>
              </div>
            </button>
            <AnimatePresence initial={false}>
              {expandedSections.online && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-1 mt-1"
                >
                  {onlinePeople.map(renderPerson)}
                  {onlinePeople.length === 0 && (
                    <p className="text-xs text-gray-400 px-3 py-2">No one online</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Offline Section */}
            <button
              onClick={() => setExpandedSections(s => ({ ...s, offline: !s.offline }))}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors mt-2"
            >
              <div className="flex items-center space-x-2">
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
                  style={{ transform: expandedSections.offline ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                <span>Offline ({offlinePeople.length})</span>
              </div>
            </button>
            <AnimatePresence initial={false}>
              {expandedSections.offline && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-1 mt-1"
                >
                  {offlinePeople.map(renderPerson)}
                  {offlinePeople.length === 0 && (
                    <p className="text-xs text-gray-400 px-3 py-2">No one offline</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DirectoryPanel;