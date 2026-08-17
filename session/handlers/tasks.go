package handlers

import (
	"context"
	"fmt"
	"strconv"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v3"
	"google.golang.org/grpc/metadata"

	pb "session/github.com/Sourav-126/distributed-task-manager/pb/task"
	"session/utils"
)

// validate is a package-level singleton — safe to reuse across requests
var validate = validator.New()

// ─────────────────────────────── injectMetadata ───────────────────────────────

// injectMetadata attaches user_id, role, and org_id to the outgoing gRPC context
func injectMetadata(c fiber.Ctx) (metadata.MD, bool) {
	userID, ok1 := c.Locals("user_id").(uint)
	role, ok2 := c.Locals("role").(string)
	orgID, ok3 := c.Locals("org_id").(uint)
	if !ok1 || !ok2 {
		return nil, false
	}
	if !ok3 || orgID == 0 {
		orgID = 1
	}
	md := metadata.Pairs(
		"user_id", fmt.Sprintf("%d", userID),
		"role", role,
		"org_id", fmt.Sprintf("%d", orgID),
	)
	return md, true
}

// validationError formats validator errors into a readable string
func validationError(err error) string {
	var out string
	for _, fe := range err.(validator.ValidationErrors) {
		out += fmt.Sprintf("field '%s': failed '%s' validation; ", fe.Field(), fe.Tag())
	}
	return out
}

// ─────────────────────────────── CreateTask ───────────────────────────────

type createTaskPayload struct {
	Title       string `json:"title"        validate:"required,min=3,max=200"`
	Description string `json:"description"  validate:"required,min=5"`
	Priority    int32  `json:"priority"     validate:"min=0,max=3"`
	Difficulty  int32  `json:"difficulty"   validate:"min=0,max=4"`
	// Phase 2 fields — all optional at creation
	AssignedTo uint64 `json:"assigned_to"  validate:"omitempty,min=1"`
	Deadline   string `json:"deadline"     validate:"omitempty"`
	Status     string `json:"status"       validate:"omitempty,oneof=pending in_progress done"`
}

func CreateTask(svc *GrpcServiceClient) fiber.Handler {
	return func(c fiber.Ctx) error {
		var payload createTaskPayload
		if err := c.Bind().JSON(&payload); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request format: " + err.Error()})
		}

		// Single validate.Struct() call replaces all manual if-checks
		if err := validate.Struct(&payload); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": validationError(err)})
		}

		md, ok := injectMetadata(c)
		if !ok {
			return c.Status(401).JSON(fiber.Map{"error": "Missing auth context"})
		}
		orgID := c.Locals("org_id").(uint)

		difficulty := pb.Difficulty(payload.Difficulty)
		req := &pb.CreateTaskRequest{
			Task: &pb.Task{
				Title:       payload.Title,
				Description: payload.Description,
				Priority:    pb.Priority(payload.Priority),
				Difficulty:  &difficulty,
				OrgId:       uint64(orgID),
				AssignedTo:  payload.AssignedTo, // 0 = unassigned (OK)
				Deadline:    payload.Deadline,
				Status:      payload.Status,
			},
		}

		ctx := metadata.NewOutgoingContext(c.Context(), md)
		resp, err := svc.Client.CreateTask(ctx, req)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "gRPC error: " + err.Error()})
		}

		// Fire-and-forget: notify assignee on task creation
		if payload.AssignedTo != 0 {
			actorID := c.Locals("user_id").(uint)
			taskTitle := payload.Title
			assigneeID := uint(payload.AssignedTo)
			db := svc.DB
			go utils.Notify(
				db, assigneeID,
				"task_assigned",
				"You have been assigned a new task",
				fmt.Sprintf("Task: \"%s\" was assigned to you", taskTitle),
				"/tasks/board", "", actorID,
			)
		}

		return c.JSON(resp)
	}
}

// ─────────────────────────────── GetTaskById ───────────────────────────────

func GetTaskById(svc *GrpcServiceClient) fiber.Handler {
	return func(c fiber.Ctx) error {
		id := c.Params("id")
		if id == "" {
			return c.Status(400).JSON(fiber.Map{"error": "task id is required"})
		}

		md, ok := injectMetadata(c)
		if !ok {
			return c.Status(401).JSON(fiber.Map{"error": "Missing auth context"})
		}
		ctx := metadata.NewOutgoingContext(c.Context(), md)

		resp, err := svc.Client.GetTaskById(ctx, &pb.GetTaskByIdRequest{TaskId: id})
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "gRPC error: " + err.Error()})
		}
		return c.JSON(resp)
	}
}

// ─────────────────────────────── UpdateTask ───────────────────────────────

type updateTaskPayload struct {
	Title       string `json:"title"        validate:"omitempty,min=3,max=200"`
	Description string `json:"description"  validate:"omitempty,min=5"`
	Priority    int32  `json:"priority"     validate:"min=0,max=3"`
	Difficulty  int32  `json:"difficulty"   validate:"min=0,max=5"`
	AssignedTo  uint64 `json:"assigned_to"  validate:"omitempty,min=1"`
	Deadline    string `json:"deadline"     validate:"omitempty"`
	Status      string `json:"status"       validate:"omitempty,oneof=pending in_progress in_review done"`
}

func UpdateTask(svc *GrpcServiceClient) fiber.Handler {
	return func(c fiber.Ctx) error {
		idParam := c.Params("id")
		if idParam == "" {
			return c.Status(400).JSON(fiber.Map{"error": "task id is required"})
		}

		var payload updateTaskPayload
		if err := c.Bind().JSON(&payload); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request format: " + err.Error()})
		}
		if err := validate.Struct(&payload); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": validationError(err)})
		}

		md, ok := injectMetadata(c)
		if !ok {
			return c.Status(401).JSON(fiber.Map{"error": "Missing auth context"})
		}

		difficulty := pb.Difficulty(payload.Difficulty)
		req := &pb.UpdateTaskRequest{
			Task: &pb.Task{
				Id:          idParam,
				Title:       payload.Title,
				Description: payload.Description,
				Priority:    pb.Priority(payload.Priority),
				Difficulty:  &difficulty,
				AssignedTo:  payload.AssignedTo,
				Deadline:    payload.Deadline,
				Status:      payload.Status,
			},
		}

		ctx := metadata.NewOutgoingContext(c.Context(), md)
		resp, err := svc.Client.UpdateTask(ctx, req)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "gRPC error: " + err.Error()})
		}

		// Fire-and-forget: fetch task details and notify assignee on update/status changes
		go func() {
			actorID := c.Locals("user_id").(uint)
			db := svc.DB

			// Fetch current task details via gRPC to retrieve the current assignee and status
			grpcCtx := metadata.NewOutgoingContext(context.Background(), md)
			taskResp, err := svc.Client.GetTaskById(grpcCtx, &pb.GetTaskByIdRequest{TaskId: idParam})
			if err != nil || taskResp == nil || taskResp.Task == nil {
				return
			}
			task := taskResp.Task

			assigneeID := uint(task.AssignedTo)

			// 1. Notify new assignee if task was newly assigned to someone else
			if payload.AssignedTo != 0 && uint(payload.AssignedTo) != assigneeID {
				utils.Notify(
					db, uint(payload.AssignedTo),
					"task_assigned",
					"Task assigned to you",
					fmt.Sprintf("\"%s\" was assigned to you", task.Title),
					"/tasks/board", idParam, actorID,
				)
			}

			// 2. Notify current assignee if task status has changed
			if payload.Status != "" && payload.Status != task.Status && assigneeID != 0 {
				utils.Notify(
					db, assigneeID,
					"task_status_changed",
					"Task status updated",
					fmt.Sprintf("Status changed to \"%s\" on task \"%s\"", payload.Status, task.Title),
					"/tasks/board", idParam, actorID,
				)
			}
		}()

		return c.JSON(resp)
	}
}

// ─────────────────────────────── DeleteTask ───────────────────────────────

func DeleteTask(svc *GrpcServiceClient) fiber.Handler {
	return func(c fiber.Ctx) error {
		id := c.Params("id")
		if id == "" {
			return c.Status(400).JSON(fiber.Map{"error": "task id is required"})
		}

		md, ok := injectMetadata(c)
		if !ok {
			return c.Status(401).JSON(fiber.Map{"error": "Missing auth context"})
		}
		ctx := metadata.NewOutgoingContext(c.Context(), md)

		resp, err := svc.Client.DeleteTask(ctx, &pb.DeleteTaskRequest{TaskId: id})
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "gRPC error: " + err.Error()})
		}
		return c.JSON(resp)
	}
}

// ─────────────────────────────── ListMyTasks ───────────────────────────────

// GET /api/tasks/me — employee sees only their own assigned tasks
func ListMyTasks(svc *GrpcServiceClient) fiber.Handler {
	return func(c fiber.Ctx) error {
		userID := c.Locals("user_id").(uint)

		md, ok := injectMetadata(c)
		if !ok {
			return c.Status(401).JSON(fiber.Map{"error": "Missing auth context"})
		}
		ctx := metadata.NewOutgoingContext(c.Context(), md)

		resp, err := svc.Client.ListMyTasks(ctx, &pb.ListMyTasksRequest{
			UserId: uint64(userID),
		})
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "gRPC error: " + err.Error()})
		}
		return c.JSON(resp)
	}
}

// ─────────────────────────────── ListTeamTasks ───────────────────────────────

// GET /api/tasks/team — manager sees all tasks in their org
func ListTeamTasks(svc *GrpcServiceClient) fiber.Handler {
	return func(c fiber.Ctx) error {
		orgID := c.Locals("org_id").(uint)

		md, ok := injectMetadata(c)
		if !ok {
			return c.Status(401).JSON(fiber.Map{"error": "Missing auth context"})
		}
		ctx := metadata.NewOutgoingContext(c.Context(), md)

		resp, err := svc.Client.ListTeamTasks(ctx, &pb.ListTeamTasksRequest{
			OrgId: uint64(orgID),
		})
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "gRPC error: " + err.Error()})
		}
		return c.JSON(resp)
	}
}

// keep the int parser for backward compat usage elsewhere
var _ = strconv.ParseInt

// ─────────────────────────── helpers ────────────────────────────────────────

// buildTaskNotif constructs a Notification struct for SSE hub push (no DB write).
// Used when only an in-memory push is needed (e.g. UpdateTask where DB is not passed in).
func buildTaskNotif(
	userID, actorID uint,
	nType, title, body, linkURL, taskID string,
) interface{} {
	return struct {
		UserID  uint   `json:"user_id"`
		ActorID uint   `json:"actor_id"`
		Type    string `json:"type"`
		Title   string `json:"title"`
		Body    string `json:"body"`
		LinkURL string `json:"link_url"`
		TaskID  string `json:"task_id"`
		Read    bool   `json:"read"`
	}{
		UserID:  userID,
		ActorID: actorID,
		Type:    nType,
		Title:   title,
		Body:    body,
		LinkURL: linkURL,
		TaskID:  taskID,
		Read:    false,
	}
}
