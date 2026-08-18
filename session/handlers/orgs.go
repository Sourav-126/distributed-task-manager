package handlers

import (
	"fmt"
	"time"

	"session/models/orgs"
	"session/models/roles"
	"session/models/users"
	"session/utils"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// CreateOrg — only super_admin can create a new organization
// POST /api/orgs
func CreateOrg(db *gorm.DB) fiber.Handler {
	return func(c fiber.Ctx) error {
		callerOrgID := c.Locals("org_id").(uint)
		_ = callerOrgID

		var req struct {
			Name string `json:"name"`
		}
		if err := c.Bind().JSON(&req); err != nil || req.Name == "" {
			return c.Status(400).JSON(fiber.Map{"error": "Org name is required"})
		}

		callerID := c.Locals("user_id").(uint)

		org := orgs.Organization{
			Name:    req.Name,
			OwnerID: callerID,
		}

		if err := db.Create(&org).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to create organization"})
		}

		// Assign the creator as org_admin of the new org
		var orgAdminRole roles.Role
		db.Where("name = ? AND org_id IS NULL", roles.RoleOrgAdmin).First(&orgAdminRole)
		if orgAdminRole.ID == 0 {
			orgAdminRole = roles.Role{Name: roles.RoleOrgAdmin}
			db.Create(&orgAdminRole)
		}

		db.Model(&users.User{}).Where("id = ?", callerID).Updates(map[string]interface{}{
			"org_id":  org.ID,
			"role_id": orgAdminRole.ID,
		})

		return c.Status(201).JSON(fiber.Map{
			"message": "Organization created",
			"org_id":  org.ID,
			"org_name": org.Name,
		})
	}
}

// InviteUser — org_admin invites a new user to their org with a specified role
// POST /api/orgs/invite
func InviteUser(db *gorm.DB, rdb *redis.Client) fiber.Handler {
	return func(c fiber.Ctx) error {
		callerOrgID := c.Locals("org_id").(uint)

		var req struct {
			Email    string           `json:"email"`
			Password string           `json:"password"`
			Role     roles.RoleName   `json:"role"` // "manager", "employee", "guest"
		}
		if err := c.Bind().JSON(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
		}

		if !req.Role.IsValid() || req.Role == roles.RoleSuperAdmin {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid role. Choose from: manager, employee, guest"})
		}

		// Check user doesn't already exist
		var existing users.User
		if db.Where("email = ?", req.Email).First(&existing).Error == nil {
			return c.Status(400).JSON(fiber.Map{"error": "User with this email already exists"})
		}

		// Find or create the target role
		var targetRole roles.Role
		db.Where("name = ? AND org_id IS NULL", req.Role).First(&targetRole)
		if targetRole.ID == 0 {
			targetRole = roles.Role{Name: req.Role}
			db.Create(&targetRole)
		}

		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		sessionID := uuid.New().String()

		// Guest accounts auto-expire in 30 days
		var expiresAt *time.Time
		if req.Role == roles.RoleGuest {
			t := time.Now().Add(30 * 24 * time.Hour)
			expiresAt = &t
		}

		newUser := users.User{
			Email:     req.Email,
			Password:  string(hashedPassword),
			SessionID: sessionID,
			OrgID:     &callerOrgID,
			RoleID:    &targetRole.ID,
			ExpiresAt: expiresAt,
		}

		if err := db.Create(&newUser).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Could not create user"})
		}

		// Store session in Redis if available
		if rdb != nil {
			redisKey := fmt.Sprintf("user_session:%d", newUser.ID)
			rdb.Set(c.Context(), redisKey, sessionID, 24*time.Hour)
		}

		return c.Status(201).JSON(fiber.Map{
			"message": "User invited successfully",
			"user_id": newUser.ID,
			"email":   newUser.Email,
			"role":    string(req.Role),
			"org_id":  callerOrgID,
		})
	}
}

// ChangeRole — org_admin changes the role of a user within the org
// PUT /api/orgs/role
func ChangeRole(db *gorm.DB) fiber.Handler {
	return func(c fiber.Ctx) error {
		callerOrgID := c.Locals("org_id").(uint)

		var req struct {
			UserID uint           `json:"user_id"`
			Role   roles.RoleName `json:"role"`
		}
		if err := c.Bind().JSON(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
		}

		if !req.Role.IsValid() || req.Role == roles.RoleSuperAdmin {
			return c.Status(400).JSON(fiber.Map{"error": "Cannot assign this role"})
		}

		// Make sure target user belongs to the same org
		var target users.User
		if err := db.Where("id = ? AND org_id = ?", req.UserID, callerOrgID).First(&target).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "User not found in your organization"})
		}

		var targetRole roles.Role
		db.Where("name = ? AND org_id IS NULL", req.Role).First(&targetRole)
		if targetRole.ID == 0 {
			targetRole = roles.Role{Name: req.Role}
			db.Create(&targetRole)
		}

		db.Model(&target).Update("role_id", targetRole.ID)

		return c.JSON(fiber.Map{
			"message":  "Role updated",
			"user_id":  req.UserID,
			"new_role": string(req.Role),
		})
	}
}

// RemoveUser — org_admin removes a user from the org
// DELETE /api/orgs/users/:id
func RemoveUser(db *gorm.DB, rdb *redis.Client) fiber.Handler {
	return func(c fiber.Ctx) error {
		callerOrgID := c.Locals("org_id").(uint)

		idStr := c.Params("id")
		var targetUserID uint
		if idStr == "" {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
		}
		if n, err := fmt.Sscanf(idStr, "%d", &targetUserID); err != nil || n == 0 || targetUserID == 0 {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
		}

		var target users.User
		if err := db.Where("id = ? AND org_id = ?", targetUserID, callerOrgID).First(&target).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "User not found in your organization"})
		}

		// Remove from org — set org_id to NULL and reset to employee role
		db.Model(&target).Updates(map[string]interface{}{
			"org_id":  nil,
			"role_id": nil,
		})

		// Invalidate their session in Redis if available
		if rdb != nil {
			redisKey := fmt.Sprintf("user_session:%d", target.ID)
			rdb.Del(c.Context(), redisKey)
		}

		// Regenerate a new session so their current token is invalidated
		newSessionID := uuid.New().String()
		db.Model(&target).Update("session_id", newSessionID)

		return c.JSON(fiber.Map{
			"message": "User removed from organization",
			"user_id": targetUserID,
		})
	}
}

// GetOrgMembers — list all users in the caller's org with optional role filter (?role=team_lead)
// GET /api/orgs/members
func GetOrgMembers(db *gorm.DB) fiber.Handler {
	return func(c fiber.Ctx) error {
		callerID := c.Locals("user_id").(uint)
		callerOrgID := c.Locals("org_id").(uint)
		roleFilter := c.Query("role")

		if callerOrgID == 0 {
			var u users.User
			if db.First(&u, callerID).Error == nil && u.OrgID != nil {
				callerOrgID = *u.OrgID
			}
		}

		var members []users.User
		if callerOrgID == 0 {
			// Fallback to default organization (org_id = 1) or all members
			db.Preload("Role").Where("org_id = 1 OR org_id IS NOT NULL").Find(&members)
		} else {
			db.Preload("Role").Where("org_id = ?", callerOrgID).Find(&members)
		}

		type memberView struct {
			ID       uint   `json:"id"`
			Email    string `json:"email"`
			Username string `json:"username"` // @mention handle
			Role     string `json:"role"`
			TeamID   *uint  `json:"team_id"`
		}
		var result []memberView
		for _, m := range members {
			roleName := "employee"
			if m.Role.Name != "" {
				roleName = string(m.Role.Name)
			}
			if roleFilter != "" && roleName != roleFilter {
				continue
			}
			result = append(result, memberView{
				ID:       m.ID,
				Email:    m.Email,
				Username: m.Username,
				Role:     roleName,
				TeamID:   m.TeamID,
			})
		}

		return c.JSON(fiber.Map{
			"org_id":  callerOrgID,
			"members": result,
			"count":   len(result),
		})
	}
}

// unused import guard
var _ = utils.GenerateToken
