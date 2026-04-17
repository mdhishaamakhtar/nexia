package middleware_test

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"nexia-backend/internal/config"
	"nexia-backend/internal/middleware"
	"nexia-backend/internal/models"
	"nexia-backend/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

type fakeUserLookup struct {
	user *models.User
	err  error
}

func (f *fakeUserLookup) FindByID(id uint64) (*models.User, error) {
	if f.err != nil {
		return nil, f.err
	}
	if f.user == nil || f.user.ID != id {
		return nil, errors.New("not found")
	}
	return f.user, nil
}

func TestGetUserID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	c, _ := gin.CreateTestContext(httptest.NewRecorder())

	_, err := middleware.GetUserID(c)
	require.Error(t, err)

	c.Set("userID", "bad")
	_, err = middleware.GetUserID(c)
	require.Error(t, err)

	c.Set("userID", uint64(55))
	id, err := middleware.GetUserID(c)
	require.NoError(t, err)
	require.Equal(t, uint64(55), id)
}

func TestAuthMiddleware(t *testing.T) {
	cfg := &config.Config{Server: config.ServerConfig{JWTSecret: "secret", JWTExpiryMinutes: 30}}
	token, err := utils.GenerateToken(101, cfg)
	require.NoError(t, err)

	existingUser := &fakeUserLookup{user: &models.User{ID: 101}}

	mkRouter := func(ul middleware.UserLookup) *gin.Engine {
		r := gin.New()
		r.Use(middleware.AuthMiddleware(cfg, ul))
		r.GET("/protected", func(c *gin.Context) {
			id, _ := c.Get("userID")
			c.JSON(http.StatusOK, gin.H{"user_id": id})
		})
		return r
	}

	t.Run("missing token", func(t *testing.T) {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		mkRouter(existingUser).ServeHTTP(w, req)
		require.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("invalid header format", func(t *testing.T) {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "Token x")
		mkRouter(existingUser).ServeHTTP(w, req)
		require.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("valid bearer token user exists", func(t *testing.T) {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		mkRouter(existingUser).ServeHTTP(w, req)
		require.Equal(t, http.StatusOK, w.Code, w.Body.String())

		var out map[string]any
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &out))
		require.Equal(t, float64(101), out["user_id"])
	})

	t.Run("valid cookie token user exists", func(t *testing.T) {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		req.AddCookie(&http.Cookie{Name: "nexia_token", Value: token})
		mkRouter(existingUser).ServeHTTP(w, req)
		require.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("invalid token", func(t *testing.T) {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "Bearer bad-token")
		mkRouter(existingUser).ServeHTTP(w, req)
		require.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("valid token but user deleted from db", func(t *testing.T) {
		noUser := &fakeUserLookup{}
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		mkRouter(noUser).ServeHTTP(w, req)
		require.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("valid token but db lookup error", func(t *testing.T) {
		errLookup := &fakeUserLookup{err: errors.New("db connection lost")}
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		mkRouter(errLookup).ServeHTTP(w, req)
		require.Equal(t, http.StatusUnauthorized, w.Code)
	})
}
