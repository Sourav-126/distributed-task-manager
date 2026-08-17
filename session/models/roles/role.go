package roles

import "gorm.io/gorm"

// RoleName defines the platform-level roles
type RoleName string

const (
	RoleSuperAdmin RoleName = "super_admin" // Platform-level, no org
	RoleOrgAdmin   RoleName = "org_admin"   // Full access within their org
	RoleManager    RoleName = "manager"     // Oversees multiple team leads + their teams
	RoleTeamLead   RoleName = "team_lead"   // Leads ONE specific team (day-to-day)
	RoleEmployee   RoleName = "employee"    // Default everyday user
	RoleGuest      RoleName = "guest"       // Temporary/external, limited access
)

// Role represents a role within an organization (or platform-level for super_admin)
type Role struct {
	gorm.Model
	Name  RoleName `gorm:"not null"`
	OrgID *uint    `gorm:"index"` // NULL = platform-level role (super_admin only)
}

// IsValid checks if the role name is one of the known values
func (r RoleName) IsValid() bool {
	switch r {
	case RoleSuperAdmin, RoleOrgAdmin, RoleManager, RoleTeamLead, RoleEmployee, RoleGuest:
		return true
	}
	return false
}

// CanManageRoles returns true if this role is allowed to manage other users' roles
func (r RoleName) CanManageRoles() bool {
	return r == RoleSuperAdmin || r == RoleOrgAdmin
}

// CanCreateTasks returns true if this role can create and assign tasks to others
func (r RoleName) CanCreateTasks() bool {
	return r == RoleSuperAdmin || r == RoleOrgAdmin || r == RoleManager || r == RoleTeamLead
}

// CanDeleteTasks returns true if this role can delete tasks
func (r RoleName) CanDeleteTasks() bool {
	return r == RoleSuperAdmin || r == RoleOrgAdmin
}

// CanBookRooms returns true if this role can create room bookings
func (r RoleName) CanBookRooms() bool {
	return r == RoleOrgAdmin || r == RoleManager || r == RoleTeamLead
}
