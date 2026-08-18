	package utils

import (
	"context"
	"fmt"
	"os"

	"github.com/redis/go-redis/v9"
)

var ctx = context.Background()

func ConnectRedis() *redis.Client {
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		fmt.Println("REDIS_URL not set, skipping Redis connection")
		return nil
	}

	rdb := redis.NewClient(&redis.Options{
		Addr:     redisURL,
		Password: "",
		DB:       0,
	})

	_, err := rdb.Ping(ctx).Result()
	if err != nil {
		fmt.Printf("Warning: Cannot connect to Redis at %s: %v\n", redisURL, err)
		return nil
	}
	fmt.Println("Connected to Redis!")
	return rdb
}
