package repository

import (
	"context"
	"errors"
	"fmt"
	pb "task_service/pb/task"

	"gorm.io/gorm"
)

type TaskRepository interface {
	Create(ctx context.Context, task *pb.Task) (string, error)
	Update(ctx context.Context, task *pb.Task) (*pb.Task, error)
	Delete(ctx context.Context, id string) (string, error)
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
	err := r.db.WithContext(ctx).Create(task).Error
	if err != nil {
		return "", err
	}
	return task.Id, nil
}

func (r *taskRepository) Update(ctx context.Context, pbTask *pb.Task) (*pb.Task, error) {

	result := r.db.WithContext(ctx).Model(pbTask).Where("id = ?", pbTask.Id).Updates(pbTask)

	// 3. Handle errors
	if result.Error != nil {
		return nil, result.Error
	}

	// 4. Check if the record existed
	if result.RowsAffected == 0 {
		return nil, gorm.ErrRecordNotFound
	}

	// 5. Return the updated task (or re-fetch if needed)
	return pbTask, nil
}

func (r *taskRepository) GetById(ctx context.Context, id string) (*pb.Task, error) {
	task := r.db.WithContext(ctx).First(id)
	if task.Error != nil {
		if errors.Is(task.Error, gorm.ErrRecordNotFound) {
			return nil, task.Error
		}
	}
	return &pb.Task{}, nil
}

func (r *taskRepository) Delete(ctx context.Context, id string) (string, error) {
	result := r.db.WithContext(ctx).Delete(pb.Task{}, "id = ?", id)

	if result.Error != nil {
		return "", result.Error
	}

	if result.RowsAffected == 0 {
		return "", fmt.Errorf("task with ID %s not found", id)
	}

	// Success
	return id, nil
}
func (r *taskRepository) ListAll(ctx context.Context) ([]*pb.Task, error) {

	err := r.db.WithContext(ctx).Find(&pb.Task{}).Error
	if err != nil {
		return nil, err
	}

	// Convert GORM models to Protobuf models
	var pbTasks []*pb.Task
	for _, t := range pbTasks {
		pbTasks = append(pbTasks, &pb.Task{
			Id:          t.Id,
			Title:       t.Title,
			Description: t.Description,
			Priority:    t.Priority,
			Difficulty:  t.Difficulty,
		})
	}

	return pbTasks, nil
}
