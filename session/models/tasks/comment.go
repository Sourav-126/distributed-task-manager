package tasks

import (
	"time"

	"session/models/users"
)

type TaskComment struct {
	ID        uint          `gorm:"primaryKey" json:"id"`
	TaskID    string        `gorm:"type:varchar(64);index;not null" json:"task_id"`
	UserID    uint          `gorm:"not null" json:"user_id"`
	User      users.User    `gorm:"foreignKey:UserID" json:"user,omitempty"`
	ParentID  *uint         `gorm:"index;default:null" json:"parent_id"`
	Content   string        `gorm:"type:text;not null" json:"content"`
	FileURL   string        `gorm:"type:text" json:"file_url,omitempty"`
	FileName  string        `gorm:"type:varchar(255)" json:"file_name,omitempty"`
	FileType  string        `gorm:"type:varchar(100)" json:"file_type,omitempty"`
	Replies   []TaskComment `gorm:"foreignKey:ParentID" json:"replies,omitempty"`
	CreatedAt time.Time     `json:"created_at"`
	UpdatedAt time.Time     `json:"updated_at"`
}
