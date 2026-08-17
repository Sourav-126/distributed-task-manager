package utils

import (
	"sync"

	notifmodels "session/models/notifications"

	"gorm.io/gorm"
)

// ─────────────────────────── SSEHub ───────────────────────────
// SSEHub manages per-user SSE subscriber channels.
// One user can have multiple open browser tabs — each gets its own channel.

type SSEHub struct {
	mu       sync.RWMutex
	channels map[uint][]chan notifmodels.Notification
}

// GlobalHub is the singleton SSE hub used across all handlers.
var GlobalHub = &SSEHub{
	channels: make(map[uint][]chan notifmodels.Notification),
}

// Subscribe creates a new channel for the given user and registers it.
func (h *SSEHub) Subscribe(userID uint) chan notifmodels.Notification {
	ch := make(chan notifmodels.Notification, 32) // buffered — never block sender
	h.mu.Lock()
	h.channels[userID] = append(h.channels[userID], ch)
	h.mu.Unlock()
	return ch
}

// Unsubscribe removes the channel from the user's subscriber list and closes it.
func (h *SSEHub) Unsubscribe(userID uint, ch chan notifmodels.Notification) {
	h.mu.Lock()
	defer h.mu.Unlock()
	list := h.channels[userID]
	for i, c := range list {
		if c == ch {
			h.channels[userID] = append(list[:i], list[i+1:]...)
			close(ch)
			break
		}
	}
	if len(h.channels[userID]) == 0 {
		delete(h.channels, userID)
	}
}

// Push sends a notification to all open channels for the given user.
// Non-blocking: drops if channel is full (tab is slow/unresponsive).
func (h *SSEHub) Push(userID uint, n notifmodels.Notification) {
	h.mu.RLock()
	channels := make([]chan notifmodels.Notification, len(h.channels[userID]))
	copy(channels, h.channels[userID])
	h.mu.RUnlock()

	for _, ch := range channels {
		select {
		case ch <- n:
		default:
			// channel full — skip (non-blocking)
		}
	}
}

// ─────────────────────────── Notify ───────────────────────────
// Notify is the single entry-point for emitting a notification.
// ALWAYS call via goroutine from handlers: go utils.Notify(...)
// It persists to DB and pushes to SSE hub concurrently.
func Notify(
	db *gorm.DB,
	userID uint,
	nType, title, body, linkURL, taskID string,
	actorID uint,
) {
	n := notifmodels.Notification{
		UserID:  userID,
		ActorID: actorID,
		Type:    nType,
		Title:   title,
		Body:    body,
		LinkURL: linkURL,
		TaskID:  taskID,
	}

	var wg sync.WaitGroup

	// 1. Persist to Postgres asynchronously
	wg.Add(1)
	go func() {
		defer wg.Done()
		if err := db.Create(&n).Error; err != nil {
			// Non-critical — log and continue
			_ = err
		}
	}()

	// 2. Push to SSE hub (doesn't need DB id, fires immediately)
	wg.Add(1)
	go func() {
		defer wg.Done()
		GlobalHub.Push(userID, n)
	}()

	wg.Wait()
}

// NotifyMany fans out the same notification to multiple recipients concurrently.
// Use this when a single event triggers notifications for multiple users.
func NotifyMany(
	db *gorm.DB,
	userIDs []uint,
	nType, title, body, linkURL, taskID string,
	actorID uint,
) {
	var wg sync.WaitGroup
	for _, uid := range userIDs {
		if uid == 0 {
			continue
		}
		wg.Add(1)
		go func(uid uint) {
			defer wg.Done()
			Notify(db, uid, nType, title, body, linkURL, taskID, actorID)
		}(uid)
	}
	wg.Wait()
}
