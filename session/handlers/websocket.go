package handlers

import (
	"encoding/json"
	"log"
	"os"
	"session/models/users"
	"session/utils"
	"strings"
	"time"

	"github.com/fasthttp/websocket"
	"github.com/gofiber/fiber/v3"
	"github.com/golang-jwt/jwt/v5"
	"github.com/valyala/fasthttp"
	"gorm.io/gorm"
)

var upgrader = websocket.FastHTTPUpgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(ctx *fasthttp.RequestCtx) bool {
		// Allow local development and tunnel origins
		origin := string(ctx.Request.Header.Peek("Origin"))
		if origin == "http://localhost:3000" || origin == "http://127.0.0.1:3000" || origin == "" {
			return true
		}
		return strings.HasSuffix(origin, ".loca.lt") ||
			strings.HasSuffix(origin, ".trycloudflare.com") ||
			strings.HasSuffix(origin, ".pinggy.link") ||
			strings.HasSuffix(origin, ".pinggy.io")
	},
}

// HandleSpatialWS handles JWT authorization and upgrades the fiber request to WebSocket using fasthttp upgrader
func HandleSpatialWS(db *gorm.DB) fiber.Handler {
	return func(c fiber.Ctx) error {
		// 1. Validate query token
		tokenString := c.Query("token")
		if tokenString == "" {
			return c.Status(401).JSON(fiber.Map{"error": "Missing token parameter"})
		}

		token, err := jwt.ParseWithClaims(tokenString, &utils.CustomClaims{}, func(token *jwt.Token) (interface{}, error) {
			secret := os.Getenv("JWT_SECRET")
			if secret == "" {
				secret = "change_me_in_production_use_a_long_random_string"
			}
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			return c.Status(401).JSON(fiber.Map{"error": "Invalid or expired token"})
		}

		claims, ok := token.Claims.(*utils.CustomClaims)
		if !ok {
			return c.Status(401).JSON(fiber.Map{"error": "Invalid token claims"})
		}

		userID := claims.UserID

		// Upgrade connection inside context
		// FastHTTPUpgrader.Upgrade hijacks the fasthttp context connection
		err = upgrader.Upgrade(c.RequestCtx(), func(conn *websocket.Conn) {
			// Retrieve detailed user profile from db
			var user users.User
			if err := db.Preload("Role").First(&user, userID).Error; err != nil {
				conn.Close()
				return
			}

			// Build user display name (prefer username, fallback to email prefix)
			displayName := user.Username
			if displayName == "" {
				displayName = strings.Split(user.Email, "@")[0]
			}

			roleName := "employee"
			if user.Role.Name != "" {
				roleName = string(user.Role.Name)
			}

			// Determine dynamic aura based on actual task count in Postgres
			auraColor := utils.DetermineUserAura(db, user.ID)

			client := &utils.SpatialClient{
				Hub:  utils.GlobalSpatialHub,
				Conn: conn,
				Send: make(chan []byte, 256),
				State: utils.PlayerState{
					ID:        user.ID,
					Name:      displayName,
					Role:      roleName,
					X:         800.0, // default spawn x
					Y:         350.0, // default spawn y
					Direction: "down",
					IsMoving:  false,
					Aura:      auraColor,
				},
			}

			// Register client in the Hub
			client.Hub.Register(client)

			// Start read and write loops
			go clientWriteLoop(client)
			clientReadLoop(client)
		})

		if err != nil {
			log.Printf("❌ Failed to upgrade WS connection: %v", err)
			return c.Status(500).SendString("Upgrade failed")
		}

		return nil
	}
}

// clientWriteLoop writes frames from client.Send channel directly to the socket connection
func clientWriteLoop(c *utils.SpatialClient) {
	ticker := time.NewTicker(5 * time.Second)
	defer func() {
		ticker.Stop()
		if r := recover(); r != nil {
			log.Printf("⚠️ Recovered from write loop panic: %v", r)
		}
		c.Conn.Close()
	}()

	for {
		select {
		case msg, ok := <-c.Send:
			if !ok {
				// Hub closed the channel, write close message safely
				_ = c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			_ = c.Conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
			if err := c.Conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.Conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// clientReadLoop processes incoming messages (PLAYER_MOVE) from the socket connection
func clientReadLoop(c *utils.SpatialClient) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("⚠️ Recovered from read loop panic: %v", r)
		}
		c.Hub.Unregister(c)
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(524288) // 512KB limit to accommodate large WebRTC Video SDP offer/answer signaling packets
	_ = c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.Conn.SetPongHandler(func(string) error {
		_ = c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("⚠️ Connection closed unexpectedly for user %d: %v", c.State.ID, err)
			}
			break
		}

		// Reset read deadline on every received frame so the socket never times out while active
		_ = c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))

		// Parse event packet
		var req struct {
			Event string          `json:"event"`
			Data  json.RawMessage `json:"data"`
		}

		if err := json.Unmarshal(message, &req); err != nil {
			continue
		}

		if req.Event == "PLAYER_MOVE" {
			var moveData struct {
				X        float64 `json:"x"`
				Y        float64 `json:"y"`
				Dir      string  `json:"direction"`
				IsMoving bool    `json:"is_moving"`
			}
			if err := json.Unmarshal(req.Data, &moveData); err == nil {
				c.UpdatePlayerPosition(moveData.X, moveData.Y, moveData.Dir, moveData.IsMoving)
			}
		} else if req.Event == "CALL_USER" ||
			req.Event == "CALL_ACCEPT" ||
			req.Event == "CALL_REJECT" ||
			req.Event == "CALL_END" ||
			req.Event == "WEBRTC_OFFER" ||
			req.Event == "WEBRTC_ANSWER" ||
			req.Event == "WEBRTC_ICE" ||
			req.Event == "PLAYER_WAVE" ||
			req.Event == "PLAYER_WAVE_BACK" {

			var signalData struct {
				ToUserID uint            `json:"to_user_id"`
				Payload  json.RawMessage `json:"payload,omitempty"`
			}
			if err := json.Unmarshal(req.Data, &signalData); err == nil {
				log.Printf("[Signaling] Received %s from User %d to User %d", req.Event, c.State.ID, signalData.ToUserID)
				// Forward to destination user, adding caller ID
				forwardPayload := struct {
					Event string `json:"event"`
					Data  struct {
						FromUserID uint            `json:"from_user_id"`
						Payload    json.RawMessage `json:"payload,omitempty"`
					} `json:"data"`
				}{
					Event: req.Event,
				}
				forwardPayload.Data.FromUserID = c.State.ID
				forwardPayload.Data.Payload = signalData.Payload

				forwardData, err := json.Marshal(forwardPayload)
				if err == nil {
					log.Printf("[Signaling] Successfully marshalled, sending %s to User %d", req.Event, signalData.ToUserID)
					c.Hub.SendToUser(signalData.ToUserID, forwardData)
				} else {
					log.Printf("[Signaling Error] Failed to marshal signal payload for event %s: %v", req.Event, err)
				}
			} else {
				log.Printf("[Signaling Error] Failed to unmarshal signal data for event %s: %v", req.Event, err)
			}
		}
	}
}
