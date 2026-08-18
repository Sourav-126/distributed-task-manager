import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout, { UserProfile } from '@/components/common/Layout';
import Card from '@/components/common/Card';

export default function Profile() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user_profile');
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (_) {}
    }
  }, []);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-sm font-semibold text-app-text-muted">Loading profile...</div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profile & Settings</h1>
          <p className="text-app-text-muted mt-1">Manage your account information and preferences.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card variant="default" className="p-6">
            <h2 className="text-lg font-black border-b border-app-border pb-4 mb-4" style={{ color: '#e6edf3' }}>Account Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-app-text-muted mb-1">Email Address</label>
                <div className="text-app-text font-semibold">{user.email}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-app-text-muted mb-1">Role</label>
                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black"
                     style={{ background: 'rgba(88,166,255,0.15)', color: '#58a6ff', border: '1px solid rgba(88,166,255,0.2)' }}>
                  {user.role}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-app-text-muted mb-1">Organization ID</label>
                <div className="text-app-text font-medium">{user.org_id ? `#${user.org_id}` : 'Platform Level'}</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
