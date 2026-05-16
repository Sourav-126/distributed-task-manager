package repository

import (
	"context"
	pb "task_service/pb/task"

	"gorm.io/gorm"
)

type TaskRepository interface {
	Create(ctx context.Context, task *pb.Task) (string, error)
	Update(ctx context.Context, task *pb.Task) error
	Delete(ctx context.Context, task *pb.Task) (string, error)
	GetById(ctx context.Context, id string) (*pb.Task, error)
	ListAll(ctx context.Context) ([]*pb.Task, error)
}

type taskRepository struct {
	db *gorm.DB
}

func NewTaskRepository(db *gorm.DB) TaskRepository {
    return &taskRepository{db: db}
}

func (r *taskRepository) Create(ctx context.Context, task *pb.Task) (string, error) {
	task , err:=
}
