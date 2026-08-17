package handlers

import (
	"context"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"sync"

	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"

	pb "session/github.com/Sourav-126/distributed-task-manager/pb/task"
	notifmodels "session/models/notifications"
	taskmodels "session/models/tasks"
	"session/models/users"
	"session/utils"
)

type createCommentPayload struct {
	Content  string `json:"content"`
	ParentID *uint  `json:"parent_id"`
	FileURL  string `json:"file_url"`
	FileName string `json:"file_name"`
	FileType string `json:"file_type"`
}

// mentionRegex matches @username handles in comment text (lowercase letters, digits, underscores)
var mentionRegex = regexp.MustCompile(`@([a-z0-9_]{3,30})`)

// POST /api/tasks/:id/comments — Add a comment or reply to a task with optional file attachment
func CreateComment(db *gorm.DB, svc *GrpcServiceClient) fiber.Handler {
	return func(c fiber.Ctx) error {
		taskID := c.Params("id")
		if taskID == "" {
			return c.Status(400).JSON(fiber.Map{"error": "task id is required"})
		}

		userID, ok := c.Locals("user_id").(uint)
		if !ok || userID == 0 {
			return c.Status(401).JSON(fiber.Map{"error": "unauthorized"})
		}

		var payload createCommentPayload
		if err := c.Bind().JSON(&payload); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "invalid comment payload"})
		}

		content := strings.TrimSpace(payload.Content)
		if content == "" && payload.FileURL == "" {
			return c.Status(400).JSON(fiber.Map{"error": "comment content or file attachment is required"})
		}

		comment := taskmodels.TaskComment{
			TaskID:   taskID,
			UserID:   userID,
			ParentID: payload.ParentID,
			Content:  content,
			FileURL:  strings.TrimSpace(payload.FileURL),
			FileName: strings.TrimSpace(payload.FileName),
			FileType: strings.TrimSpace(payload.FileType),
		}

		if err := db.Create(&comment).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "failed to save comment: " + err.Error()})
		}

		// Preload User for response
		db.Preload("User").First(&comment, comment.ID)

		// ── Fire-and-forget notification goroutine ──────────────────────────
		// All notification logic runs in background — handler returns immediately
		go dispatchCommentNotifications(db, svc, comment, userID, taskID, content, payload.ParentID)

		return c.Status(201).JSON(comment)
	}
}

// dispatchCommentNotifications fans out all relevant notifications for a new comment.
// Runs entirely in a goroutine — never blocks the HTTP response.
func dispatchCommentNotifications(
	db *gorm.DB,
	svc *GrpcServiceClient,
	comment taskmodels.TaskComment,
	actorID uint,
	taskID, content string,
	parentID *uint,
) {
	// Collect all unique recipient IDs (excluding the actor themselves)
	recipients := map[uint]struct{}{}
	var mu sync.Mutex

	addRecipient := func(uid uint) {
		if uid != 0 && uid != actorID {
			mu.Lock()
			recipients[uid] = struct{}{}
			mu.Unlock()
		}
	}

	var wg sync.WaitGroup

	// ── 1. Notify task assignee + any other prior commenters on this task ──
	wg.Add(1)
	go func() {
		defer wg.Done()

		// Fetch task details from task gRPC service to notify the task's assignee
		taskResp, err := svc.Client.GetTaskById(context.Background(), &pb.GetTaskByIdRequest{TaskId: taskID})
		if err == nil && taskResp != nil && taskResp.Task != nil {
			assigneeID := uint(taskResp.Task.AssignedTo)
			addRecipient(assigneeID)
		}

		// Find all unique users who have commented on this task before
		var commenters []struct{ UserID uint }
		db.Model(&taskmodels.TaskComment{}).
			Select("DISTINCT user_id").
			Where("task_id = ? AND id != ?", taskID, comment.ID).
			Scan(&commenters)
		for _, co := range commenters {
			addRecipient(co.UserID)
		}
	}()

	// ── 2. If this is a reply, notify the parent comment's author ──────────
	if parentID != nil {
		wg.Add(1)
		go func() {
			defer wg.Done()
			var parent taskmodels.TaskComment
			if db.First(&parent, *parentID).Error == nil {
				addRecipient(parent.UserID)
			}
		}()
	}

	// ── 3. Parse @username mentions in content ────────────────────────────
	wg.Add(1)
	go func() {
		defer wg.Done()
		matches := mentionRegex.FindAllStringSubmatch(content, -1)
		if len(matches) == 0 {
			return
		}
		handles := make([]string, 0, len(matches))
		for _, m := range matches {
			handles = append(handles, m[1])
		}
		var mentioned []users.User
		db.Where("username IN ?", handles).Find(&mentioned)
		for _, u := range mentioned {
			if u.ID != actorID {
				// Fire high-priority mention notification immediately
				go func(uid uint, handle string) {
					utils.Notify(
						db, uid,
						"comment_mention",
						fmt.Sprintf("You were mentioned in a task thread"),
						fmt.Sprintf("@%s mentioned you: \"%s\"", getUsername(db, actorID), truncate(content, 80)),
						"/tasks/board",
						taskID,
						actorID,
					)
				}(u.ID, u.Username)
			}
		}
	}()

	wg.Wait()

	// ── 4. Send generic "commented on task" to collected recipients ────────
	actorUsername := getUsername(db, actorID)
	var notifyWg sync.WaitGroup
	for uid := range recipients {
		notifyWg.Add(1)
		go func(uid uint) {
			defer notifyWg.Done()
			nType := "comment_on_task"
			title := "New comment on your task"
			if parentID != nil {
				nType = "reply_to_comment"
				title = fmt.Sprintf("%s replied to your comment", actorUsername)
			}
			utils.Notify(
				db, uid,
				nType,
				title,
				truncate(content, 100),
				"/tasks/board",
				taskID,
				actorID,
			)
		}(uid)
	}
	notifyWg.Wait()
}

// GET /api/tasks/:id/comments — List comments and threaded replies for a task (auth required)
func GetTaskComments(db *gorm.DB) fiber.Handler {
	return func(c fiber.Ctx) error {
		taskID := c.Params("id")
		if taskID == "" {
			return c.Status(400).JSON(fiber.Map{"error": "task id is required"})
		}

		userID, ok := c.Locals("user_id").(uint)
		if !ok || userID == 0 {
			return c.Status(401).JSON(fiber.Map{"error": "unauthorized"})
		}
		_ = userID

		var comments []taskmodels.TaskComment
		// Fetch top level comments (parent_id IS NULL) and preload user + nested replies with user
		err := db.Where("task_id = ? AND parent_id IS NULL", taskID).
			Order("created_at ASC").
			Preload("User").
			Preload("Replies", func(db *gorm.DB) *gorm.DB {
				return db.Order("created_at ASC").Preload("User")
			}).
			Find(&comments).Error

		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "failed to fetch comments: " + err.Error()})
		}

		return c.JSON(fiber.Map{"comments": comments})
	}
}

// ── helpers ──────────────────────────────────────────────────────────────────

// getUsername returns the @username handle for a user ID, or "someone" as fallback.
func getUsername(db *gorm.DB, userID uint) string {
	var u users.User
	if db.Select("username, email").First(&u, userID).Error != nil {
		return "someone"
	}
	if u.Username != "" {
		return u.Username
	}
	// Fallback to email prefix if username not set
	parts := strings.Split(u.Email, "@")
	return parts[0]
}

// truncate shortens a string with ellipsis if it exceeds maxLen runes.
func truncate(s string, maxLen int) string {
	runes := []rune(s)
	if len(runes) <= maxLen {
		return s
	}
	return string(runes[:maxLen]) + "…"
}

// ─── Notification model ref to satisfy unused import if needed ────────────────
var _ = notifmodels.Notification{}

// keep strconv for future usage if needed
var _ = strconv.Itoa
