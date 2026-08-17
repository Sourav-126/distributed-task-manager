package db

import (
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type TaskModel struct {
	ID          string `gorm:"primaryKey"`
	Title       string
	Description string
	Priority    int32
	Difficulty  int32
	OrgID       uint
	AssignedTo  uint `gorm:"index"`
	CreatedBy   uint
	Deadline    string
	Status      string
}

func Connect() *gorm.DB {
	dsn := "host=localhost port=5432 user=sourav password=123456 dbname=task-service sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal(" connect db failed")
	}

	// Ensure task_models table exists so spatial aura workload queries succeed
	_ = db.AutoMigrate(&TaskModel{})
	return db
}
