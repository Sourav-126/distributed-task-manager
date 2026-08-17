package users

import (
	"time"

	"gorm.io/gorm"
	"session/models/roles"
)

type User struct {
	gorm.Model
	Email     string       `gorm:"uniqueIndex;not null" json:"email"`
	Username  string       `gorm:"uniqueIndex;type:varchar(50);not null;default:''" json:"username"` // immutable @handle for @mentions
	Password  string       `gorm:"size:255;not null" json:"-"`
	SessionID string       `gorm:"size:255;not null" json:"-"`
	OrgID     *uint        `gorm:"index" json:"org_id,omitempty"` // NULL for super_admin (no org)
	RoleID    *uint        `gorm:"index" json:"role_id,omitempty"` // FK → roles.ID
	Role      roles.Role   `gorm:"foreignKey:RoleID" json:"role,omitempty"`
	TeamID    *uint        `gorm:"index" json:"team_id,omitempty"` // FK → teams.ID (NULL if not in a team)
	ExpiresAt *time.Time   `json:"expires_at,omitempty"` // For guest accounts only, NULL = never expires
}

type SigninRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type SignupRequest struct {
	Email    string `json:"email"`
	Username string `json:"username"` // required — immutable @handle (e.g. "johndoe")
	Password string `json:"password"`
	OrgID    *uint  `json:"org_id"` // Optional: join an existing org on signup
}
