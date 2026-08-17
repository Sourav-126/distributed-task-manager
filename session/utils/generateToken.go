package utils

import (
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type CustomClaims struct {
	UserID    uint   `json:"user_id"`
	SessionID string `json:"session_id"`
	Role      string `json:"role"`   // e.g. "manager", "employee"
	OrgID     uint   `json:"org_id"` // 0 for super_admin
	jwt.RegisteredClaims
}

// jwtSecret reads the secret from the environment.
// Falls back to a safe default only if not set (will log a warning at startup).
func jwtSecret() []byte {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "change_me_in_production_use_a_long_random_string"
	}
	return []byte(secret)
}

func GenerateToken(userID uint, sessionId string, role string, orgID uint) (string, error) {
	claims := CustomClaims{
		UserID:    userID,
		SessionID: sessionId,
		Role:      role,
		OrgID:     orgID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "session",
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret())
}
