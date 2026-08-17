export type UserRole =
  | 'super_admin'
  | 'org_admin'
  | 'manager'
  | 'team_lead'
  | 'employee'
  | 'guest';

export interface UserProfile {
  id: number;
  email: string;
  role: UserRole;
  org_id?: number;
  username?: string; // immutable handle
  team_id?: number;  // current assigned team ID
}

export interface OrgMember {
  id: number;
  email: string;
  role: UserRole;
  org_id?: number;
  username?: string; // immutable @handle for @mentions (e.g. "johndoe")
  team_id?: number;  // teammate's team ID
}
