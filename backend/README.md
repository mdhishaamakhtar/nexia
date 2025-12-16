# Nexia Backend

Nexia Backend is a REST API service for a personal digital slambook, built with Go, Gin, and GORM.

## Features
- **Profile Management**: CRUD operations for user profiles.
- **Authentication**: JWT-based secure access.
- **Zodiac Derivation**: Automatic zodiac calculation.
- **Database**: MySQL with GORM managed migrations.

## Prerequisites
- **Go**: Version 1.25 or higher
- **MySQL**: Version 8.0 or higher

## Setup & Configuration

1. **Database Setup**:
   Ensure you have a MySQL server running and create the database:
   ```sql
   CREATE DATABASE nexia_db;
   ```

2. **Configuration**:
   - The application uses `config/local.yaml` for local development.
   - You can also configure via environment variables (e.g., `NEXIA_DB_PASSWORD`).

3. **Install Dependencies**:
   ```bash
   go mod download
   ```

## Running the Server

### Development Mode

Run the server directly using Go:

```bash
go run cmd/server/main.go
```

The server will start on port `8080`.

### Production Mode

To run in production mode (Release Mode), set the `APP_ENV` environment variable to `prod`.

```bash
APP_ENV=prod go run cmd/server/main.go
```

Or build the binary:

```bash
go build -o nexia-backend cmd/server/main.go
export APP_ENV=prod
./nexia-backend
```

## API Documentation

Swagger UI is available locally at:
`http://localhost:8080/api/v1/swagger/index.html`

### Generating Documentation

To generate or update the Swagger documentation, run:

```bash
go run github.com/swaggo/swag/cmd/swag init -g cmd/server/main.go -o docs/swagger --parseDependency --parseInternal
```
