package server

import (
	"context"
	"errors"
	pb "task_service/pb/task"
)

type TaskService struct {
}

func NewTaskService() *TaskService {
	return &TaskService{}
}

func (s *TaskService) CreateTask(ctx context.Context, req *pb.CreateTaskRequest) (*pb.CreateTaskResponse, error) {
	task := req.GetTask()
	if task == nil {
		return nil, errors.New("Task is nil")
	}
	if task.GetTitle() == "" {
		return nil, errors.New("Title is Required")

	}
	if task.GetDescription() == "" {
		return nil, errors.New("Description is Required")
	}
	if task.GetPriority().String() == "" {
		return nil, errors.New("Priority is Required")

	}

	return &pb.CreateTaskResponse{
		Respoose:&pb.Response{
			Success: true,
			Message: "Task Created Successfully",
		}
		TaskId: task.id,
	}

}
