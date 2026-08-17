package utils

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/fasthttp/websocket"
	"gorm.io/gorm"
)

type PlayerState struct {
	ID        uint    `json:"id"`
	Name      string  `json:"name"`
	Role      string  `json:"role"`
	X         float64 `json:"x"`
	Y         float64 `json:"y"`
	Direction string  `json:"direction"`
	IsMoving  bool    `json:"is_moving"`
	Aura      string  `json:"aura"`
}

type SpatialClient struct {
	Hub   *SpatialHub
	Conn  *websocket.Conn
	Send  chan []byte
	State PlayerState
}

type SpatialHub struct {
	clients    map[*SpatialClient]bool
	register   chan *SpatialClient
	unregister chan *SpatialClient
	dirty      bool
	mu         sync.RWMutex
}

var GlobalSpatialHub = NewSpatialHub()

func NewSpatialHub() *SpatialHub {
	h := &SpatialHub{
		clients:    make(map[*SpatialClient]bool),
		register:   make(chan *SpatialClient),
		unregister: make(chan *SpatialClient),
		dirty:      true,
	}
	go h.run()
	return h
}

// DetermineUserAura queries the GORM database to fetch active tasks and calculate Aura color
func DetermineUserAura(db *gorm.DB, userID uint) string {
	var count int64
	// Search directly in shared postgres task-service DB task_models table
	err := db.Table("task_models").Where("assigned_to = ? AND status != ?", userID, "done").Count(&count).Error
	if err != nil {
		return "green" // fallback
	}

	if count >= 3 {
		return "red" // overloaded / burnout risk
	} else if count == 2 {
		return "amber" // busy
	}
	return "green" // healthy
}

func (h *SpatialHub) Register(client *SpatialClient) {
	h.register <- client
}

func (h *SpatialHub) Unregister(client *SpatialClient) {
	h.unregister <- client
}

// SendToUser sends a raw JSON byte slice to a specific client by User ID
func (h *SpatialHub) SendToUser(userID uint, message []byte) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for client := range h.clients {
		if client.State.ID == userID {
			select {
			case client.Send <- message:
				return true
			default:
				return false
			}
		}
	}
	return false
}

func (h *SpatialHub) run() {
	ticker := time.NewTicker(50 * time.Millisecond) // 20 FPS broadcast loop
	defer ticker.Stop()

	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.dirty = true // Mark hub dirty on new player join
			h.mu.Unlock()
			log.Printf("👥 Player joined workspace: %s (ID: %d)", client.State.Name, client.State.ID)

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.Send)
				h.dirty = true // Mark hub dirty on player leave
				log.Printf("🚶 Player left workspace: %s (ID: %d)", client.State.Name, client.State.ID)
			}
			h.mu.Unlock()

		case <-ticker.C:
			h.mu.Lock()
			if len(h.clients) == 0 {
				h.mu.Unlock()
				continue
			}

			// Check if any player is actively moving
			anyMoving := false
			players := make([]PlayerState, 0, len(h.clients))
			for client := range h.clients {
				players = append(players, client.State)
				if client.State.IsMoving {
					anyMoving = true
				}
			}

			// Event-driven broadcast: ONLY broadcast if someone is moving OR state changed (dirty)
			if !anyMoving && !h.dirty {
				h.mu.Unlock()
				continue
			}

			// Reset dirty flag when standing still
			if !anyMoving {
				h.dirty = false
			}
			h.mu.Unlock()

			payload := struct {
				Event string `json:"event"`
				Data  struct {
					Timestamp int64         `json:"timestamp"`
					Players   []PlayerState `json:"players"`
				} `json:"data"`
			}{
				Event: "WORLD_TICK",
			}
			payload.Data.Timestamp = time.Now().Unix()
			payload.Data.Players = players

			data, err := json.Marshal(payload)
			if err != nil {
				continue
			}

			// Broadcast frame to all active connections
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.Send <- data:
				default:
					// drop buffer for slow connections
				}
			}
			h.mu.RUnlock()
		}
	}
}

// UpdatePlayerPosition updates the client's coordinates thread-safely
func (c *SpatialClient) UpdatePlayerPosition(x, y float64, dir string, isMoving bool) {
	c.Hub.mu.Lock()
	defer c.Hub.mu.Unlock()
	c.State.X = x
	c.State.Y = y
	c.State.Direction = dir
	c.State.IsMoving = isMoving
	c.Hub.dirty = true // Mark hub dirty to trigger real-time position sync broadcast!
}
