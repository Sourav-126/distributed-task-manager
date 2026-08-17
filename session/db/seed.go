package db

import (
	"fmt"
	"log"
	"strings"

	"session/models/orgs"
	"session/models/roles"
	"session/models/users"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// SeedRoles inserts the default platform-level roles if they don't exist.
func SeedRoles(db *gorm.DB) {
	defaultRoles := []roles.RoleName{
		roles.RoleSuperAdmin,
		roles.RoleOrgAdmin,
		roles.RoleManager,
		roles.RoleTeamLead,
		roles.RoleEmployee,
		roles.RoleGuest,
	}

	for _, r := range defaultRoles {
		var existing roles.Role
		result := db.Where("name = ? AND org_id IS NULL", r).First(&existing)
		if result.Error == gorm.ErrRecordNotFound || existing.ID == 0 {
			role := roles.Role{Name: r}
			if err := db.Create(&role).Error; err != nil {
				log.Printf("Failed to seed role %s: %v", r, err)
			} else {
				fmt.Printf("✅ Seeded role: %s (id=%d)\n", r, role.ID)
			}
		} else {
			fmt.Printf("ℹ️  Role already exists: %s (id=%d)\n", r, existing.ID)
		}
	}
}

// SeedDefaultUsers creates default users for all roles and attaches them to Default Org (id=1).
func SeedDefaultUsers(db *gorm.DB) {
	// 1. Ensure Default Organization exists (id=1)
	var defaultOrg orgs.Organization
	if err := db.First(&defaultOrg, 1).Error; err != nil {
		defaultOrg = orgs.Organization{
			Name: "Default Organization",
		}
		db.Create(&defaultOrg)
		fmt.Printf("✅ Seeded default organization: %s (id=%d)\n", defaultOrg.Name, defaultOrg.ID)
	}

	// 2. Seed default users for each role and attach to defaultOrg
	seedOrgUser(db, "superadmin@gmail.com", "future@123", roles.RoleSuperAdmin, &defaultOrg.ID)
	seedOrgUser(db, "orgadmin@gmail.com", "future@123", roles.RoleOrgAdmin, &defaultOrg.ID)
	seedOrgUser(db, "manager@gmail.com", "future@123", roles.RoleManager, &defaultOrg.ID)
	seedOrgUser(db, "teamlead@gmail.com", "future@123", roles.RoleTeamLead, &defaultOrg.ID)
	seedOrgUser(db, "employee@gmail.com", "future@123", roles.RoleEmployee, &defaultOrg.ID)
	seedOrgUser(db, "guest@gmail.com", "future@123", roles.RoleGuest, &defaultOrg.ID)
}

func seedOrgUser(db *gorm.DB, email, password string, roleName roles.RoleName, orgID *uint) {
	fmt.Printf("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
	fmt.Printf("📋 Seeded user  : %s\n", email)
	fmt.Printf("🔑 Password     : %s\n", password)
	fmt.Printf("👤 Role         : %s\n", roleName)
	fmt.Printf("🏢 Org ID       : %v\n", *orgID)
	fmt.Printf("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

	var role roles.Role
	if err := db.Where("name = ? AND org_id IS NULL", roleName).First(&role).Error; err != nil {
		log.Printf("❌ Role '%s' not found — skipping %s", roleName, email)
		return
	}

	// Extract username from email prefix
	usernamePrefix := email
	if idx := strings.Index(email, "@"); idx != -1 {
		usernamePrefix = email[:idx]
	}

	var existing users.User
	if db.Where("email = ?", email).First(&existing).Error == nil {
		// Update org_id and role_id if missing, backfill username if empty
		updates := map[string]interface{}{
			"org_id":  orgID,
			"role_id": role.ID,
		}
		if existing.Username == "" {
			updates["username"] = usernamePrefix
		}
		db.Model(&existing).Updates(updates)
		fmt.Printf("ℹ️  Already exists (id=%d) — updated OrgID/Username\n\n", existing.ID)
		return
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("❌ Failed to hash password: %v", err)
		return
	}

	user := users.User{
		Email:     email,
		Username:  usernamePrefix,
		Password:  string(hashed),
		SessionID: uuid.New().String(),
		OrgID:     orgID,
		RoleID:    &role.ID,
	}

	if err := db.Create(&user).Error; err != nil {
		log.Printf("❌ Failed to create seeded user %s: %v", email, err)
	} else {
		fmt.Printf("✅ Created: %s (id=%d, username=%s)\n\n", email, user.ID, usernamePrefix)
	}
}
