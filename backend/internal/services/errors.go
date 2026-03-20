package services

import "errors"

// Sentinel errors returned by service methods. Controllers map these to HTTP
// status codes via respondWithServiceError — add new sentinels here rather
// than using raw errors.New at the call site.
var (
	ErrNotFound         = errors.New("not found")
	ErrUnauthorized     = errors.New("unauthorized")
	ErrAccountNotFound  = errors.New("account not found")
	ErrValidation       = errors.New("validation error")
	ErrAIUnavailable    = errors.New("ai unavailable")
	ErrEmailNotVerified = errors.New("email not verified")
	ErrEmailConflict    = errors.New("email already in use")
)
