package orgs

import "gorm.io/gorm"

type Organization struct {
	gorm.Model
	Name    string `gorm:"uniqueIndex;not null"`
	OwnerID uint   `gorm:"not null"` // FK to users.ID (the Org Admin who created it)
}
