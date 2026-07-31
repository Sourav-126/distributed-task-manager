package main

import (
	"fmt"
	"log"
	"time"
	"session/db"
	"session/handlers"
	client "session/handlers" // Import your internal client package
	"session/middleware"
	"session/models/products"
	"session/models/users"
	"session/utils"

	"github.com/gofiber/fiber/v3"
	"github.com/sirupsen/logrus"
)

func main() {
	logrus.SetFormatter(&logrus.TextFormatter{
		FullTimestamp: true,
	})

	app := fiber.New()

	app.Use(func(c fiber.Ctx) error {
		start := time.Now()
		
		err := c.Next()
		
		logrus.WithFields(logrus.Fields{
			"method":  c.Method(),
			"path":    c.Path(),
			"status":  c.Response().StatusCode(),
			"latency": time.Since(start),
		}).Info("HTTP Request")
		
		return err
	})

	// 1. Core Infrastructure Connections
	DB := db.Connect()
	redis := utils.ConnectRedis()

	// 2. Initialize gRPC Client
	// This creates a long-lived connection to your microservice
	grpcClient, err := client.InitServiceClient("localhost:50051")
	if err != nil {
		log.Fatalf("Failed to connect to gRPC Service: %v", err)
	}
	fmt.Println("connected to the microservice")

	// Database Migrations
	DB.AutoMigrate(&users.User{}, &products.Products{})

	// 3. Routes
	app.Get("/health", handlers.Health())
	app.Post("/signup", handlers.Signup(DB, redis))
	app.Post("/signin", handlers.Signin(DB, redis))

	authGroup := app.Group("/api", middleware.Protected(redis))

	authGroup.Get("/profile", handlers.GetProfile(DB))
	authGroup.Put("/update-password", handlers.UpdatePassword(DB, redis))

	authGroup.Post("/forward-to-service", client.ForwardRequest(grpcClient))

	log.Fatal(app.Listen(":1443"))
}
