package repository

import (
	"context"
	"errors"
	"fmt"

	"gorm.io/gorm"
)

// TaskModel is the GORM DB model — kept separate from the protobuf struct
type TaskModel struct {
	ID          string `gorm:"primaryKey"`
	Title       string `gorm:"not null"`
	Description string `gorm:"not null"`
	Priority    int32  `gorm:"not null"`
	Difficulty  int32
	OrgID       uint   `gorm:"not null;index"`
	AssignedTo  uint   `gorm:"index"`           // user ID of the assignee
	CreatedBy   uint   `gorm:"not null;index"`  // user ID of the creator
	Deadline    string                           // ISO8601 string e.g. "2026-12-31"
	Status      string `gorm:"default:'pending'"` // pending | in_progress | done
}

// TaskRepository defines the data access interface
type TaskRepository interface {
	Create(ctx context.Context, task *TaskModel) (string, error)
	Update(ctx context.Context, task *TaskModel) (*TaskModel, error)
	Delete(ctx context.Context, id string) (string, error)
	GetById(ctx context.Context, id string) (*TaskModel, error)
	ListAll(ctx context.Context) ([]*TaskModel, error)
	ListByAssignee(ctx context.Context, userID uint) ([]*TaskModel, error)
	ListByOrg(ctx context.Context, orgID uint) ([]*TaskModel, error)
}

type taskRepository struct {
	db *gorm.DB
}

func NewTaskRepository(db *gorm.DB) TaskRepository {
	return &taskRepository{db: db}
}

func (r *taskRepository) Create(ctx context.Context, task *TaskModel) (string, error) {
	err := r.db.WithContext(ctx).Create(task).Error
	if err != nil {
		return "", err
	}
	return task.ID, nil
}

func (r *taskRepository) Update(ctx context.Context, task *TaskModel) (*TaskModel, error) {
	result := r.db.WithContext(ctx).Model(task).Where("id = ?", task.ID).Updates(task)
	if result.Error != nil {
		return nil, result.Error
	}
	if result.RowsAffected == 0 {
		return nil, gorm.ErrRecordNotFound
	}
	return task, nil
}

// Bug Fix 2: Use proper GORM First() with WHERE condition, scan into &TaskModel{}
func (r *taskRepository) GetById(ctx context.Context, id string) (*TaskModel, error) {
	var task TaskModel
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&task).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("task with ID %s not found", id)
		}
		return nil, err
	}
	return &task, nil
}

func (r *taskRepository) Delete(ctx context.Context, id string) (string, error) {
	result := r.db.WithContext(ctx).Delete(&TaskModel{}, "id = ?", id)
	if result.Error != nil {
		return "", result.Error
	}
	if result.RowsAffected == 0 {
		return "", fmt.Errorf("task with ID %s not found", id)
	}
	return id, nil
}

// Bug Fix 1: Find into a slice pointer so GORM actually populates it
func (r *taskRepository) ListAll(ctx context.Context) ([]*TaskModel, error) {
	var tasks []*TaskModel
	err := r.db.WithContext(ctx).Find(&tasks).Error
	if err != nil {
		return nil, err
	}
	return tasks, nil
}

// ListByAssignee — employee view: only tasks assigned to them
func (r *taskRepository) ListByAssignee(ctx context.Context, userID uint) ([]*TaskModel, error) {
	var tasks []*TaskModel
	err := r.db.WithContext(ctx).Where("assigned_to = ?", userID).Find(&tasks).Error
	if err != nil {
		return nil, err
	}
	return tasks, nil
}

// ListByOrg — manager/admin view: all tasks in the org
func (r *taskRepository) ListByOrg(ctx context.Context, orgID uint) ([]*TaskModel, error) {
	var tasks []*TaskModel
	err := r.db.WithContext(ctx).Where("org_id = ?", orgID).Find(&tasks).Error
	if err != nil {
		return nil, err
	}
	return tasks, nil
}
