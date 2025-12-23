# Build stage
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git

# Copy dependency files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o main ./cmd/server/main.go

# Final stage
FROM alpine:latest

WORKDIR /app

# Copy binary and config from builder
COPY --from=builder /app/main .
COPY --from=builder /app/config ./config
COPY --from=builder /app/migrations ./migrations

# Expose backend port
EXPOSE 8080

# Run the application
CMD ["./main"]
