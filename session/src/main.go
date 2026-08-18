package main

import (
	"fmt"
	"log"
	"time"
	dbpkg "session/db"
	"session/handlers"
	client "session/handlers"
	"session/middleware"
	notifmodels "session/models/notifications"
	"session/models/orgs"
	"session/models/products"
	"session/models/roles"
	"session/models/tasks"
	"session/models/teams"
	"session/models/users"
	"session/utils"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/joho/godotenv"
	"github.com/sirupsen/logrus"
)

func main() {
	// Load .env file — try current dir first, then one level up (session/src -> session/)
	if err := godotenv.Load(); err != nil {
		if err2 := godotenv.Load("../.env"); err2 != nil {
			logrus.Warn("No .env file found, relying on system environment variables")
		}
	}

	logrus.SetFormatter(&logrus.TextFormatter{
		FullTimestamp: true,
	})

	app := fiber.New()

	app.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "https://*.loca.lt", "http://*.loca.lt", "https://*.pinggy.link", "http://*.pinggy.link"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowCredentials: true,
	}))

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
	DB := dbpkg.Connect()
	redis := utils.ConnectRedis()

	if redis != nil {
		fmt.Println("Redis connection established")
	} else {
		fmt.Println("Running without Redis (session validation will be skipped)")
	}

	// 2. Initialize gRPC Client (with DB reference for notification persistence)
	grpcClient, err := client.InitServiceClient("localhost:50051", DB)
	if err != nil {
		log.Fatalf("Failed to connect to gRPC Service: %v", err)
	}
	fmt.Println("connected to the microservice")

	// 3. Database Migrations — including new RBAC + Team + TaskComment + Notification models
	DB.AutoMigrate(
		&roles.Role{},
		&orgs.Organization{},
		&teams.Team{},
		&teams.TeamManager{}, // join table: team ↔ manager (many-to-many)
		&users.User{},
		&products.Products{},
		&tasks.TaskComment{},
		&notifmodels.Notification{}, // notification inbox
	)

	// Drop legacy manager_id column from teams table if it exists
	DB.Exec("ALTER TABLE teams DROP COLUMN IF EXISTS manager_id;")

	// 4. Seed default roles and super admin on every startup (idempotent)
	dbpkg.SeedRoles(DB)
	dbpkg.SeedDefaultUsers(DB)

	// 4. Public Routes (no auth)
	app.Get("/health", handlers.Health())
	app.Post("/signup", handlers.Signup(DB, redis))
	app.Post("/signin", handlers.Signin(DB, redis))
	app.Get("/ws/office", handlers.HandleSpatialWS(DB))

	// 5. Authenticated routes
	authGroup := app.Group("/api", middleware.Protected(redis))

	// --- User routes ---
	authGroup.Get("/profile", handlers.GetProfile(DB))
	authGroup.Put("/update-password", handlers.UpdatePassword(DB, redis))

	// --- Org routes ---
	authGroup.Post("/orgs", middleware.RequireRole("super_admin"), handlers.CreateOrg(DB))
	authGroup.Get("/orgs/members", middleware.RequireRole("employee", "team_lead", "manager", "org_admin", "super_admin"), handlers.GetOrgMembers(DB))
	authGroup.Post("/orgs/invite", middleware.RequireRole("org_admin", "super_admin"), handlers.InviteUser(DB, redis))
	authGroup.Put("/orgs/role", middleware.RequireRole("org_admin", "super_admin"), handlers.ChangeRole(DB))
	authGroup.Delete("/orgs/users/:id", middleware.RequireRole("org_admin", "super_admin"), handlers.RemoveUser(DB, redis))

	// --- Team routes ---
	// org_admin creates a team and assigns a manager + team_lead
	authGroup.Post("/teams", middleware.RequireRole("org_admin", "super_admin"), handlers.CreateTeam(DB))
	// org_admin/manager lists all teams in the org
	authGroup.Get("/teams", middleware.RequireRole("org_admin", "manager", "team_lead", "super_admin"), handlers.ListOrgTeams(DB))
	// Any authenticated user sees their own team
	authGroup.Get("/teams/me", handlers.GetMyTeam(DB))
	// org_admin reassigns a team's team_lead
	authGroup.Put("/teams/:id/team_lead", middleware.RequireRole("org_admin", "super_admin"), handlers.AssignTeamLead(DB))
	// org_admin / manager assigns an employee to a team
	authGroup.Put("/teams/:id/members", middleware.RequireRole("org_admin", "manager", "team_lead", "super_admin"), handlers.AssignMemberToTeam(DB))
	// org_admin adds a manager to a team
	authGroup.Post("/teams/:id/managers", middleware.RequireRole("org_admin", "super_admin"), handlers.AddManagerToTeam(DB))
	// org_admin removes a manager from a team
	authGroup.Delete("/teams/:id/managers/:manager_id", middleware.RequireRole("org_admin", "super_admin"), handlers.RemoveManagerFromTeam(DB))
	// team_lead (and above) invites an employee to their own team
	authGroup.Post("/teams/invite", middleware.RequireRole("team_lead", "manager", "org_admin"), handlers.InviteToTeam(DB, redis))
	// team_lead (and above) removes an employee from their team
	authGroup.Delete("/teams/members/:user_id", middleware.RequireRole("team_lead", "manager", "org_admin"), handlers.RemoveFromTeam(DB, redis))

	// --- Task routes (via gRPC to task-service) ---
	taskGroup := authGroup.Group("/tasks")
	// Create: team_lead and above
	taskGroup.Post("/", middleware.RequireRole("team_lead", "manager", "org_admin", "super_admin"), handlers.CreateTask(grpcClient))
	// Static routes MUST be registered before parameterized /:id route
	taskGroup.Get("/me", middleware.RequireRole("employee", "team_lead", "manager", "org_admin", "super_admin"), handlers.ListMyTasks(grpcClient))
	taskGroup.Get("/team", middleware.RequireRole("employee", "team_lead", "manager", "org_admin", "super_admin"), handlers.ListTeamTasks(grpcClient))
	// Get by ID: all authenticated users — employee access is filtered server-side
	taskGroup.Get("/:id", middleware.RequireRole("employee", "team_lead", "manager", "org_admin", "super_admin"), handlers.GetTaskById(grpcClient))
	// Update: employee and above (role permissions and task bounds checked server-side)
	taskGroup.Put("/:id", middleware.RequireRole("employee", "team_lead", "manager", "org_admin", "super_admin"), handlers.UpdateTask(grpcClient))
	// --- Task Comments & Threaded Discussion routes ---
	authGroup.Get("/tasks/:id/comments", handlers.GetTaskComments(DB))
	authGroup.Post("/tasks/:id/comments", handlers.CreateComment(DB, grpcClient))
	// --- Cloudinary Signed Upload Signature route ---
	authGroup.Post("/cloudinary/signature", handlers.GetCloudinarySignature())

	// --- Notification routes ---
	authGroup.Get("/notifications", handlers.GetMyNotifications(DB))
	authGroup.Post("/notifications/read", handlers.MarkNotificationsRead(DB))
	authGroup.Get("/notifications/stream", handlers.SSENotificationStream(DB))

	log.Fatal(app.Listen(":1443"))
}

