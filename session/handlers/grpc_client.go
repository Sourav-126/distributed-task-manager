package handlers

import (
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	pb "session/github.com/Sourav-126/distributed-task-manager/pb/task"
)

type GrpcServiceClient struct {
	Client pb.TaskServiceClient // The generated client
}

func InitServiceClient(url string) (*GrpcServiceClient, error) {
	conn, err := grpc.Dial(url, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, err
	}

	// Initialize the specific service client
	c := pb.NewTaskServiceClient(conn)
	return &GrpcServiceClient{Client: c}, nil
}
