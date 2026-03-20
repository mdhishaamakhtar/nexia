package utils

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
)

// GenerateCSRFToken returns a cryptographically random 32-byte hex string
// used as the double-submit CSRF token.
func GenerateCSRFToken() (string, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", fmt.Errorf("generate csrf token: %w", err)
	}
	return hex.EncodeToString(raw), nil
}
