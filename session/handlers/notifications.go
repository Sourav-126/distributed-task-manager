package handlers

import (
	"bufio"
	"encoding/json"
	"fmt"
	"time"

	notifmodels "session/models/notifications"
	"session/utils"

	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
)

// GET /api/notifications — fetch last 50 notifications for the current user
func GetMyNotifications(db *gorm.DB) fiber.Handler {
	return func(c fiber.Ctx) error {
		userID, ok := c.Locals("user_id").(uint)
		if !ok || userID == 0 {
			return c.Status(401).JSON(fiber.Map{"error": "unauthorized"})
		}

		var notifs []notifmodels.Notification
		if err := db.
			Where("user_id = ?", userID).
			Order("created_at DESC").
			Limit(50).
			Find(&notifs).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "failed to fetch notifications"})
		}

		var unread int64
		db.Model(&notifmodels.Notification{}).Where("user_id = ? AND read = false", userID).Count(&unread)

		return c.JSON(fiber.Map{
			"notifications": notifs,
			"unread_count":  unread,
		})
	}
}

// POST /api/notifications/read — mark notifications as read
// Body: {"all": true} OR {"ids": [1, 2, 3]}
func MarkNotificationsRead(db *gorm.DB) fiber.Handler {
	return func(c fiber.Ctx) error {
		userID, ok := c.Locals("user_id").(uint)
		if !ok || userID == 0 {
			return c.Status(401).JSON(fiber.Map{"error": "unauthorized"})
		}

		var req struct {
			All bool   `json:"all"`
			IDs []uint `json:"ids"`
		}
		if err := c.Bind().JSON(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "invalid request"})
		}

		if req.All {
			db.Model(&notifmodels.Notification{}).
				Where("user_id = ? AND read = false", userID).
				Update("read", true)
		} else if len(req.IDs) > 0 {
			db.Model(&notifmodels.Notification{}).
				Where("user_id = ? AND id IN ?", userID, req.IDs).
				Update("read", true)
		}

		return c.JSON(fiber.Map{"message": "marked as read"})
	}
}

// GET /api/notifications/stream — Server-Sent Events stream for real-time notifications.
// Fiber v3 + fasthttp: use c.SendStreamWriter to write to the underlying connection directly.
func SSENotificationStream(db *gorm.DB) fiber.Handler {
	return func(c fiber.Ctx) error {
		userID, ok := c.Locals("user_id").(uint)
		if !ok || userID == 0 {
			return c.Status(401).JSON(fiber.Map{"error": "unauthorized"})
		}

		// Subscribe this browser tab to the hub
		ch := utils.GlobalHub.Subscribe(userID)

		// SSE response headers
		c.Set("Content-Type", "text/event-stream")
		c.Set("Cache-Control", "no-cache")
		c.Set("Connection", "keep-alive")
		c.Set("X-Accel-Buffering", "no")

		// Heartbeat ticker to keep connection alive through proxies
		ticker := time.NewTicker(5 * time.Second)

		// Use Fiber's streaming writer — gives us a direct io.Writer to the socket
		return c.SendStreamWriter(func(w *bufio.Writer) {
			defer func() {
				ticker.Stop()
				utils.GlobalHub.Unsubscribe(userID, ch)
			}()

			// Initial handshake event
			fmt.Fprintf(w, "data: {\"type\":\"connected\"}\n\n")
			if err := w.Flush(); err != nil {
				return
			}

			for {
				select {
				case n, ok := <-ch:
					if !ok {
						return
					}
					data, err := json.Marshal(n)
					if err != nil {
						continue
					}
					fmt.Fprintf(w, "data: %s\n\n", data)
					if err := w.Flush(); err != nil {
						return
					}

				case <-ticker.C:
					// Heartbeat — comment line keeps proxy connections alive
					fmt.Fprintf(w, ": ping\n\n")
					if err := w.Flush(); err != nil {
						return
					}
				}
			}
		})
	}
}
