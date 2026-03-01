package services

import "errors"

var (
	ErrNotFound         = errors.New("not found")
	ErrUnauthorized     = errors.New("unauthorized")
	ErrValidation       = errors.New("validation error")
	ErrAIUnavailable    = errors.New("ai unavailable")
	ErrEmailNotVerified = errors.New("email not verified")
	ErrEmailConflict    = errors.New("email already in use")
)
