import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Modal from '@/components/common/Modal';
import { getCookie } from '@/utils/cookies';
import { toast } from '@/utils/toast';

interface UserSimple {
  id: number;
  email: string;
  role?: string;
}

interface TeamData {
  id: number;
  name: string;
  team_lead_id?: number | null;
  team_lead?: UserSimple;
  managers: UserSimple[];
  members: UserSimple[];
  count: number;
}

interface MemberData {
  id: number;
  email: string;
  role: string;
}

interface UserProfile {
  id: number;
  email: string;
  role: string;
  org_id?: number | null;
}

export default function TeamsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [members, setMembers] = useState<MemberData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'cards' | 'managers' | 'directory'>('cards');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal States
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState<boolean>(false);
  const [newTeamName, setNewTeamName] = useState<string>('');
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [selectedManagerId, setSelectedManagerId] = useState<string>('');

  const [isAssignMemberOpen, setIsAssignMemberOpen] = useState<boolean>(false);
  const [targetTeamId, setTargetTeamId] = useState<number | null>(null);
  const [selectedUserIdToAssign, setSelectedUserIdToAssign] = useState<string>('');

  const [isAddManagerOpen, setIsAddManagerOpen] = useState<boolean>(false);
  const [selectedManagerToAdd, setSelectedManagerToAdd] = useState<string>('');

  const [isInviteUserOpen, setIsInviteUserOpen] = useState<boolean>(false);
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [invitePassword, setInvitePassword] = useState<string>('future@123');
  const [inviteRole, setInviteRole] = useState<string>('employee');

  const isOrgAdminOrSuper = user?.role === 'org_admin' || user?.role === 'super_admin';

  if (!user || !token) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-sm font-semibold text-app-text-muted">Loading teams management...</div>
      </div>
    );
  }

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch teams
      const teamsRes = await fetch('/api/teams', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (teamsRes.ok) {
        const data = await teamsRes.json();
        setTeams(data.teams || []);
      }

      // Fetch org members
      const membersRes = await fetch('/api/orgs/members', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.members || []);
      }
    } catch (err) {
      console.error('Failed to load teams or members', err);
      toast.error('Error loading teams data');
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  // Filtered teams & members based on search query
  const filteredTeams = teams.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.team_lead && t.team_lead.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    t.managers.some((m) => m.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredMembers = members.filter((m) =>
    m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group teams by manager
  const managerMap = new Map<string, { manager: UserSimple; teams: TeamData[] }>();
  members.filter((m) => m.role === 'manager').forEach((mgr) => {
    managerMap.set(String(mgr.id), { manager: mgr, teams: [] });
  });

  teams.forEach((t) => {
    if (t.managers && t.managers.length > 0) {
      t.managers.forEach((m) => {
        const existing = managerMap.get(String(m.id)) || { manager: m, teams: [] };
        if (!existing.teams.some((et) => et.id === t.id)) {
          existing.teams.push(t);
        }
        managerMap.set(String(m.id), existing);
      });
    }
  });

  // Handlers
  const handleCreateTeam = async () => {
    if (!newTeamName.trim() || !selectedLeadId) {
      toast.error('Please provide a team name and select a Team Lead');
      return;
    }

    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newTeamName.trim(),
          team_lead_id: Number(selectedLeadId),
          manager_id: selectedManagerId ? Number(selectedManagerId) : 0
        })
      });

      if (res.ok) {
        toast.success('Team created successfully!');
        setIsCreateTeamOpen(false);
        setNewTeamName('');
        setSelectedLeadId('');
        setSelectedManagerId('');
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create team');
      }
    } catch (err) {
      toast.error('Error creating team');
    }
  };

  const handleAssignMember = async () => {
    if (!targetTeamId || !selectedUserIdToAssign) return;

    try {
      const res = await fetch(`/api/teams/${targetTeamId}/members`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ user_id: Number(selectedUserIdToAssign) })
      });

      if (res.ok) {
        toast.success('Member assigned to team!');
        setIsAssignMemberOpen(false);
        setSelectedUserIdToAssign('');
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to assign member');
      }
    } catch (err) {
      toast.error('Error assigning member');
    }
  };

  const handleRemoveMember = async (teamId: number, userId: number) => {
    if (!confirm('Are you sure you want to remove this member from the team?')) return;

    try {
      const res = await fetch(`/api/teams/members/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success('Member removed from team');
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to remove member');
      }
    } catch (err) {
      toast.error('Error removing member');
    }
  };

  const handleAddManager = async () => {
    if (!targetTeamId || !selectedManagerToAdd) return;

    try {
      const res = await fetch(`/api/teams/${targetTeamId}/managers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ manager_id: Number(selectedManagerToAdd) })
      });

      if (res.ok) {
        toast.success('Manager added to team!');
        setIsAddManagerOpen(false);
        setSelectedManagerToAdd('');
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to add manager');
      }
    } catch (err) {
      toast.error('Error adding manager');
    }
  };

  const handleRemoveManager = async (teamId: number, managerId: number) => {
    if (!confirm('Remove this manager from oversight of this team?')) return;

    try {
      const res = await fetch(`/api/teams/${teamId}/managers/${managerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success('Manager removed from team');
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to remove manager');
      }
    } catch (err) {
      toast.error('Error removing manager');
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail.trim() || !invitePassword.trim()) {
      toast.error('Email and Password are required');
      return;
    }

    try {
      const res = await fetch('/api/orgs/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          password: invitePassword.trim(),
          role: inviteRole
        })
      });

      if (res.ok) {
        toast.success(`User ${inviteEmail} invited with role ${inviteRole}`);
        setIsInviteUserOpen(false);
        setInviteEmail('');
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to invite user');
      }
    } catch (err) {
      toast.error('Error inviting user');
    }
  };

  const handleChangeUserRole = async (userId: number, newRole: string) => {
    try {
      const res = await fetch('/api/orgs/role', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ user_id: userId, role: newRole })
      });

      if (res.ok) {
        toast.success('User role updated!');
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update role');
      }
    } catch (err) {
      toast.error('Error updating role');
    }
  };

  // Helper to format dropdown display labels showing current team / project assignment status
  const getTeamLeadLabel = (m: MemberData) => {
    const leadTeam = teams.find((t) => t.team_lead_id === m.id);
    if (leadTeam) return `${m.email} [${m.role.toUpperCase()}] — 👑 Leads: ${leadTeam.name}`;
    const memberTeam = teams.find((t) => t.members.some((mem) => mem.id === m.id));
    if (memberTeam) return `${m.email} [${m.role.toUpperCase()}] — Member in: ${memberTeam.name}`;
    return `${m.email} [${m.role.toUpperCase()}] — Unassigned`;
  };

  const getManagerLabel = (m: MemberData) => {
    const managed = teams.filter((t) => t.managers && t.managers.some((mgr) => mgr.id === m.id));
    if (managed.length > 0) return `${m.email} [${m.role.toUpperCase()}] — 👔 Oversees: ${managed.map((t) => t.name).join(', ')}`;
    return `${m.email} [${m.role.toUpperCase()}] — Available`;
  };

  const getMemberLabel = (m: MemberData) => {
    const memberTeam = teams.find((t) => t.members.some((mem) => mem.id === m.id));
    if (memberTeam) return `${m.email} [${m.role.toUpperCase()}] — Currently in: ${memberTeam.name}`;
    return `${m.email} [${m.role.toUpperCase()}] — Unassigned`;
  };

  // Strict list for Team Lead dropdown — ONLY users with role 'team_lead'
  const teamLeadsOnly = members.filter((m) => m.role === 'team_lead');
  const sortedLeads = (teamLeadsOnly.length > 0 ? teamLeadsOnly : members).sort((a, b) =>
    a.email.localeCompare(b.email)
  );

  const managersOnly = members.filter(
    (m) => m.role === 'manager' || m.role === 'org_admin' || m.role === 'super_admin'
  );
  const sortedManagers = (managersOnly.length > 0 ? managersOnly : members).sort((a, b) =>
    a.email.localeCompare(b.email)
  );

  // Helper stats
  const totalTeams = teams.length;
  const totalManagers = members.filter((m) => m.role === 'manager').length;
  const totalLeads = members.filter((m) => m.role === 'team_lead').length;
  const totalEmployees = members.filter((m) => m.role === 'employee').length;

  return (
    <>
      <Head>
        <title>Teams & Organization Management | MetaOffice</title>
      </Head>

      <div className="space-y-6">
        {/* Header Title & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-app-border pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-app-text">Teams & Organization</h1>
            <p className="text-sm text-app-text-muted mt-1">
              Manage organization teams, assign managers, team leads, and add members.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {isOrgAdminOrSuper && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsInviteUserOpen(true)}
                  className="flex items-center space-x-1.5"
                >
                  <span>👤+</span>
                  <span>Invite User</span>
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    setNewTeamName('');
                    setSelectedLeadId('');
                    setSelectedManagerId('');
                    setIsCreateTeamOpen(true);
                  }}
                  className="flex items-center space-x-1.5 shadow-sm"
                >
                  <span>📐</span>
                  <span>Create Team</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 border-l-4 border-l-primary">
            <div className="text-xs font-semibold text-app-text-muted uppercase tracking-wider">Total Teams</div>
            <div className="text-2xl font-bold text-app-text mt-1">{totalTeams}</div>
          </Card>
          <Card className="p-4 border-l-4 border-l-indigo-500">
            <div className="text-xs font-semibold text-app-text-muted uppercase tracking-wider">Managers</div>
            <div className="text-2xl font-bold text-app-text mt-1">{totalManagers}</div>
          </Card>
          <Card className="p-4 border-l-4 border-l-amber-500">
            <div className="text-xs font-semibold text-app-text-muted uppercase tracking-wider">Team Leads</div>
            <div className="text-2xl font-bold text-app-text mt-1">{totalLeads}</div>
          </Card>
          <Card className="p-4 border-l-4 border-l-emerald-500">
            <div className="text-xs font-semibold text-app-text-muted uppercase tracking-wider">Employees</div>
            <div className="text-2xl font-bold text-app-text mt-1">{totalEmployees}</div>
          </Card>
        </div>

        {/* Controls: Search & Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center bg-gray-100 p-1 rounded-lg w-fit border border-app-border">
            <button
              onClick={() => setActiveTab('cards')}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${activeTab === 'cards'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-app-text-muted hover:text-app-text'
                }`}
            >
              📐 Team Cards ({filteredTeams.length})
            </button>
            <button
              onClick={() => setActiveTab('managers')}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${activeTab === 'managers'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-app-text-muted hover:text-app-text'
                }`}
            >
              👔 Managers Hierarchy
            </button>
            <button
              onClick={() => setActiveTab('directory')}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${activeTab === 'directory'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-app-text-muted hover:text-app-text'
                }`}
            >
              👥 Member Directory ({members.length})
            </button>
          </div>

          {/* Search Input */}
          <div className="w-full md:w-72">
            <Input
              type="text"
              placeholder="Search team or member..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="py-1.5 text-sm"
            />
          </div>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="text-center py-12 text-app-text-muted">Loading organization data...</div>
        ) : (
          <>
            {/* TAB 1: TEAMS CARDS VIEW */}
            {activeTab === 'cards' && (
              <>
                {filteredTeams.length === 0 ? (
                  <Card className="p-8 text-center text-app-text-muted">
                    <p className="text-lg font-medium mb-2">No teams found</p>
                    <p className="text-sm">Create a new team to start organizing members and assigning tasks.</p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTeams.map((team) => (
                      <Card key={team.id} className="p-5 flex flex-col justify-between hover:shadow-md transition-all border border-app-border">
                        <div>
                          {/* Card Top: Title & Member Count */}
                          <div className="flex items-start justify-between mb-4 border-b border-app-border pb-3">
                            <div>
                              <span className="text-xs font-semibold text-primary uppercase tracking-wide">Team #{team.id}</span>
                              <h3 className="text-xl font-bold text-app-text leading-tight">{team.name}</h3>
                            </div>
                            <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-primary/10 text-primary">
                              {team.count} {team.count === 1 ? 'member' : 'members'}
                            </span>
                          </div>

                          {/* Team Lead Section */}
                          <div className="mb-4 bg-amber-50/60 p-3 rounded-lg border border-amber-200/60">
                            <div className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-1 flex items-center justify-between">
                              <span>👑 Team Lead</span>
                            </div>
                            {team.team_lead ? (
                              <div className="flex items-center space-x-2 text-sm font-semibold text-amber-950">
                                <div className="h-6 w-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">
                                  {team.team_lead.email[0].toUpperCase()}
                                </div>
                                <span className="truncate">{team.team_lead.email}</span>
                              </div>
                            ) : (
                              <div className="text-xs italic text-amber-600">No Team Lead assigned</div>
                            )}
                          </div>

                          {/* Managers Section */}
                          <div className="mb-4 bg-indigo-50/60 p-3 rounded-lg border border-indigo-200/60">
                            <div className="text-xs font-bold uppercase tracking-wider text-indigo-800 mb-1.5 flex items-center justify-between">
                              <span>👔 Assigned Managers ({team.managers ? team.managers.length : 0})</span>
                              {isOrgAdminOrSuper && (
                                <button
                                  onClick={() => {
                                    setTargetTeamId(team.id);
                                    setSelectedManagerToAdd('');
                                    setIsAddManagerOpen(true);
                                  }}
                                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
                                >
                                  + Add
                                </button>
                              )}
                            </div>
                            {team.managers && team.managers.length > 0 ? (
                              <div className="space-y-1.5">
                                {team.managers.map((m) => (
                                  <div key={m.id} className="flex items-center justify-between text-xs bg-white px-2 py-1 rounded border border-indigo-100">
                                    <span className="font-medium text-indigo-950 truncate">{m.email}</span>
                                    {isOrgAdminOrSuper && (
                                      <button
                                        onClick={() => handleRemoveManager(team.id, m.id)}
                                        className="text-danger hover:underline text-[10px] font-semibold ml-2"
                                      >
                                        Remove
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs italic text-indigo-500">No Manager assigned</div>
                            )}
                          </div>

                          {/* Members List */}
                          <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold uppercase tracking-wider text-app-text-muted">
                                Employees & Members ({team.members.length})
                              </span>
                            </div>

                            {team.members.length === 0 ? (
                              <div className="text-xs italic text-app-text-muted py-2 bg-gray-50 text-center rounded border border-dashed border-gray-200">
                                No members in this team
                              </div>
                            ) : (
                              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                {team.members.map((member) => (
                                  <div
                                    key={member.id}
                                    className="flex items-center justify-between p-2 rounded bg-gray-50 text-xs border border-gray-100 hover:bg-gray-100/80 transition-colors"
                                  >
                                    <div className="flex items-center space-x-2 truncate">
                                      <div className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
                                        {member.email[0].toUpperCase()}
                                      </div>
                                      <span className="font-medium text-app-text truncate">{member.email}</span>
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 uppercase font-semibold">
                                        {member.role || 'employee'}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => handleRemoveMember(team.id, member.id)}
                                      className="text-danger hover:underline font-semibold ml-2 text-[11px]"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Card Actions Footer */}
                        <div className="pt-3 border-t border-app-border flex items-center justify-between">
                          <Button
                            variant="outline"
                            className="w-full text-xs py-1.5"
                            onClick={() => {
                              setTargetTeamId(team.id);
                              setSelectedUserIdToAssign('');
                              setIsAssignMemberOpen(true);
                            }}
                          >
                            + Assign Employee
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* TAB 2: MANAGERS HIERARCHY VIEW */}
            {activeTab === 'managers' && (
              <div className="space-y-6">
                {Array.from(managerMap.values()).length === 0 ? (
                  <Card className="p-8 text-center text-app-text-muted">
                    No managers found in organization. Invite or assign a user to the Manager role.
                  </Card>
                ) : (
                  Array.from(managerMap.values()).map(({ manager, teams: managedTeams }) => (
                    <Card key={manager.id} className="p-6 border-l-4 border-l-indigo-600">
                      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-app-border pb-4 mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg">
                            👔
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="text-lg font-bold text-app-text">{manager.email}</h3>
                              <span className="px-2 py-0.5 text-xs font-bold rounded bg-indigo-100 text-indigo-800 uppercase">
                                Manager
                              </span>
                            </div>
                            <p className="text-xs text-app-text-muted mt-0.5">
                              Overseeing {managedTeams.length} {managedTeams.length === 1 ? 'team' : 'teams'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Teams under this Manager */}
                      {managedTeams.length === 0 ? (
                        <div className="text-sm italic text-app-text-muted py-4 bg-gray-50 text-center rounded border border-dashed border-gray-200">
                          This manager is not currently assigned to oversee any team.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {managedTeams.map((team) => (
                            <div key={team.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                                <h4 className="font-bold text-app-text text-base">{team.name}</h4>
                                <span className="text-xs font-semibold text-primary">#{team.id}</span>
                              </div>
                              <div className="text-xs text-amber-900 font-medium bg-amber-50 p-2 rounded border border-amber-100 flex items-center space-x-2">
                                <span>👑 Lead:</span>
                                <span className="font-bold truncate">{team.team_lead?.email || 'Unassigned'}</span>
                              </div>
                              <div>
                                <div className="text-[11px] font-bold text-app-text-muted uppercase mb-1">
                                  Members ({team.members.length})
                                </div>
                                <div className="space-y-1 max-h-28 overflow-y-auto">
                                  {team.members.map((m) => (
                                    <div key={m.id} className="text-xs bg-white px-2 py-1 rounded border border-gray-200 text-app-text truncate">
                                      {m.email}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* TAB 3: MEMBER DIRECTORY VIEW */}
            {activeTab === 'directory' && (
              <Card className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-app-border text-app-text-muted uppercase text-xs">
                        <th className="py-3 px-4">User</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Assigned Team / Project</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border">
                      {filteredMembers.map((member) => {
                        const memberTeam = teams.find((t) => t.members.some((m) => m.id === member.id));
                        const leadTeam = teams.find((t) => t.team_lead_id === member.id);
                        const managedTeamsList = teams.filter((t) => t.managers && t.managers.some((mgr) => mgr.id === member.id));

                        return (
                          <tr key={member.id} className="hover:bg-gray-50/50">
                            <td className="py-3.5 px-4 font-medium text-app-text">
                              <div className="flex items-center space-x-3">
                                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                                  {member.email[0].toUpperCase()}
                                </div>
                                <span>{member.email}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <select
                                value={member.role}
                                onChange={(e) => handleChangeUserRole(member.id, e.target.value)}
                                disabled={!isOrgAdminOrSuper || member.role === 'super_admin'}
                                className="text-xs font-semibold px-2 py-1 rounded bg-gray-100 border border-gray-300 text-app-text focus:outline-none"
                              >
                                <option value="super_admin">SUPER ADMIN</option>
                                <option value="org_admin">ORG ADMIN</option>
                                <option value="manager">MANAGER</option>
                                <option value="team_lead">TEAM LEAD</option>
                                <option value="employee">EMPLOYEE</option>
                                <option value="guest">GUEST</option>
                              </select>
                            </td>
                            <td className="py-3.5 px-4 text-app-text-muted">
                              <div className="space-y-1">
                                {leadTeam && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 mr-1.5">
                                    👑 Leads: {leadTeam.name}
                                  </span>
                                )}
                                {managedTeamsList.length > 0 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-900 border border-indigo-300 mr-1.5">
                                    👔 Oversees: {managedTeamsList.map((t) => t.name).join(', ')}
                                  </span>
                                )}
                                {memberTeam ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                    Member in: {memberTeam.name}
                                  </span>
                                ) : (
                                  !leadTeam && managedTeamsList.length === 0 && (
                                    <span className="text-xs italic text-gray-400">Unassigned</span>
                                  )
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {teams.length > 0 && (
                                <select
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      setTargetTeamId(Number(e.target.value));
                                      setSelectedUserIdToAssign(String(member.id));
                                      handleAssignMember();
                                    }
                                  }}
                                  className="text-xs px-2.5 py-1 rounded bg-primary text-white font-medium border-0 cursor-pointer"
                                >
                                  <option value="">Move to Team...</option>
                                  {teams.map((t) => (
                                    <option key={t.id} value={t.id}>
                                      {t.name}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}
      </div>

      {/* CREATE TEAM MODAL */}
      <Modal
        isOpen={isCreateTeamOpen}
        onClose={() => setIsCreateTeamOpen(false)}
        title="Create New Team"
        footer={
          <>
            <Button variant="white" onClick={() => setIsCreateTeamOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateTeam}>
              Create Team
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-app-text mb-1">Team Name</label>
            <Input
              type="text"
              placeholder="e.g. Backend Engineering"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-app-text mb-1">Assign Team Lead (Required)</label>
            <select
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              className="w-full p-2 text-sm border border-app-border rounded-lg bg-white font-medium text-app-text"
            >
              <option value="">Select Team Lead...</option>
              {sortedLeads.map((m) => (
                <option key={m.id} value={m.id}>
                  {getTeamLeadLabel(m)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-app-text mb-1">Assign Manager (Optional)</label>
            <select
              value={selectedManagerId}
              onChange={(e) => setSelectedManagerId(e.target.value)}
              className="w-full p-2 text-sm border border-app-border rounded-lg bg-white font-medium text-app-text"
            >
              <option value="">Select Overseeing Manager...</option>
              {sortedManagers.map((m) => (
                <option key={m.id} value={m.id}>
                  {getManagerLabel(m)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* ASSIGN MEMBER MODAL */}
      <Modal
        isOpen={isAssignMemberOpen}
        onClose={() => setIsAssignMemberOpen(false)}
        title="Assign Member to Team"
        footer={
          <>
            <Button variant="white" onClick={() => setIsAssignMemberOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAssignMember}>
              Assign
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-app-text mb-1">Select Member</label>
            <select
              value={selectedUserIdToAssign}
              onChange={(e) => setSelectedUserIdToAssign(e.target.value)}
              className="w-full p-2 text-sm border border-app-border rounded-lg bg-white font-medium text-app-text"
            >
              <option value="">Select User...</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {getMemberLabel(m)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* ADD MANAGER MODAL */}
      <Modal
        isOpen={isAddManagerOpen}
        onClose={() => setIsAddManagerOpen(false)}
        title="Add Manager to Team"
        footer={
          <>
            <Button variant="white" onClick={() => setIsAddManagerOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddManager}>
              Add Manager
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-app-text mb-1">Select Manager</label>
            <select
              value={selectedManagerToAdd}
              onChange={(e) => setSelectedManagerToAdd(e.target.value)}
              className="w-full p-2 text-sm border border-app-border rounded-lg bg-white font-medium text-app-text"
            >
              <option value="">Select Manager...</option>
              {sortedManagers.map((m) => (
                <option key={m.id} value={m.id}>
                  {getManagerLabel(m)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* INVITE USER MODAL */}
      <Modal
        isOpen={isInviteUserOpen}
        onClose={() => setIsInviteUserOpen(false)}
        title="Invite New User to Organization"
        footer={
          <>
            <Button variant="white" onClick={() => setIsInviteUserOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleInviteUser}>
              Invite
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-app-text mb-1">Email Address</label>
            <Input
              type="email"
              placeholder="newuser@gmail.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-app-text mb-1">Default Password</label>
            <Input
              type="text"
              value={invitePassword}
              onChange={(e) => setInvitePassword(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-app-text mb-1">Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full p-2 text-sm border border-app-border rounded-lg bg-white"
            >
              <option value="manager">Manager</option>
              <option value="team_lead">Team Lead</option>
              <option value="employee">Employee</option>
              <option value="guest">Guest</option>
            </select>
          </div>
        </div>
      </Modal>
    </>
  );
}
