import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';

interface UserProfile {
  id: number;
  email: string;
  role: string;
  org_id?: number | null;
}

export default function Home() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user_profile');
    if (storedToken) {
      setToken(storedToken);
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (_) {}
      }
    }
  }, []);

  if (!user || !token) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-sm font-semibold text-app-text-muted">Loading workspace...</div>
      </div>
    );
  }

  // Define role helper booleans
  const isSuperAdmin = user.role === 'super_admin';
  const isOrgAdmin = user.role === 'org_admin';
  const isManager = user.role === 'manager';
  const isEmployee = user.role === 'employee';

  return (
    <>
      <Head>
        <title>Dashboard - MetaOffice Spatial Workspace</title>
        <meta name="description" content="View and manage tasks in your spatial office environment" />
      </Head>

      <div className="space-y-8 animate-fadeIn">
        {/* Dashboard Grid based on user role */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* ── MetaOffice Hero Entry Card ─────────────────────────── */}
          <Card className="relative overflow-hidden p-0 border-0 col-span-1 md:col-span-3">
            {/* Gradient background */}
            <div
              className="absolute inset-0 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, #0d1117 0%, #1c2333 50%, #161b22 100%)',
                border: '1.5px solid #30363d',
                boxShadow: '0 0 0 1px rgba(88,166,255,0.08), inset 0 1px 0 rgba(255,255,255,0.04)',
              }}
            />
            {/* Subtle grid overlay */}
            <div
              className="absolute inset-0 rounded-2xl opacity-30"
              style={{
                backgroundImage: 'linear-gradient(rgba(88,166,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(88,166,255,0.05) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            />
            <div className="relative flex items-center justify-between px-8 py-7">
              {/* Left */}
              <div className="flex items-center gap-6">
                <div
                  className="h-14 w-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #1f6feb, #6366f1)', boxShadow: '0 0 24px rgba(99,102,241,0.4)' }}
                >
                  🌐
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-black text-xl tracking-tight" style={{ color: '#e6edf3' }}>MetaOffice</h3>
                    <span
                      className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(63,185,80,0.15)', color: '#3fb950', border: '1px solid rgba(63,185,80,0.3)' }}
                    >
                      Live
                    </span>
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute animate-ping inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                    </span>
                  </div>
                  <p className="text-sm font-medium" style={{ color: '#8b949e' }}>
                    Walk your team floor · See live auras · Hand off tasks in real-time
                  </p>
                </div>
              </div>

              {/* Feature pills */}
              <div className="hidden lg:flex items-center gap-2">
                {['🟢 Aura System', '📍 Room Detection', '🗺️ Minimap', '🤝 Proximity Chat'].map((f) => (
                  <span
                    key={f}
                    className="text-[10px] font-bold px-3 py-1.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.04)', color: '#8b949e', border: '1px solid #30363d' }}
                  >
                    {f}
                  </span>
                ))}
              </div>

              {/* CTA */}
              <Link href="/metaoffice">
                <button
                  className="shrink-0 font-black text-sm px-6 py-3 rounded-xl transition-all cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, #1f6feb, #6366f1)',
                    color: '#ffffff',
                    boxShadow: '0 0 20px rgba(99,102,241,0.35)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 32px rgba(99,102,241,0.55)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 20px rgba(99,102,241,0.35)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  Enter Workspace →
                </button>
              </Link>
            </div>
          </Card>

          {/* Super Admin specific panels */}
          {isSuperAdmin && (
            <>
              <Card className="flex flex-col justify-between space-y-4 border-accent/30 bg-app-surface">
                <div>
                  <div className="h-10 w-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center font-bold text-lg mb-3">
                    🏢
                  </div>
                  <h3 className="font-bold text-lg">Manage Organizations</h3>
                  <p className="text-sm text-app-text-muted mt-1">
                    Create new organizations, provision workspace domains, and manage billing accounts.
                  </p>
                </div>
                <Button variant="secondary" className="w-full mt-4 bg-accent hover:bg-opacity-95">
                  Create Organization
                </Button>
              </Card>

              <Card className="flex flex-col justify-between space-y-4">
                <div>
                  <div className="h-10 w-10 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center font-bold text-lg mb-3">
                    ⚙️
                  </div>
                  <h3 className="font-bold text-lg">Global Ecosystem Config</h3>
                  <p className="text-sm text-app-text-muted mt-1">
                    Monitor gRPC service health, manage session lifetimes, and configure database pools.
                  </p>
                </div>
                <Button variant="outline" className="w-full mt-4">
                  Ecosystem Settings
                </Button>
              </Card>
            </>
          )}

          {/* Org Admin specific panels */}
          {isOrgAdmin && (
            <>
              <Card className="flex flex-col justify-between space-y-4">
                <div>
                  <div className="h-10 w-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center font-bold text-lg mb-3">
                    👥
                  </div>
                  <h3 className="font-bold text-lg">Manage Members & Roles</h3>
                  <p className="text-sm text-app-text-muted mt-1">
                    Invite users, modify employee roles, and assign team managers in this organization.
                  </p>
                </div>
                <Button variant="secondary" className="w-full mt-4 bg-accent hover:bg-opacity-95">
                  Manage Users
                </Button>
              </Card>

              <Card className="flex flex-col justify-between space-y-4">
                <div>
                  <div className="h-10 w-10 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center font-bold text-lg mb-3">
                    📐
                  </div>
                  <h3 className="font-bold text-lg">Create Teams & Managers</h3>
                  <p className="text-sm text-app-text-muted mt-1">
                    Configure team scopes, allocate desks in room maps, and map team dependencies.
                  </p>
                </div>
                <Button variant="outline" className="w-full mt-4">
                  Setup Teams
                </Button>
              </Card>
            </>
          )}

          {/* Manager specific panels */}
          {isManager && (
            <>
              <Card className="flex flex-col justify-between space-y-4">
                <div>
                  <div className="h-10 w-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center font-bold text-lg mb-3">
                    📝
                  </div>
                  <h3 className="font-bold text-lg">Task Creator & Allocator</h3>
                  <p className="text-sm text-app-text-muted mt-1">
                    Create gRPC-backed tasks, set priorities, and allocate them to team members.
                  </p>
                </div>
                <Button variant="secondary" className="w-full mt-4 bg-accent hover:bg-opacity-95">
                  New Task
                </Button>
              </Card>

              <Card className="flex flex-col justify-between space-y-4">
                <div>
                  <div className="h-10 w-10 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center font-bold text-lg mb-3">
                    ⚡
                  </div>
                  <h3 className="font-bold text-lg">Team Activity & Metrics</h3>
                  <p className="text-sm text-app-text-muted mt-1">
                    Invite employees to your team, inspect workload burnout rates, and view tasks.
                  </p>
                </div>
                <Button variant="outline" className="w-full mt-4">
                  Manage Team
                </Button>
              </Card>
            </>
          )}

          {/* Employee specific panels */}
          {isEmployee && (
            <>
              <Card className="flex flex-col justify-between space-y-4">
                <div>
                  <div className="h-10 w-10 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center font-bold text-lg mb-3">
                    ⚡
                  </div>
                  <h3 className="font-bold text-lg">My Active Tasks</h3>
                  <p className="text-sm text-app-text-muted mt-1">
                    Track the tasks assigned directly to you, check deadlines, and update status.
                  </p>
                </div>
                <Button variant="outline" className="w-full mt-4">
                  View Tasks
                </Button>
              </Card>

              <Card className="flex flex-col justify-between space-y-4">
                <div>
                  <div className="h-10 w-10 rounded-lg bg-success/10 text-success flex items-center justify-center font-bold text-lg mb-3">
                    💬
                  </div>
                  <h3 className="font-bold text-lg">My Team Room</h3>
                  <p className="text-sm text-app-text-muted mt-1">
                    Check who is currently online in your team boundaries and coordinate desks.
                  </p>
                </div>
                <Button variant="outline" className="w-full mt-4">
                  Open Desk Room
                </Button>
              </Card>
            </>
          )}

        </div>
      </div>
    </>
  );
}
