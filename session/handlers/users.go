package handlers

import (
	"fmt"
	"time"

	"session/models/users"
	"session/utils"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	pb "session/github.com/Sourav-126/distributed-task-manager/pb/task"
)

func Signin(db *gorm.DB, rdb *redis.Client) fiber.Handler {
	return func(c fiber.Ctx) error {
		var req users.SigninRequest

		if err := c.Bind().Body(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		var user users.User
		result := db.Where("email = ?", req.Email).First(&user)

		if result.Error != nil {
			if result.Error == gorm.ErrRecordNotFound {
				return c.Status(401).JSON(fiber.Map{"error": "User not found"})
			}
			return c.Status(500).JSON(fiber.Map{"error": "Database error"})
		}

		err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password))
		if err != nil {
			return c.Status(401).JSON(fiber.Map{"error": "Invalid credentials"})
		}

		at, err := utils.GenerateToken(user.ID, user.SessionID)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Token error"})
		}

		redisKey := fmt.Sprintf("user_session:%d", user.ID)
		rdb.Set(c.Context(), redisKey, user.SessionID, 24*time.Hour)

		return c.JSON(fiber.Map{
			"message":      "Login successful",
			"access_token": at,
		})
	}
}

func Signup(db *gorm.DB, rdb *redis.Client) fiber.Handler {
	return func(c fiber.Ctx) error {
		var req users.SigninRequest

		if err := c.Bind().Body(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		var existingUser users.User
		result := db.Where("email = ?", req.Email).First(&existingUser)
		if result.Error == nil {
			return c.Status(400).JSON(fiber.Map{"error": "User with this email already exists"})
		}

		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)

		newSessionID := uuid.New().String()

		newUser := users.User{
			Email:     req.Email,
			Password:  string(hashedPassword),
			SessionID: newSessionID,
		}

		if err := db.Create(&newUser).Error; err != nil {
			fmt.Println("DATABASE ERROR:", err)
			return c.Status(500).JSON(fiber.Map{"error": "Could not create user"})
		}

		redisKey := fmt.Sprintf("user_session:%d", newUser.ID)
		err := rdb.Set(c.Context(), redisKey, newSessionID, 24*time.Hour).Err()
		if err != nil {
			fmt.Println("Redis Save Error:", err)
		}

		return c.Status(201).JSON(fiber.Map{
			"message": "Signup successful",
			"user_id": newUser.ID,
		})
	}
}

func UpdatePassword(db *gorm.DB, rdb *redis.Client) fiber.Handler {
	return func(c fiber.Ctx) error {
		userID := c.Locals("user_id").(uint)

		var req struct {
			NewPassword string `json:"new_password"`
		}

		if err := c.Bind().Body(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
		}

		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)

		newSessionID := uuid.New().String()

		result := db.Model(&users.User{}).Where("id = ?", userID).Updates(map[string]interface{}{
			"password":   string(hashedPassword),
			"session_id": newSessionID,
		})

		if result.Error != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to update database"})
		}

		redisKey := fmt.Sprintf("user_session:%d", userID)
		rdb.Set(c.Context(), redisKey, newSessionID, 24*time.Hour)

		newToken, _ := utils.GenerateToken(userID, newSessionID)

		return c.JSON(fiber.Map{
			"message": "Password updated. All other sessions logged out.",
			"token":   newToken,
		})
	}
}
func GetProfile(db *gorm.DB) fiber.Handler {
	return func(c fiber.Ctx) error {
		userID := c.Locals("user_id").(uint)

		var user users.User
		if err := db.First(&user, userID).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "User not found"})
		}

		return c.JSON(fiber.Map{
			"id":    user.ID,
			"email": user.Email,
		})
	}
}

func Health() fiber.Handler {
	return func(c fiber.Ctx) error {

		return c.JSON(fiber.Map{
			"message": "up like you dick!",
		})
	}
}

// ForwardRequest is now a function that accepts the client and returns a Fiber Handler
func ForwardRequest(svc *GrpcServiceClient) fiber.Handler {
	return func(c fiber.Ctx) error {
		// Create a standard struct to parse the incoming JSON (flat structure)
		var payload struct {
			Title       string `json:"title"`
			Description string `json:"description"`
			Priority    int32  `json:"priority"`
			Difficulty  int32  `json:"difficulty"`
		}

		if err := c.Bind().JSON(&payload); err != nil {
			return c.Status(400).SendString("Invalid Request format: " + err.Error())
		}

		if payload.Title == "" && payload.Description == "" {
			return c.Status(400).SendString("Task payload is empty or invalid")
		}

		// Convert to Protobuf Enums
		difficulty := pb.Difficulty(payload.Difficulty)

		// Map to Protobuf request
		req := &pb.CreateTaskRequest{
			Task: &pb.Task{
				Title:       payload.Title,
				Description: payload.Description,
				Priority:    pb.Priority(payload.Priority),
				Difficulty:  &difficulty,
			},
		}

		resp, err := svc.Client.CreateTask(c.Context(), req)
		if err != nil {
			return c.Status(500).SendString("gRPC error: " + err.Error())
		}

		return c.JSON(resp)
	}
}
