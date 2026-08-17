import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { eraseCookie } from '@/utils/cookies';
import ToastContainer from './ToastContainer';
import Sidebar from './Sidebar';
import Modal from './Modal';
import Button from './Button';
import { useNotifications } from '@/utils/useNotifications';
import NotificationPanel from './NotificationPanel';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';

const PhaserOffice = dynamic(() => import('@/components/common/PhaserOffice'), {
  ssr: false,
});

export interface UserProfile {
  id: number;
  email: string;
  role: string;
  org_id?: number | null;
}

export interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState<boolean>(false);

  // Detect auth pages (login / signup) — notification permission must never
  // be requested on these pages; only after the user is logged in.
  const isAuthPage = router.pathname === '/signin' || router.pathname === '/signup';

  // Hook for real-time SSE notifications.
  // Pass null on auth pages so the hook's token guard blocks all side-effects
  // (SSE connection, permission prompt, etc.) until the user is logged in.
  const {
    notifications,
    unreadCount,
    isOpen: isNotifOpen,
    setIsOpen: setIsNotifOpen,
    markAllAsRead,
    markAsRead,
    permission,
    requestPermission,
  } = useNotifications(isAuthPage ? null : token);

  useEffect(() => {
    const storedToken = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user_profile');
    setToken(storedToken);
    if (storedToken && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user profile", e);
      }
    } else if (!storedToken && !isAuthPage && router.isReady) {
      router.push('/signin');
    }
  }, [router.asPath, router.isReady, isAuthPage]);

  const [workspaceState, setWorkspaceState] = useState<'closed' | 'minimized' | 'full'>('closed');

  useEffect(() => {
    const handleMinimize = () => {
      setWorkspaceState('minimized');
      router.push('/');
    };
    window.addEventListener('minimize-workspace', handleMinimize);
    return () => window.removeEventListener('minimize-workspace', handleMinimize);
  }, [router]);

  useEffect(() => {
    if (router.pathname === '/metaoffice') {
      setWorkspaceState('full');
    } else if (workspaceState === 'full') {
      setWorkspaceState('minimized');
    }
  }, [router.pathname]);

  const handleLogout = (): void => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_profile');
    eraseCookie('access_token');
    eraseCookie('user_profile');
    setUser(null);
    setIsLogoutModalOpen(false);
    router.push('/signin');
  };

  if (isAuthPage) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white text-app-text transition-colors duration-200">
        <ToastContainer />
        {children}
      </main>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white text-app-text">
      <ToastContainer />
      
      {/* Full-bleed Header */}
      <header className="h-16 sticky top-0 z-40 bg-white border-b border-app-border flex items-center justify-between px-6 w-full">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center font-bold text-white shadow-md">
            M
          </div>
          <span className="font-bold text-lg tracking-tight text-primary">
            MetaOffice
          </span>
        </div>

        <nav className="flex items-center space-x-6">
          <Link href="/" className={`text-sm font-semibold hover:text-primary transition-colors ${router.pathname === '/' ? 'text-primary' : 'text-app-text-muted'}`}>
            Dashboard
          </Link>
          
          {user && (
            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-xl transition-all relative"
                title="Notifications"
              >
                <span className="text-lg">🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-danger text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          )}

          {user && (
            <Button
              variant="outline"
              onClick={() => setIsLogoutModalOpen(true)}
              className="px-3.5 py-1.5 border-app-border hover:bg-danger/10 hover:text-danger hover:border-danger/30"
            >
              Logout
            </Button>
          )}
        </nav>
      </header>

      {/* Real-time Notifications Flyout Panel */}
      <NotificationPanel
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        markAllAsRead={markAllAsRead}
        markAsRead={markAsRead}
        permission={permission}
        requestPermission={requestPermission}
      />

      {/* Full-bleed Layout wrapper with max-width content container */}
      <div className="flex flex-1 w-full">
        <Sidebar user={user} onLogoutClick={() => setIsLogoutModalOpen(true)} />
        
        <main className="flex-1 p-8 bg-white overflow-y-auto">
          <div className="max-w-[1440px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Logout Confirmation Modal - Rendered at Root Layout Stacking Context */}
      <Modal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        title="Confirm Logout"
        footer={
          <>
            <Button variant="white" onClick={() => setIsLogoutModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleLogout}>
              Logout
            </Button>
          </>
        }
      >
        <p className="text-app-text-muted">Are you sure you want to log out of your session? You will need to sign in again to access the workspace.</p>
      </Modal>

      {/* ── Persisted Spatial Canvas wrapper — holds state and prevents duplicate websocket connections ── */}
      {token && (
        <div
          style={
            workspaceState === 'full'
              ? {
                  position: 'fixed',
                  inset: 0,
                  zIndex: 999,
                  display: 'flex',
                  flexDirection: 'column',
                  background: '#f8f9fa',
                  fontFamily: "'Inter', sans-serif",
                }
              : workspaceState === 'minimized'
              ? {
                  position: 'fixed',
                  bottom: 24,
                  right: 24,
                  width: 380,
                  height: 380,
                  zIndex: 999,
                  borderRadius: 20,
                  border: '1.5px solid #cbd5e1',
                  background: '#ffffff',
                  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15), 0 10px 10px -5px rgba(0,0,0,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  fontFamily: "'Inter', sans-serif",
                }
              : { display: 'none' }
          }
        >
          {workspaceState === 'full' ? (
            /* ── Full Screen Mode Header ── */
            <>
              <div
                className="flex items-center justify-between px-5 h-11 shrink-0"
                style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}
              >
                {/* Logo */}
                <div className="flex items-center gap-2.5">
                  <div
                    className="h-7 w-7 rounded-lg flex items-center justify-center font-black text-sm text-white"
                    style={{ background: 'linear-gradient(135deg, #1f6feb, #6366f1)' }}
                  >
                    M
                  </div>
                  <span className="font-black text-sm tracking-tight" style={{ color: '#1e293b' }}>
                    Meta<span style={{ color: '#2563eb' }}>Office</span>
                  </span>
                  <span
                    className="text-[8px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(37,99,235,0.1)', color: '#2563eb', border: '1px solid rgba(37,99,235,0.2)' }}
                  >
                    Live
                  </span>
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute animate-ping inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                  </span>
                </div>

                {/* Nav links */}
                <nav className="flex items-center gap-1">
                  {[
                    { label: 'Dashboard', href: '/', icon: '📊' },
                    { label: 'Task Board', href: '/tasks/board', icon: '📋' },
                    { label: 'Profile', href: '/profile', icon: '👤' },
                  ].map((item) => (
                    <button
                      key={item.href}
                      onClick={() => {
                        setWorkspaceState('minimized');
                        router.push(item.href);
                      }}
                      className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all"
                      style={{ color: '#64748b' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#1e293b';
                        e.currentTarget.style.background = 'rgba(0,0,0,0.04)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#64748b';
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </nav>

                {/* Right side — Legend & Controls */}
                <div className="flex items-center gap-4">
                  {/* Legend */}
                  <div className="flex items-center gap-3">
                    {[
                      { color: '#22c55e', label: 'Available' },
                      { color: '#eab308', label: 'Busy' },
                      { color: '#ef4444', label: 'Overloaded' },
                      { color: '#3b82f6', label: 'Focus' },
                    ].map(({ color, label }) => (
                      <div key={label} className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: color, boxShadow: `0 0 6px ${color}77` }}
                        />
                        <span className="text-[8px] font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="h-4 w-[1px] bg-slate-200" />

                  {/* Window Controls */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setWorkspaceState('minimized');
                        router.push('/');
                      }}
                      className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md transition-all cursor-pointer bg-slate-100 text-slate-600 hover:bg-slate-205 border border-slate-250 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-150"
                      title="Minimize to PiP"
                    >
                      🗕 Minimize
                    </button>
                    <button
                      onClick={() => {
                        setWorkspaceState('closed');
                        router.push('/');
                      }}
                      className="text-[11px] font-bold px-1.5 py-1 rounded-md transition-all cursor-pointer bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                      title="Close"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>

              {/* Canvas container */}
              <div className="flex-1 min-h-0 relative">
                <PhaserOffice token={token} isMini={false} />
              </div>
            </>
          ) : (
            /* ── Minimized PiP Mode ── */
            <>
              {/* PiP Header */}
              <div
                className="flex items-center justify-between px-4 py-2.5"
                style={{
                  background: '#f8f9fa',
                  borderBottom: '1px solid #cbd5e1',
                }}
              >
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute animate-ping inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#1e293b' }}>
                    MetaOffice
                  </span>
                  <span
                    className="text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(37,99,235,0.08)', color: '#2563eb', border: '1px solid rgba(37,99,235,0.15)' }}
                  >
                    Mini
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      router.push('/metaoffice');
                    }}
                    className="text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md transition-all cursor-pointer bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"
                    title="Restore to full screen"
                  >
                    ↗ Expand
                  </button>
                  <button
                    onClick={() => setWorkspaceState('closed')}
                    className="text-[11px] font-bold px-1.5 py-1 rounded-md transition-all cursor-pointer bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                    title="Close"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* PiP Canvas */}
              <div style={{ height: 260 }} className="relative flex-1">
                <PhaserOffice token={token} isMini={true} />
              </div>

              {/* PiP Footer */}
              <button
                onClick={() => {
                  router.push('/metaoffice');
                }}
                className="w-full py-2.5 text-[8px] font-black uppercase tracking-widest transition-all cursor-pointer text-slate-500 hover:text-blue-600 hover:bg-slate-50"
                style={{ borderTop: '1px solid #cbd5e1', background: '#f8f9fa' }}
              >
                Click to open full workspace →
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Layout;
