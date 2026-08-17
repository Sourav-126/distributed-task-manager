package teams

import (
	"gorm.io/gorm"
)

// Team represents a group of employees within an org.
// A team:
//   - Has exactly ONE team_lead (day-to-day leader)
//   - Can be under MULTIPLE managers (via the TeamManagers join table)
type Team struct {
	gorm.Model
	Name       string `gorm:"not null"`
	OrgID      uint   `gorm:"not null;index"` // FK → organizations.ID

	// The team_lead who runs this team day-to-day (one per team)
	TeamLeadID *uint `gorm:"index"` // FK → users.ID (team_lead role)
}

// TeamManager is the join table for the many-to-many between Team and Manager users.
// A team can have multiple managers overseeing it.
// A manager can oversee multiple teams.
type TeamManager struct {
	TeamID    uint `gorm:"primaryKey;not null;index"`
	ManagerID uint `gorm:"primaryKey;not null;index"` // FK → users.ID (manager role)
}
