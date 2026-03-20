package utils

import (
	"errors"
	"time"

	"nexia-backend/internal/config"

	"github.com/golang-jwt/jwt/v5"
)

// Claims is the JWT payload. It embeds the standard registered claims and adds
// a Nexia-specific UserID field.
type Claims struct {
	UserID uint64 `json:"user_id"`
	jwt.RegisteredClaims
}

// GenerateToken signs a new HS256 JWT for the given user. Falls back to a 24-hour
// expiry if JWTExpiryMinutes is not configured.
func GenerateToken(userID uint64, cfg *config.Config) (string, error) {
	expiryMinutes := cfg.Server.JWTExpiryMinutes
	if expiryMinutes <= 0 {
		expiryMinutes = 24 * 60
	}

	now := time.Now()
	claims := &Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Duration(expiryMinutes) * time.Minute)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.Server.JWTSecret))
}

// ValidateToken parses and verifies a JWT string, returning the embedded Claims on success.
func ValidateToken(tokenString string, cfg *config.Config) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (any, error) {
		return []byte(cfg.Server.JWTSecret), nil
	})

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}
