package main

import (
	"fmt"
	"log"
	"session/db"
	"session/handlers"
	client "session/internal/handlers" // Import your internal client package
	"session/middleware"
	"session/models/products"
	"session/models/users"
	"session/utils"

	"github.com/gofiber/fiber/v3"
)

func main() {
	app := fiber.New()

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
	app.Post("/signup", handlers.Signup(DB, redis))
	app.Post("/signin", handlers.Signin(DB, redis))

	// Middleware Group
	authGroup := app.Group("/api", middleware.Protected(redis))

	authGroup.Get("/profile", handlers.GetProfile(DB))
	authGroup.Put("/update-password", handlers.UpdatePassword(DB, redis))

	// 4. New Forwarding Route
	// Pass the grpcClient to the handler so it can forward the request
	authGroup.Post("/forward-to-service", client.ForwardRequest(grpcClient))

	log.Fatal(app.Listen(":1443"))
}
