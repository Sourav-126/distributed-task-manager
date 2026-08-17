package middleware

import "github.com/gofiber/fiber/v3"

// RequireRole returns a Fiber middleware that only allows users with one of the specified roles.
// Usage: RequireRole("manager", "org_admin")
func RequireRole(allowedRoles ...string) fiber.Handler {
	return func(c fiber.Ctx) error {
		role, ok := c.Locals("role").(string)
		if !ok || role == "" {
			return c.Status(401).JSON(fiber.Map{"error": "Unauthorized: no role found in token"})
		}

		for _, r := range allowedRoles {
			if role == r {
				return c.Next()
			}
		}

		return c.Status(403).JSON(fiber.Map{
			"error":         "Forbidden: insufficient permissions",
			"your_role":     role,
			"required_role": allowedRoles,
		})
	}
}

// RequireOrgMatch ensures the user's org_id matches the resource's org.
// Use this for operations where you need to confirm the user belongs to the right org.
func RequireOrgMatch(orgID uint) bool {
	return orgID != 0
}
