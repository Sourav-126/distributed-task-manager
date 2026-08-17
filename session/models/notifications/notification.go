package notifications

import "time"

// Notification is persisted to Postgres and streamed via SSE to the frontend.
type Notification struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"not null;index" json:"user_id"`            // recipient
	ActorID   uint      `gorm:"index" json:"actor_id"`                    // who triggered it (0 = system)
	Type      string    `gorm:"type:varchar(60);not null" json:"type"`    // e.g. "task_assigned"
	Title     string    `gorm:"type:varchar(200)" json:"title"`
	Body      string    `gorm:"type:text" json:"body"`
	LinkURL   string    `gorm:"type:varchar(500)" json:"link_url"`        // e.g. "/tasks/board"
	TaskID    string    `gorm:"type:varchar(64);index" json:"task_id"`    // empty if not task-related
	Read      bool      `gorm:"default:false" json:"read"`
	CreatedAt time.Time `json:"created_at"`
}
