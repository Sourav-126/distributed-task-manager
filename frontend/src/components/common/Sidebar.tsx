import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { UserProfile } from './Layout';
import Button from './Button';

interface SidebarProps {
  user: UserProfile | null;
  onLogoutClick: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ user, onLogoutClick }) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!user) return null;

  const isSuperAdmin = user.role === 'super_admin';
  const isOrgAdmin = user.role === 'org_admin';
  const isManager = user.role === 'manager';
  const isTeamLead = user.role === 'team_lead';

  const menuItems = [
    { name: 'Dashboard', href: '/', icon: '📊' },
    ...(isSuperAdmin ? [{ name: 'Organizations', href: '/organizations', icon: '🏢' }] : []),
    ...(isManager || isTeamLead || isOrgAdmin || isSuperAdmin ? [{ name: 'Teams & Management', href: '/teams', icon: '📐' }] : []),
    { name: 'Task Board', href: '/tasks/board', icon: '📋' },
    { name: 'My Tasks', href: '/tasks/me', icon: '⚡' },
    { name: 'Profile & Settings', href: '/profile', icon: '👤' },
  ];

  const filteredMenuItems = menuItems.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] sticky top-16 select-none bg-app-bg">
      {/* LEVEL 1: Leftmost Icon Utility Bar */}
      <div className="w-16 bg-app-surface text-app-text flex flex-col justify-between items-center py-4 border-r border-app-border">
        {/* Top Icons group */}
        <div className="flex flex-col items-center space-y-6 w-full">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center font-black text-white shadow-md"
            style={{ background: 'linear-gradient(135deg, #58a6ff, #a371f7)' }}
          >
            M
          </div>

          <Button
            variant="ghost"
            className="h-10 w-10 !p-0 flex items-center justify-center rounded-xl hover:bg-primary/10 text-app-text-muted hover:text-primary"
            title="Dashboard"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </Button>

          <Button
            variant="ghost"
            className="h-10 w-10 !p-0 flex items-center justify-center rounded-xl hover:bg-primary/10 text-app-text-muted hover:text-primary"
            title="Notifications"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </Button>
        </div>

        {/* Bottom Settings group */}
        <div className="flex flex-col items-center space-y-4 w-full">
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm"
            style={{ background: 'linear-gradient(135deg, #3fb950, #238636)', color: '#0d1117' }}
          >
            {user.email.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      {/* LEVEL 2: Nested Sidebar Panel */}
      <div className="w-68 p-3 flex flex-col h-full bg-app-bg">
        <div className="flex-1 bg-app-surface rounded-2xl border border-app-border shadow-[0_0_30px_rgba(0,0,0,0.3)] flex flex-col p-4 space-y-5 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-app-text truncate">
              {user.org_id ? `Organization ${user.org_id}` : 'MetaOffice'}
            </h2>
            <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded"
                  style={{ background: 'rgba(88,166,255,0.15)', color: '#58a6ff', border: '1px solid rgba(88,166,255,0.2)' }}>
              {user.role}
            </span>
          </div>

          {/* Search/Filter menu items */}
          <div className="relative">
            <input
              type="text"
              placeholder="Filter navigation"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-app-bg border border-app-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 text-app-text text-xs px-3 py-2 rounded-xl focus:outline-none transition-all"
            />
          </div>

          {/* Navigation Links */}
          <div className="flex-1 flex flex-col justify-between">
            <div className="space-y-1">
              {filteredMenuItems.map((item) => {
                const isActive = router.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-gradient-to-r from-primary/10 to-primary-hover/5 text-primary border border-primary/20'
                        : 'text-app-text-muted hover:bg-app-bg hover:text-app-text hover:border-app-border/50 border border-transparent'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* Bottom section with User profile and Logout */}
            <div className="pt-4 border-t border-app-border space-y-3">
              <div className="flex items-center space-x-2.5 px-1">
                <div className="relative">
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs"
                    style={{ background: 'linear-gradient(135deg, #3fb950, #238636)', color: '#0d1117' }}
                  >
                    {user.email.charAt(0).toUpperCase()}
                  </div>
                  <span className="absolute bottom-0 right-0 h-2 w-2 bg-success rounded-full border-2 border-app-surface" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-app-text truncate">{user.email}</p>
                  <p className="text-[9px] font-semibold text-app-text-muted truncate">Active session</p>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={onLogoutClick}
                className="w-full flex items-center justify-center space-x-1.5 py-2 border-app-border hover:bg-danger/10 hover:text-danger hover:border-danger/25 text-app-text-muted rounded-xl text-xs font-bold"
              >
                <span>🚪</span>
                <span>Logout</span>
              </Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Sidebar;
