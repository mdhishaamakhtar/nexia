package routes

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"nexia-backend/internal/config"
	"nexia-backend/internal/controllers"

	"go.uber.org/zap"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestOptionsHelpers(t *testing.T) {
	var opts options
	logger := zap.NewNop()
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}

	WithLogger(logger)(&opts)
	WithDB(db)(&opts)

	if opts.logger != logger {
		t.Fatal("expected logger to be assigned")
	}
	if opts.db != db {
		t.Fatal("expected db to be assigned")
	}
}

func TestSetupRouter(t *testing.T) {
	cfg := &config.Config{
		Server: config.ServerConfig{
			Mode:        "test",
			CORSOrigins: []string{"http://localhost:3000"},
		},
	}

	t.Run("panics without logger", func(t *testing.T) {
		defer func() {
			if recover() == nil {
				t.Fatal("expected panic")
			}
		}()
		SetupRouter(&controllers.ProfileController{}, &controllers.AuthController{}, &controllers.ChatController{}, cfg)
	})

	t.Run("registers routes and readiness succeeds", func(t *testing.T) {
		db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
		if err != nil {
			t.Fatalf("open sqlite: %v", err)
		}

		router := SetupRouter(
			&controllers.ProfileController{},
			&controllers.AuthController{},
			&controllers.ChatController{},
			cfg,
			WithLogger(zap.NewNop()),
			WithDB(db),
		)

		seen := map[string]bool{}
		for _, route := range router.Routes() {
			seen[route.Method+" "+route.Path] = true
		}
		for _, want := range []string{
			"GET /api/v1/healthz",
			"GET /api/v1/readyz",
			"POST /api/v1/auth/signup",
			"POST /api/v1/auth/login",
			"GET /api/v1/auth/verify-email",
			"GET /api/v1/auth/me",
			"POST /api/v1/auth/logout",
			"POST /api/v1/auth/forgot-password",
			"POST /api/v1/auth/reset-password",
			"POST /api/v1/chat",
			"POST /api/v1/profiles",
			"GET /api/v1/profiles",
			"GET /api/v1/profiles/:id",
			"PUT /api/v1/profiles/:id",
			"DELETE /api/v1/profiles/:id",
			"GET /api/v1/swagger/*any",
		} {
			if !seen[want] {
				t.Fatalf("missing route %s", want)
			}
		}

		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/api/v1/readyz", nil)
		router.ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Fatalf("expected 200 got %d", w.Code)
		}
	})

	t.Run("readiness fails when database is closed", func(t *testing.T) {
		db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
		if err != nil {
			t.Fatalf("open sqlite: %v", err)
		}
		sqlDB, err := db.DB()
		if err != nil {
			t.Fatalf("get sql db: %v", err)
		}
		if err := sqlDB.Close(); err != nil {
			t.Fatalf("close sql db: %v", err)
		}

		router := SetupRouter(
			&controllers.ProfileController{},
			&controllers.AuthController{},
			&controllers.ChatController{},
			cfg,
			WithLogger(zap.NewNop()),
			WithDB(db),
		)

		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/api/v1/readyz", nil)
		router.ServeHTTP(w, req)
		if w.Code != http.StatusServiceUnavailable {
			t.Fatalf("expected 503 got %d", w.Code)
		}
	})
}
