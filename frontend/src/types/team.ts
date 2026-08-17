import { OrgMember } from './user';

export interface Team {
  id: number;
  name: string;
  org_id: number;
  team_lead_id?: number;
  team_lead?: OrgMember;
  managers?: OrgMember[];
  members?: OrgMember[];
  created_at?: string;
  updated_at?: string;
}

export interface Organization {
  id: number;
  name: string;
  created_at?: string;
}
