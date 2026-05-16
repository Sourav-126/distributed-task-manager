package taskclient

import (
	"log"

	pb "task_service/github.com/Sourav-126/distributed-task-manager/pb/task"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

// Init dials the task-service gRPC server and returns a client + connection.
// The caller should close the connection (conn.Close()) when done.
func Init(addr string) (pb.TaskServiceClient, *grpc.ClientConn, error) {
	conn, err := grpc.NewClient(addr,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		log.Printf("[task-client] failed to connect: %v", err)
		return nil, nil, err
	}
	return pb.NewTaskServiceClient(conn), conn, nil
}
