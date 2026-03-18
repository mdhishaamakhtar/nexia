package main

import (
	"nexia-backend/internal/app"
)

// @title Nexia Backend API
// @version 1.0
// @description REST API for Digital Slambook
// @BasePath /api/v1
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
func main() {
	app.New().Run()
}
