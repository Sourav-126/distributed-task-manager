package main

import (
	"context"
	"log"
	"net"
	"os"

	"github.com/joho/godotenv"
	"github.com/sirupsen/logrus"
	"google.golang.org/grpc"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	repository "task_service/Repository"
	"task_service/internal/server"
	pb "task_service/pb/task"
)

type Task struct {
	Id          string `gorm:"primaryKey"`
	Title       string `gorm:"not null"`
	Description string `gorm:"not null"`
	Priority    int32  `gorm:"not null"`
	Difficulty  int32
}

func loggingInterceptor(
	ctx context.Context,
	req interface{},
	info *grpc.UnaryServerInfo,
	handler grpc.UnaryHandler,
) (interface{}, error) {
	logrus.WithFields(logrus.Fields{
		"method": info.FullMethod,
	}).Info("gRPC Request")

	resp, err := handler(ctx, req)
	if err != nil {
		logrus.WithFields(logrus.Fields{
			"method": info.FullMethod,
			"error":  err.Error(),
		}).Error("gRPC Request Failed")
	}
	return resp, err
}


func main() {
	// Database connection
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL environment variable not set")
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Migrate the schema
	db.AutoMigrate(&Task{})

	// Initialize repository
	taskRepo := repository.NewTaskRepository(db)

	// Initialize gRPC service
	taskService := server.NewTaskService(taskRepo)

	// Create a new gRPC server with interceptor
	grpcServer := grpc.NewServer(
		grpc.UnaryInterceptor(loggingInterceptor),
	)

	// Register the task service
	pb.RegisterTaskServiceServer(grpcServer, taskService)

	// Listen on a port (e.g., 50051)
	port := os.Getenv("PORT")
	if port == "" {
		port = "50051"
	}

	lis, err := net.Listen("tcp", ":"+port)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	log.Printf("Server listening at %v", lis.Addr())
	if err := grpcServer.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
