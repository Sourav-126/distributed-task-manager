import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { eraseCookie } from '@/utils/cookies';
import ToastContainer from './ToastContainer';
import Modal from './Modal';
import Button from './Button';
import { useNotifications } from '@/utils/useNotifications';
import NotificationPanel from './NotificationPanel';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';

import LeftNavRail from './LeftNavRail';
import DirectoryPanel from './DirectoryPanel';
import MinimapOverlay from './MinimapOverlay';
import BottomMediaToolbar from './BottomMediaToolbar';
import ViewportControls from './ViewportControls';

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

import { useGetOnboardingStatusQuery } from '@/store/apiSlice';

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState<boolean>(false);

  // Directory panel state
  const [directoryOpen, setDirectoryOpen] = useState(false);

  // Mock people data (replace with real API later)
  const [people] = useState([
    { id: 1, name: 'You', email: 'you@example.com', role: 'Admin', status: 'online' as const, activity: 'In Engineering', avatarUrl: null },
    { id: 2, name: 'Sarah Chen', email: 'sarah@example.com', role: 'Engineer', status: 'online' as const, activity: 'In Product Team', avatarUrl: null },
    { id: 3, name: 'Mike Johnson', email: 'mike@example.com', role: 'Designer', status: 'online' as const, activity: 'In Design Studio', avatarUrl: null },
    { id: 4, name: 'Emily Davis', email: 'emily@example.com', role: 'PM', status: 'away' as const, activity: 'Away 15 min', avatarUrl: null },
    { id: 5, name: 'Alex Rivera', email: 'alex@example.com', role: 'Engineer', status: 'offline' as const, activity: 'Last seen 2h ago', avatarUrl: null },
    { id: 6, name: 'Jordan Kim', email: 'jordan@example.com', role: 'Designer', status: 'offline' as const, activity: 'Last seen yesterday', avatarUrl: null },
  ]);

  // Check onboarding status
  const { data: onboardingData, isLoading: onboardingLoading } = useGetOnboardingStatusQuery(undefined, { skip: !token });
  const needsOnboarding = token && onboardingData && !onboardingData.is_complete;
  const onboardingPath = '/onboarding';
  const isOnboardingPage = router.pathname === onboardingPath;

  // Detect auth pages (login / signup) — notification permission must never
  // be requested on these pages; only after the user is logged in.
  const isAuthPage = router.pathname === '/signin' || router.pathname === '/signup';

  // Hook for real-time SSE notifications.
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

  // Media toolbar state
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);

  // Viewport controls state
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(false);

  // Minimap data (connect to PhaserOffice via ref or context later)
  const [minimapData, setMinimapData] = useState({
    players: [
      { id: 1, x: 800, y: 350, name: 'You', color: '#3B82F6', isLocal: true },
      { id: 2, x: 600, y: 200, name: 'Sarah', color: '#10B981' },
      { id: 3, x: 1000, y: 400, name: 'Mike', color: '#F59E0B' },
    ],
    rooms: [
      { name: 'Engineering', x: 40, y: 40, w: 400, h: 280, color: '#3B82F6' },
      { name: 'Product Team', x: 480, y: 40, w: 540, h: 280, color: '#6366F1' },
      { name: 'Design Studio', x: 1070, y: 40, w: 490, h: 280, color: '#EF4444' },
      { name: 'Conf Room A', x: 40, y: 380, w: 300, h: 240, color: '#10B981' },
      { name: 'Conf Room B', x: 390, y: 380, w: 300, h: 240, color: '#10B981' },
      { name: 'Break Room', x: 740, y: 380, w: 340, h: 240, color: '#F59E0B' },
      { name: 'Design Lounge', x: 1130, y: 380, w: 430, h: 240, color: '#6366F1' },
    ],
    viewport: { x: 700, y: 300, width: 1440, height: 900 },
    worldWidth: 1600,
    worldHeight: 1000,
  });

  useEffect(() => {
    const storedToken = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user_profile');
    setToken(storedToken);
    if (storedToken && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse user profile', e);
      }
    } else if (!storedToken && !isAuthPage && router.isReady) {
      router.push('/signin');
    }
  }, [router.asPath, router.isReady, isAuthPage]);

  // Redirect to onboarding if needed
  if (needsOnboarding && !isAuthPage && !isOnboardingPage && router.pathname !== '/metaoffice' && router.isReady) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: '#F8FAFC' }}>
        <ToastContainer />
        <div className="text-center text-gray-500">Redirecting to onboarding...</div>
      </main>
    );
  }

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
      <main className="min-h-screen flex items-center justify-center" style={{ background: '#F8FAFC' }}>
        <ToastContainer />
        {children}
      </main>
    );
  }

  // New 4-zone Gather-style layout
  return (
    <div className="min-h-screen w-full" style={{ background: '#F8FAFC' }}>
      <ToastContainer />

      {/* Zone 1: Left Nav Rail (fixed, always visible) */}
      <LeftNavRail />

      {/* Zone 2: Collapsible Directory Panel */}
      <DirectoryPanel
        spaceName="MetaOffice"
        people={people}
        isCollapsed={!directoryOpen}
        onToggleCollapse={() => setDirectoryOpen(!directoryOpen)}
      />

      {/* Zone 3: Full-bleed Canvas Viewport */}
      {router.pathname === '/metaoffice' && (
        <>
          <div className="absolute inset-0 z-10">
            <PhaserOffice token={token || ''} />
          </div>

          {/* HUD Overlays */}
          {/* Bottom-Left: Minimap */}
          <MinimapOverlay
            players={minimapData.players}
            rooms={minimapData.rooms}
            viewport={minimapData.viewport}
            worldWidth={minimapData.worldWidth}
            worldHeight={minimapData.worldHeight}
            onTeleport={(x, y) => {
              // TODO: Send teleport to Phaser scene via ref
              console.log('Teleport to:', x, y);
            }}
          />

          {/* Bottom-Center: Media Toolbar */}
          <BottomMediaToolbar
            micEnabled={micEnabled}
            cameraEnabled={cameraEnabled}
            screenSharing={screenSharing}
            onToggleMic={() => setMicEnabled(!micEnabled)}
            onToggleCamera={() => setCameraEnabled(!cameraEnabled)}
            onToggleScreenShare={() => setScreenSharing(!screenSharing)}
            onEmojiPicker={() => console.log('Emoji picker')}
            onMoreOptions={() => console.log('More options')}
            onLeave={() => router.push('/')}
          />

          {/* Bottom-Right: Viewport Controls */}
          <ViewportControls
            zoom={zoom}
            minZoom={0.5}
            maxZoom={3}
            onZoomIn={() => setZoom(Math.min(3, zoom + 0.25))}
            onZoomOut={() => setZoom(Math.max(0.5, zoom - 0.25))}
            onRecenter={() => setZoom(1)}
            onToggleGrid={() => setShowGrid(!showGrid)}
            showGrid={showGrid}
          />
        </>
      )}

      {/* Zone 4: Dashboard / Content Area (for non-canvas pages) */}
      {router.pathname !== '/metaoffice' && (
        <main className="flex-1 p-8" style={{ marginLeft: directoryOpen ? '344px' : '64px' }}>
          <div className="max-w-[1440px] mx-auto w-full">
            {children}
          </div>
        </main>
      )}

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

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        title="Confirm Logout"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsLogoutModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleLogout}>
              Logout
            </Button>
          </>
        }
      >
        <p className="text-gray-500">Are you sure you want to log out of your session? You will need to sign in again to access the workspace.</p>
      </Modal>

      {/* Persisted Spatial Canvas wrapper — holds state and prevents duplicate websocket connections */}
      {token && router.pathname !== '/metaoffice' && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 50,
            pointerEvents: 'none' as const,
          }}
        >
          <div
            style={{
              pointerEvents: 'auto' as const,
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            }}
          >
            <PhaserOffice token={token} isMini={true} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;