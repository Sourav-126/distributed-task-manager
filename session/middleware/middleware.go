package middleware

import (
	"fmt"
	"session/utils"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"
)

func Protected(rdb *redis.Client) fiber.Handler {
	return func(c fiber.Ctx) error {

		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(401).JSON(fiber.Map{"error": "Missing authorization header"})
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		token, err := jwt.ParseWithClaims(tokenString, &utils.CustomClaims{}, func(token *jwt.Token) (interface{}, error) {
			return []byte("password"), nil
		})

		if err != nil || !token.Valid {
			return c.Status(401).JSON(fiber.Map{"error": "Invalid or expired token"})
		}

		claims, ok := token.Claims.(*utils.CustomClaims)
		if !ok {
			return c.Status(401).JSON(fiber.Map{"error": "Invalid token claims"})
		}

		redisKey := fmt.Sprintf("user_session:%d", claims.UserID)
		storedSessionID, err := rdb.Get(c.Context(), redisKey).Result()

		if err == redis.Nil {
			return c.Status(401).JSON(fiber.Map{"error": "Session not found, please login again"})
		} else if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Internal server error"})
		}

		if claims.SessionID != storedSessionID {
			return c.Status(401).JSON(fiber.Map{"error": "Session invalidated (e.g., password changed). Please login again."})
		}

		c.Locals("user_id", claims.UserID)

		return c.Next()
	}
}
