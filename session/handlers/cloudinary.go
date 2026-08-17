package handlers

import (
	"crypto/sha1"
	"fmt"
	"os"
	"time"

	"github.com/gofiber/fiber/v3"
)

// POST /api/cloudinary/signature — Generate SHA-1 signature for Cloudinary Signed Upload
func GetCloudinarySignature() fiber.Handler {
	return func(c fiber.Ctx) error {
		userID, ok := c.Locals("user_id").(uint)
		if !ok || userID == 0 {
			return c.Status(401).JSON(fiber.Map{"error": "unauthorized"})
		}

		apiKey := os.Getenv("CLOUDINARY_API_KEY")
		if apiKey == "" {
			apiKey = "599359464963651"
		}
		apiSecret := os.Getenv("CLOUDINARY_API_SECRET")
		cloudName := os.Getenv("CLOUDINARY_CLOUD_NAME")
		if cloudName == "" {
			cloudName = "hokzgckw"
		}

		timestamp := time.Now().Unix()

		// Signature string format for Cloudinary: "timestamp=<timestamp><api_secret>"
		toSign := fmt.Sprintf("timestamp=%d%s", timestamp, apiSecret)
		h := sha1.New()
		h.Write([]byte(toSign))
		signature := fmt.Sprintf("%x", h.Sum(nil))

		return c.JSON(fiber.Map{
			"signature":  signature,
			"timestamp":  timestamp,
			"api_key":    apiKey,
			"cloud_name": cloudName,
		})
	}
}
