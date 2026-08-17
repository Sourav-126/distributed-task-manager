package server

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strconv"

	repository "task_service/Repository"
	pb "task_service/pb/task"

	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

// ─────────────────────────────── Role constants ───────────────────────────────

const (
	RoleSuperAdmin = "super_admin"
	RoleOrgAdmin   = "org_admin"
	RoleManager    = "manager"
	RoleTeamLead   = "team_lead" // NEW — leads one team under a manager
	RoleEmployee   = "employee"
	RoleGuest      = "guest"
)

// roleLevel maps roles to numeric levels for comparison.
// Higher number = more privileged.
var roleLevel = map[string]int{
	RoleGuest:      0,
	RoleEmployee:   1,
	RoleTeamLead:   2, // NEW
	RoleManager:    3,
	RoleOrgAdmin:   4,
	RoleSuperAdmin: 5,
}


// hasRole returns true if callerRole is at least the required role level
func hasRole(callerRole, requiredRole string) bool {
	callerLevel, ok := roleLevel[callerRole]
	if !ok {
		return false // unknown role → deny
	}
	return callerLevel >= roleLevel[requiredRole]
}

// ─────────────────────────────── Service struct ───────────────────────────────

type TaskService struct {
	pb.UnimplementedTaskServiceServer
	repo repository.TaskRepository
}

func NewTaskService(repo repository.TaskRepository) *TaskService {
	return &TaskService{repo: repo}
}

// ─────────────────────────────── Metadata extraction ───────────────────────────────

// extractMeta pulls user_id, org_id, and role from incoming gRPC metadata.
// These were injected by the session gateway via injectMetadata().
func extractMeta(ctx context.Context) (userID uint, orgID uint, role string) {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return
	}
	if vals := md.Get("user_id"); len(vals) > 0 {
		if v, err := strconv.ParseUint(vals[0], 10, 64); err == nil {
			userID = uint(v)
		}
	}
	if vals := md.Get("org_id"); len(vals) > 0 {
		if v, err := strconv.ParseUint(vals[0], 10, 64); err == nil {
			orgID = uint(v)
		}
	}
	if vals := md.Get("role"); len(vals) > 0 {
		role = vals[0]
	}
	return
}

// validateTask checks a pb.Task for required fields and valid values.
// Returns a gRPC status error ready to be returned directly, or nil if valid.
// This is the single source of truth for task validation in the gRPC layer.
func validateTask(task *pb.Task) error {
	if task == nil {
		return status.Error(codes.InvalidArgument, "task cannot be nil")
	}
	if len(task.GetTitle()) < 3 {
		return status.Error(codes.InvalidArgument, "title must be at least 3 characters")
	}
	if len(task.GetTitle()) > 200 {
		return status.Error(codes.InvalidArgument, "title must be at most 200 characters")
	}
	if len(task.GetDescription()) < 5 {
		return status.Error(codes.InvalidArgument, "description must be at least 5 characters")
	}
	validStatuses := map[string]bool{"pending": true, "in_progress": true, "in_review": true, "done": true, "": true}
	if !validStatuses[task.GetStatus()] {
		return status.Errorf(codes.InvalidArgument, "status must be one of: pending, in_progress, in_review, done (got '%s')", task.GetStatus())
	}
	return nil
}

// ─────────────────────────────── CreateTask ───────────────────────────────
//
// Who can call this: manager, org_admin, super_admin
// Guard: employees and guests are denied

func (s *TaskService) CreateTask(
	ctx context.Context,
	req *pb.CreateTaskRequest,
) (*pb.CreateTaskResponse, error) {

	callerID, orgID, role := extractMeta(ctx)
	log.Printf("📥 [gRPC CreateTask] Request received | CallerID: %d | OrgID: %d | Role: %s", callerID, orgID, role)

	// ── Role guard: team_lead and above may create/assign tasks ──
	if !hasRole(role, RoleTeamLead) {
		log.Printf("❌ [gRPC CreateTask DENIED] Role '%s' insufficient (requires team_lead+)", role)
		return nil, status.Errorf(codes.PermissionDenied,
			"role '%s' is not allowed to create tasks (requires: team_lead or above)", role)
	}

	task := req.GetTask()

	// Single call replaces all scattered if-checks
	if err := validateTask(task); err != nil {
		log.Printf("⚠️ [gRPC CreateTask VALIDATION ERROR] %v", err)
		return nil, err
	}

	// Use org_id from JWT if not provided in task body
	taskOrgID := task.GetOrgId()
	if taskOrgID == 0 {
		taskOrgID = uint64(orgID)
	}
	if taskOrgID == 0 {
		log.Printf("ℹ️ [gRPC CreateTask] org_id was 0 for callerID=%d, falling back to Default Org #1", callerID)
		taskOrgID = 1
	}

	model := &repository.TaskModel{
		ID:          uuid.New().String(),
		Title:       task.GetTitle(),
		Description: task.GetDescription(),
		Priority:    int32(task.GetPriority()),
		OrgID:       uint(taskOrgID),
		AssignedTo:  uint(task.GetAssignedTo()),
		CreatedBy:   callerID,
		Deadline:    task.GetDeadline(),
		Status:      task.GetStatus(),
	}
	if task.Difficulty != nil {
		model.Difficulty = int32(*task.Difficulty)
	}
	if model.Status == "" {
		model.Status = "pending"
	}

	id, err := s.repo.Create(ctx, model)
	if err != nil {
		log.Printf("❌ [gRPC CreateTask FAILED] repo.Create error: %v", err)
		return nil, status.Errorf(codes.Internal, "failed to create task: %v", err)
	}

	log.Printf("✅ [gRPC CreateTask SUCCESS] Task created: %s | Title: '%s' | OrgID: %d | AssignedTo: %d", id, model.Title, model.OrgID, model.AssignedTo)

	return &pb.CreateTaskResponse{
		Response: &pb.Response{Success: true, Message: id},
		TaskId:   id,
	}, nil
}

// ─────────────────────────────── GetTaskById ───────────────────────────────
//
// Who can call this: employee (own tasks only), manager+
// Guard:
//   - Guests are fully denied
//   - Employees can ONLY fetch tasks assigned to themselves
//   - Managers can fetch any task within their org
//   - Org admin / super admin can fetch any task

func (s *TaskService) GetTaskById(ctx context.Context, req *pb.GetTaskByIdRequest) (*pb.GetTaskByIdResponse, error) {
	callerID, orgID, role := extractMeta(ctx)
	id := req.GetTaskId()
	log.Printf("📥 [gRPC GetTaskById] Request received | TaskID: '%s' | CallerID: %d | OrgID: %d | Role: %s", id, callerID, orgID, role)

	// ── Role guard: guests cannot read tasks ──
	if !hasRole(role, RoleEmployee) {
		log.Printf("❌ [gRPC GetTaskById DENIED] Role '%s' not allowed to read tasks", role)
		return nil, status.Errorf(codes.PermissionDenied,
			"role '%s' is not allowed to read tasks", role)
	}

	if id == "" {
		return nil, status.Error(codes.InvalidArgument, "task_id is required")
	}

	task, err := s.repo.GetById(ctx, id)
	if err != nil {
		log.Printf("⚠️ [gRPC GetTaskById NOT FOUND] TaskID '%s': %v", id, err)
		return nil, status.Errorf(codes.NotFound, "%v", err)
	}

	// ── Org isolation: non-super-admins can only see tasks in their org ──
	if role != RoleSuperAdmin && task.OrgID != orgID {
		log.Printf("❌ [gRPC GetTaskById DENIED] Org mismatch (TaskOrgID: %d, CallerOrgID: %d)", task.OrgID, orgID)
		return nil, status.Error(codes.PermissionDenied, "task does not belong to your organization")
	}

	// ── Employee isolation: can only see tasks assigned to themselves ──
	if role == RoleEmployee && task.AssignedTo != callerID {
		log.Printf("❌ [gRPC GetTaskById DENIED] Employee #%d attempted to access task #%s assigned to #%d", callerID, id, task.AssignedTo)
		return nil, status.Errorf(codes.PermissionDenied,
			"access denied: task %s is not assigned to you", id)
	}

	log.Printf("✅ [gRPC GetTaskById SUCCESS] TaskID '%s' fetched successfully", id)
	return &pb.GetTaskByIdResponse{Task: modelToProto(task)}, nil
}

// ─────────────────────────────── UpdateTask ───────────────────────────────
//
// Who can call this: manager, org_admin, super_admin
// Guard: employees and guests cannot update tasks

func (s *TaskService) UpdateTask(ctx context.Context, req *pb.UpdateTaskRequest) (*pb.UpdateTaskResponse, error) {
	callerID, orgID, role := extractMeta(ctx)
	task := req.GetTask()
	taskID := ""
	if task != nil {
		taskID = task.GetId()
	}
	log.Printf("📥 [gRPC UpdateTask] Request received | TaskID: '%s' | CallerID: %d | OrgID: %d | Role: %s", taskID, callerID, orgID, role)

	// ── Role guard: team_lead and above may update tasks ──
	if !hasRole(role, RoleTeamLead) {
		log.Printf("❌ [gRPC UpdateTask DENIED] Role '%s' insufficient (requires team_lead+)", role)
		return nil, status.Errorf(codes.PermissionDenied,
			"role '%s' is not allowed to update tasks (requires: team_lead or above)", role)
	}

	if task == nil {
		return nil, status.Error(codes.InvalidArgument, "task is nil")
	}
	if task.GetId() == "" {
		return nil, status.Error(codes.InvalidArgument, "task id is required")
	}

	existing, err := s.repo.GetById(ctx, task.GetId())
	if err != nil {
		log.Printf("⚠️ [gRPC UpdateTask NOT FOUND] TaskID '%s': %v", task.GetId(), err)
		return nil, status.Errorf(codes.NotFound, "%v", err)
	}

	// ── Org isolation: manager can only update tasks in their own org ──
	if role != RoleSuperAdmin && existing.OrgID != orgID {
		log.Printf("❌ [gRPC UpdateTask DENIED] Org mismatch (TaskOrgID: %d, CallerOrgID: %d)", existing.OrgID, orgID)
		return nil, status.Error(codes.PermissionDenied, "task does not belong to your organization")
	}

	// Apply partial updates — only non-zero values are applied
	if task.GetTitle() != "" {
		existing.Title = task.GetTitle()
	}
	if task.GetDescription() != "" {
		existing.Description = task.GetDescription()
	}
	if task.GetPriority() != 0 {
		existing.Priority = int32(task.GetPriority())
	}
	if task.GetDeadline() != "" {
		existing.Deadline = task.GetDeadline()
	}
	if task.GetStatus() != "" {
		existing.Status = task.GetStatus()
	}
	if task.GetAssignedTo() != 0 {
		existing.AssignedTo = uint(task.GetAssignedTo())
	}

	_, err = s.repo.Update(ctx, existing)
	if err != nil {
		log.Printf("❌ [gRPC UpdateTask FAILED] repo.Update error: %v", err)
		return nil, status.Errorf(codes.Internal, "failed to update task: %v", err)
	}

	log.Printf("✅ [gRPC UpdateTask SUCCESS] TaskID '%s' updated successfully", existing.ID)
	return &pb.UpdateTaskResponse{
		Resp: &pb.Response{Success: true, Message: "Task updated successfully"},
	}, nil
}

// ─────────────────────────────── DeleteTask ───────────────────────────────

func (s *TaskService) DeleteTask(ctx context.Context, req *pb.DeleteTaskRequest) (*pb.DeleteTaskResponse, error) {
	callerID, orgID, role := extractMeta(ctx)
	id := req.GetTaskId()
	log.Printf("📥 [gRPC DeleteTask] Request received | TaskID: '%s' | CallerID: %d | OrgID: %d | Role: %s", id, callerID, orgID, role)

	// ── Role guard: only org_admin and above may delete tasks ──
	if !hasRole(role, RoleOrgAdmin) {
		log.Printf("❌ [gRPC DeleteTask DENIED] Role '%s' insufficient (requires org_admin+)", role)
		return nil, status.Errorf(codes.PermissionDenied,
			"role '%s' is not allowed to delete tasks (requires: org_admin or above)", role)
	}

	if id == "" {
		return nil, status.Error(codes.InvalidArgument, "task_id is required")
	}

	// ── Org isolation: verify task belongs to caller's org before deleting ──
	if role != RoleSuperAdmin {
		existing, err := s.repo.GetById(ctx, id)
		if err != nil {
			log.Printf("⚠️ [gRPC DeleteTask NOT FOUND] TaskID '%s': %v", id, err)
			return nil, status.Errorf(codes.NotFound, "%v", err)
		}
		if existing.OrgID != orgID {
			log.Printf("❌ [gRPC DeleteTask DENIED] Org mismatch (TaskOrgID: %d, CallerOrgID: %d)", existing.OrgID, orgID)
			return nil, status.Error(codes.PermissionDenied, "task does not belong to your organization")
		}
	}

	_, err := s.repo.Delete(ctx, id)
	if err != nil {
		log.Printf("❌ [gRPC DeleteTask FAILED] repo.Delete error: %v", err)
		return nil, status.Errorf(codes.NotFound, "%v", err)
	}

	log.Printf("✅ [gRPC DeleteTask SUCCESS] TaskID '%s' deleted successfully", id)
	return &pb.DeleteTaskResponse{
		Resp: &pb.Response{Success: true, Message: "Task deleted successfully"},
	}, nil
}

// ─────────────────────────────── ListAllTasks ───────────────────────────────

func (s *TaskService) ListAllTasks(ctx context.Context, req *pb.ListAllTasksRequest) (*pb.ListAllTasksResponse, error) {
	callerID, orgID, role := extractMeta(ctx)
	log.Printf("📥 [gRPC ListAllTasks] Request received | CallerID: %d | OrgID: %d | Role: %s", callerID, orgID, role)

	// ── Role guard: only org_admin and above get the full unscoped list ──
	if !hasRole(role, RoleOrgAdmin) {
		log.Printf("❌ [gRPC ListAllTasks DENIED] Role '%s' insufficient", role)
		return nil, status.Errorf(codes.PermissionDenied,
			"role '%s' cannot list all tasks — use /tasks/me or /tasks/team instead", role)
	}

	tasks, err := s.repo.ListAll(ctx)
	if err != nil {
		log.Printf("❌ [gRPC ListAllTasks FAILED] %v", err)
		return nil, status.Errorf(codes.Internal, "failed to list tasks: %v", err)
	}

	log.Printf("✅ [gRPC ListAllTasks SUCCESS] Returned %d tasks", len(tasks))
	return &pb.ListAllTasksResponse{Tasks: modelsToProto(tasks)}, nil
}

// ─────────────────────────────── ListMyTasks ───────────────────────────────

func (s *TaskService) ListMyTasks(ctx context.Context, req *pb.ListMyTasksRequest) (*pb.ListMyTasksResponse, error) {
	callerID, orgID, role := extractMeta(ctx)
	log.Printf("📥 [gRPC ListMyTasks] Request received | CallerID: %d | OrgID: %d | Role: %s", callerID, orgID, role)

	// ── Role guard: guests cannot list tasks ──
	if !hasRole(role, RoleEmployee) {
		log.Printf("❌ [gRPC ListMyTasks DENIED] Role '%s' not allowed to list tasks", role)
		return nil, status.Errorf(codes.PermissionDenied,
			"role '%s' is not allowed to list tasks", role)
	}

	userID := callerID
	if hasRole(role, RoleManager) && req.GetUserId() != 0 {
		userID = uint(req.GetUserId())
	}

	if userID == 0 {
		return nil, status.Error(codes.InvalidArgument, "could not determine user_id")
	}

	tasks, err := s.repo.ListByAssignee(ctx, userID)
	if err != nil {
		log.Printf("❌ [gRPC ListMyTasks FAILED] %v", err)
		return nil, status.Errorf(codes.Internal, "failed to list tasks: %v", err)
	}

	log.Printf("✅ [gRPC ListMyTasks SUCCESS] Returned %d tasks for AssigneeID #%d", len(tasks), userID)
	return &pb.ListMyTasksResponse{Tasks: modelsToProto(tasks)}, nil
}

// ─────────────────────────────── ListTeamTasks ───────────────────────────────

func (s *TaskService) ListTeamTasks(ctx context.Context, req *pb.ListTeamTasksRequest) (*pb.ListTeamTasksResponse, error) {
	callerID, callerOrgID, role := extractMeta(ctx)
	log.Printf("📥 [gRPC ListTeamTasks] Request received | CallerID: %d | CallerOrgID: %d | Role: %s", callerID, callerOrgID, role)

// ── Role guard: employees and above may list team tasks ──
	if !hasRole(role, RoleEmployee) {
		log.Printf("❌ [gRPC ListTeamTasks DENIED] Role '%s' insufficient", role)
		return nil, status.Errorf(codes.PermissionDenied,
			"role '%s' is not allowed to list team tasks", role)
	}

	orgID := callerOrgID
	if role == RoleSuperAdmin && req.GetOrgId() != 0 {
		orgID = uint(req.GetOrgId())
	}
	if orgID == 0 {
		log.Printf("ℹ️ [gRPC ListTeamTasks] org_id was 0, falling back to Default Org #1")
		orgID = 1
	}

	tasks, err := s.repo.ListByOrg(ctx, orgID)
	if err != nil {
		log.Printf("❌ [gRPC ListTeamTasks FAILED] repo.ListByOrg error: %v", err)
		return nil, status.Errorf(codes.Internal, "failed to list team tasks: %v", err)
	}

	log.Printf("✅ [gRPC ListTeamTasks SUCCESS] Returned %d tasks for OrgID #%d", len(tasks), orgID)
	return &pb.ListTeamTasksResponse{Tasks: modelsToProto(tasks)}, nil
}

// ─────────────────────────────── Helpers ───────────────────────────────

func modelToProto(m *repository.TaskModel) *pb.Task {
	diff := pb.Difficulty(m.Difficulty)
	return &pb.Task{
		Id:          m.ID,
		Title:       m.Title,
		Description: m.Description,
		Priority:    pb.Priority(m.Priority),
		Difficulty:  &diff,
		OrgId:       uint64(m.OrgID),
		AssignedTo:  uint64(m.AssignedTo),
		CreatedBy:   uint64(m.CreatedBy),
		Deadline:    m.Deadline,
		Status:      m.Status,
	}
}

func modelsToProto(models []*repository.TaskModel) []*pb.Task {
	out := make([]*pb.Task, 0, len(models))
	for _, m := range models {
		out = append(out, modelToProto(m))
	}
	return out
}

// keep errors imported (used in some paths)
var _ = errors.New
var _ = fmt.Sprintf
