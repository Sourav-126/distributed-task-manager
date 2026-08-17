package handlers

import (
	"fmt"
	"time"

	"session/models/roles"
	"session/models/teams"
	"session/models/users"
	"session/utils"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// CreateTeam — org_admin creates a team and assigns a team_lead to it
// POST /api/teams
// Body: { "name": "Backend Team", "team_lead_id": 5, "manager_id": 4 }
func CreateTeam(db *gorm.DB) fiber.Handler {
	return func(c fiber.Ctx) error {
		callerOrgID := c.Locals("org_id").(uint)
		if callerOrgID == 0 {
			callerOrgID = 1
		}

		var req struct {
			Name       string `json:"name"`
			TeamLeadID uint   `json:"team_lead_id"`
			ManagerID  uint   `json:"manager_id"` // Optional: assign a manager immediately
		}
		if err := c.Bind().JSON(&req); err != nil || req.Name == "" || req.TeamLeadID == 0 {
			return c.Status(400).JSON(fiber.Map{"error": "name and team_lead_id are required"})
		}

		// Verify team_lead user exists
		var teamLead users.User
		if err := db.Preload("Role").Where("id = ?", req.TeamLeadID).First(&teamLead).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Team lead user not found"})
		}

		team := teams.Team{
			Name:       req.Name,
			OrgID:      callerOrgID,
			TeamLeadID: &req.TeamLeadID,
		}
		if err := db.Create(&team).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to create team"})
		}

		// Assign the team_lead to this team
		db.Model(&teamLead).Update("team_id", team.ID)

		// Assign manager if provided
		if req.ManagerID != 0 {
			var manager users.User
			if err := db.Where("id = ?", req.ManagerID).First(&manager).Error; err == nil {
				db.Where(teams.TeamManager{TeamID: team.ID, ManagerID: req.ManagerID}).FirstOrCreate(&teams.TeamManager{TeamID: team.ID, ManagerID: req.ManagerID})
			}
		}

		return c.Status(201).JSON(fiber.Map{
			"message":      "Team created",
			"team_id":      team.ID,
			"team_name":    team.Name,
			"team_lead_id": team.TeamLeadID,
		})
	}
}

// GetMyTeam — any user sees their own team info
// GET /api/teams/me
func GetMyTeam(db *gorm.DB) fiber.Handler {
	return func(c fiber.Ctx) error {
		userID := c.Locals("user_id").(uint)

		var user users.User
		if err := db.First(&user, userID).Error; err != nil || user.TeamID == nil {
			return c.Status(404).JSON(fiber.Map{"error": "You are not assigned to any team"})
		}

		var team teams.Team
		db.First(&team, *user.TeamID)

		var members []users.User
		db.Preload("Role").Where("team_id = ?", team.ID).Find(&members)

		type memberView struct {
			ID    uint   `json:"id"`
			Email string `json:"email"`
			Role  string `json:"role"`
		}
		var result []memberView
		for _, m := range members {
			result = append(result, memberView{ID: m.ID, Email: m.Email, Role: string(m.Role.Name)})
		}

		return c.JSON(fiber.Map{
			"team_id":      team.ID,
			"team_name":    team.Name,
			"team_lead_id": team.TeamLeadID,
			"members":      result,
			"count":        len(result),
		})
	}
}

// ListOrgTeams — org_admin/manager lists all teams in the org with full details (lead, managers, members)
// GET /api/teams
func ListOrgTeams(db *gorm.DB) fiber.Handler {
	return func(c fiber.Ctx) error {
		callerID := c.Locals("user_id").(uint)
		callerOrgID := c.Locals("org_id").(uint)

		if callerOrgID == 0 {
			var u users.User
			if db.First(&u, callerID).Error == nil && u.OrgID != nil {
				callerOrgID = *u.OrgID
			}
		}

		var orgTeams []teams.Team
		if callerOrgID == 0 {
			db.Where("org_id = 1 OR org_id IS NOT NULL").Find(&orgTeams)
		} else {
			db.Where("org_id = ?", callerOrgID).Find(&orgTeams)
		}

		type userSimple struct {
			ID    uint   `json:"id"`
			Email string `json:"email"`
			Role  string `json:"role,omitempty"`
		}

		type teamView struct {
			ID         uint         `json:"id"`
			Name       string       `json:"name"`
			TeamLeadID *uint        `json:"team_lead_id"`
			TeamLead   *userSimple  `json:"team_lead,omitempty"`
			Managers   []userSimple `json:"managers"`
			Members    []userSimple `json:"members"`
			Count      int          `json:"count"`
		}

		var result []teamView
		for _, t := range orgTeams {
			tv := teamView{
				ID:         t.ID,
				Name:       t.Name,
				TeamLeadID: t.TeamLeadID,
				Managers:   []userSimple{},
				Members:    []userSimple{},
			}

			// Load team lead info
			if t.TeamLeadID != nil {
				var lead users.User
				if err := db.Preload("Role").First(&lead, *t.TeamLeadID).Error; err == nil {
					roleName := ""
					if lead.Role.Name != "" {
						roleName = string(lead.Role.Name)
					}
					tv.TeamLead = &userSimple{ID: lead.ID, Email: lead.Email, Role: roleName}
				}
			}

			// Load managers info from TeamManager join table
			var managerUsers []users.User
			db.Preload("Role").
				Joins("JOIN team_managers ON team_managers.manager_id = users.id").
				Where("team_managers.team_id = ?", t.ID).
				Find(&managerUsers)

			for _, m := range managerUsers {
				rName := "manager"
				if m.Role.Name != "" {
					rName = string(m.Role.Name)
				}
				tv.Managers = append(tv.Managers, userSimple{ID: m.ID, Email: m.Email, Role: rName})
			}

			// Load members info
			var memberUsers []users.User
			db.Preload("Role").Where("team_id = ?", t.ID).Find(&memberUsers)
			for _, m := range memberUsers {
				rName := ""
				if m.Role.Name != "" {
					rName = string(m.Role.Name)
				}
				tv.Members = append(tv.Members, userSimple{ID: m.ID, Email: m.Email, Role: rName})
			}
			tv.Count = len(tv.Members)

			result = append(result, tv)
		}

		return c.JSON(fiber.Map{
			"org_id": callerOrgID,
			"teams":  result,
		})
	}
}

// InviteToTeam — manager invites an employee to their own team
// POST /api/teams/invite
// Body: { "email": "dev@example.com", "password": "pass123" }
func InviteToTeam(db *gorm.DB, rdb *redis.Client) fiber.Handler {
	return func(c fiber.Ctx) error {
		callerID := c.Locals("user_id").(uint)
		callerOrgID := c.Locals("org_id").(uint)

		// Find the manager/lead and confirm they have a team
		var manager users.User
		if err := db.First(&manager, callerID).Error; err != nil || manager.TeamID == nil {
			return c.Status(400).JSON(fiber.Map{"error": "You are not assigned to a team. Ask org_admin to assign you first."})
		}

		var req struct {
			Email    string `json:"email"`
			Password string `json:"password"`
		}
		if err := c.Bind().JSON(&req); err != nil || req.Email == "" {
			return c.Status(400).JSON(fiber.Map{"error": "email and password are required"})
		}

		// Check user doesn't already exist
		var existing users.User
		if db.Where("email = ?", req.Email).First(&existing).Error == nil {
			return c.Status(400).JSON(fiber.Map{"error": "User with this email already exists"})
		}

		// Find or create the employee role
		var employeeRole roles.Role
		db.Where("name = ? AND org_id IS NULL", roles.RoleEmployee).First(&employeeRole)
		if employeeRole.ID == 0 {
			employeeRole = roles.Role{Name: roles.RoleEmployee}
			db.Create(&employeeRole)
		}

		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		sessionID := uuid.New().String()

		newUser := users.User{
			Email:     req.Email,
			Password:  string(hashedPassword),
			SessionID: sessionID,
			OrgID:     &callerOrgID,
			RoleID:    &employeeRole.ID,
			TeamID:    manager.TeamID, // Assigned to the manager's team
		}

		if err := db.Create(&newUser).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Could not create user"})
		}

		redisKey := fmt.Sprintf("user_session:%d", newUser.ID)
		rdb.Set(c.Context(), redisKey, sessionID, 24*time.Hour)

		return c.Status(201).JSON(fiber.Map{
			"message": "Employee invited to your team",
			"user_id": newUser.ID,
			"email":   newUser.Email,
			"team_id": manager.TeamID,
			"role":    string(roles.RoleEmployee),
		})
	}
}

// RemoveFromTeam — manager removes an employee from their team
// DELETE /api/teams/members/:user_id
func RemoveFromTeam(db *gorm.DB, rdb *redis.Client) fiber.Handler {
	return func(c fiber.Ctx) error {
		callerID := c.Locals("user_id").(uint)

		// Confirm the caller is a manager/lead with a team
		var manager users.User
		if err := db.First(&manager, callerID).Error; err != nil || manager.TeamID == nil {
			return c.Status(400).JSON(fiber.Map{"error": "You are not assigned to a team"})
		}

		userIDStr := c.Params("user_id")
		var targetID uint
		if userIDStr == "" {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
		}
		if n, err := fmt.Sscanf(userIDStr, "%d", &targetID); err != nil || n == 0 || targetID == 0 {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
		}

		// Confirm the target is in the team
		var target users.User
		if err := db.Where("id = ? AND team_id = ?", targetID, *manager.TeamID).First(&target).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "User not found in your team"})
		}

		if target.ID == callerID {
			return c.Status(400).JSON(fiber.Map{"error": "Cannot remove yourself from the team"})
		}

		db.Model(&target).Update("team_id", nil)

		return c.JSON(fiber.Map{
			"message": "Member removed from team",
			"user_id": targetID,
		})
	}
}

// AssignTeamLead — org_admin reassigns or changes a team's team lead
// PUT /api/teams/:id/team_lead
// Body: { "team_lead_id": 8 }
func AssignTeamLead(db *gorm.DB) fiber.Handler {
	return func(c fiber.Ctx) error {
		callerOrgID := c.Locals("org_id").(uint)

		var teamID uint
		if err := c.Bind().URI(&struct{ ID *uint `uri:"id"` }{&teamID}); err != nil || teamID == 0 {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid team ID"})
		}

		var req struct {
			TeamLeadID uint `json:"team_lead_id"`
		}
		if err := c.Bind().JSON(&req); err != nil || req.TeamLeadID == 0 {
			return c.Status(400).JSON(fiber.Map{"error": "team_lead_id is required"})
		}

		// Confirm team belongs to the org
		var team teams.Team
		if err := db.Where("id = ? AND org_id = ?", teamID, callerOrgID).First(&team).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Team not found in your organization"})
		}

		// Confirm new team lead has the team_lead role and is in the org
		var newTeamLead users.User
		if err := db.Preload("Role").Where("id = ? AND org_id = ?", req.TeamLeadID, callerOrgID).First(&newTeamLead).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Team lead not found in your org"})
		}
		if newTeamLead.Role.Name != roles.RoleTeamLead {
			return c.Status(400).JSON(fiber.Map{"error": "User does not have the team_lead role"})
		}

		// Update team team_lead_id
		db.Model(&team).Update("team_lead_id", req.TeamLeadID)
		// Assign new team lead to this team
		db.Model(&newTeamLead).Update("team_id", team.ID)

		return c.JSON(fiber.Map{
			"message":          "Team lead updated",
			"team_id":          team.ID,
			"new_team_lead_id": req.TeamLeadID,
		})
	}
}

// AssignMemberToTeam — org_admin/manager assigns an existing user to a team
// PUT /api/teams/:id/members
// Body: { "user_id": 6 }
func AssignMemberToTeam(db *gorm.DB) fiber.Handler {
	return func(c fiber.Ctx) error {
		callerOrgID := c.Locals("org_id").(uint)

		var teamID uint
		if err := c.Bind().URI(&struct{ ID *uint `uri:"id"` }{&teamID}); err != nil || teamID == 0 {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid team ID"})
		}

		var req struct {
			UserID uint `json:"user_id"`
		}
		if err := c.Bind().JSON(&req); err != nil || req.UserID == 0 {
			return c.Status(400).JSON(fiber.Map{"error": "user_id is required"})
		}

		// Confirm team belongs to caller's org
		var team teams.Team
		if err := db.Where("id = ? AND org_id = ?", teamID, callerOrgID).First(&team).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Team not found in your organization"})
		}

		// Confirm user belongs to caller's org
		var targetUser users.User
		if err := db.Where("id = ? AND org_id = ?", req.UserID, callerOrgID).First(&targetUser).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "User not found in your organization"})
		}

		db.Model(&targetUser).Update("team_id", team.ID)

		return c.JSON(fiber.Map{
			"message": "User assigned to team successfully",
			"team_id": team.ID,
			"user_id": req.UserID,
		})
	}
}

// AddManagerToTeam — org_admin adds a manager to a team
// POST /api/teams/:id/managers
// Body: { "manager_id": 4 }
func AddManagerToTeam(db *gorm.DB) fiber.Handler {
	return func(c fiber.Ctx) error {
		callerOrgID := c.Locals("org_id").(uint)

		var teamID uint
		if err := c.Bind().URI(&struct{ ID *uint `uri:"id"` }{&teamID}); err != nil || teamID == 0 {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid team ID"})
		}

		var req struct {
			ManagerID uint `json:"manager_id"`
		}
		if err := c.Bind().JSON(&req); err != nil || req.ManagerID == 0 {
			return c.Status(400).JSON(fiber.Map{"error": "manager_id is required"})
		}

		var team teams.Team
		if err := db.Where("id = ? AND org_id = ?", teamID, callerOrgID).First(&team).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Team not found in your organization"})
		}

		var manager users.User
		if err := db.Preload("Role").Where("id = ? AND org_id = ?", req.ManagerID, callerOrgID).First(&manager).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Manager not found in your organization"})
		}

		// Insert into join table if not already present
		var existing teams.TeamManager
		if db.Where("team_id = ? AND manager_id = ?", team.ID, req.ManagerID).First(&existing).Error != nil {
			db.Create(&teams.TeamManager{TeamID: team.ID, ManagerID: req.ManagerID})
		}

		return c.JSON(fiber.Map{
			"message":    "Manager assigned to team successfully",
			"team_id":    team.ID,
			"manager_id": req.ManagerID,
		})
	}
}

// RemoveManagerFromTeam — org_admin removes a manager from a team
// DELETE /api/teams/:id/managers/:manager_id
func RemoveManagerFromTeam(db *gorm.DB) fiber.Handler {
	return func(c fiber.Ctx) error {
		callerOrgID := c.Locals("org_id").(uint)

		var teamID uint
		if err := c.Bind().URI(&struct{ ID *uint `uri:"id"` }{&teamID}); err != nil || teamID == 0 {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid team ID"})
		}

		managerIDStr := c.Params("manager_id")
		var managerID uint
		if n, err := fmt.Sscanf(managerIDStr, "%d", &managerID); err != nil || n == 0 || managerID == 0 {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid manager ID"})
		}

		var team teams.Team
		if err := db.Where("id = ? AND org_id = ?", teamID, callerOrgID).First(&team).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Team not found in your organization"})
		}

		db.Where("team_id = ? AND manager_id = ?", team.ID, managerID).Delete(&teams.TeamManager{})

		return c.JSON(fiber.Map{
			"message":    "Manager removed from team",
			"team_id":    team.ID,
			"manager_id": managerID,
		})
	}
}

// unused import guard
var _ = utils.GenerateToken
