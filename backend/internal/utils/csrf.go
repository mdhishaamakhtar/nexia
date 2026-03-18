package utils

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
)

func GenerateCSRFToken() (string, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", fmt.Errorf("generate csrf token: %w", err)
	}
	return hex.EncodeToString(raw), nil
}
