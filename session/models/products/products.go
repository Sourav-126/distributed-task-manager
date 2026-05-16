package products

import "gorm.io/gorm"

type Products struct {
	gorm.Model
	Name  string
	Price string
}
