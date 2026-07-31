package server

import (
	"context"
	"errors"

	repository "task_service/Repository"
	pb "task_service/pb/task"

	"github.com/google/uuid"
)

type TaskService struct {
	pb.UnimplementedTaskServiceServer
	repo repository.TaskRepository
}

func NewTaskService(repo repository.TaskRepository) *TaskService {
	return &TaskService{repo: repo}
}

func (s *TaskService) CreateTask(
	ctx context.Context,
	req *pb.CreateTaskRequest,
) (*pb.CreateTaskResponse, error) {

	task := req.GetTask()

	if task == nil {
		return nil, errors.New("task is nil")
	}

	if task.GetTitle() == "" {
		return nil, errors.New("title is required")
	}

	if task.GetDescription() == "" {
		return nil, errors.New("description is required")
	}

	task.Id = uuid.New().String()

	result, err := s.repo.Create(ctx, task)
	if err != nil {
		return nil, err
	}

	return &pb.CreateTaskResponse{
		Response: &pb.Response{
			Success: true,
			Message: result,
		},
		TaskId: task.Id,
	}, nil
}
