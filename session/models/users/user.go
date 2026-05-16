package users

import "gorm.io/gorm"

type User struct {
	gorm.Model
	Email        string `gorm:"uniqueIndex;not null"`
	Password     string `gorm:"size:255;not null"`
	SessionID    string `gorm:"size:255;not null"`
	Access_Token string
}

type SigninRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}
