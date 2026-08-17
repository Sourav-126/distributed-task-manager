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
	// Load environment variables
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

	// Phase 2 — Migrate the proper TaskModel (not pb.Task directly)
	db.AutoMigrate(&repository.TaskModel{})

	// Initialize repository and service
	taskRepo := repository.NewTaskRepository(db)
	taskService := server.NewTaskService(taskRepo)

	// Create gRPC server with logging interceptor
	grpcServer := grpc.NewServer(
		grpc.UnaryInterceptor(loggingInterceptor),
	)

	pb.RegisterTaskServiceServer(grpcServer, taskService)

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
