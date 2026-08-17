package handlers

import (
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	pb "session/github.com/Sourav-126/distributed-task-manager/pb/task"
	"gorm.io/gorm"
)

type GrpcServiceClient struct {
	Client pb.TaskServiceClient // The generated gRPC client
	DB     *gorm.DB             // Shared DB for notification persistence
}

func InitServiceClient(url string, db *gorm.DB) (*GrpcServiceClient, error) {
	conn, err := grpc.Dial(url, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, err
	}

	c := pb.NewTaskServiceClient(conn)
	return &GrpcServiceClient{Client: c, DB: db}, nil
}
