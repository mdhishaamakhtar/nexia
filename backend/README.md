# Nexia Backend

Nexia Backend is a REST API service for a personal digital slambook, built with Go, Gin, and GORM.

## Features
- **Profile Management**: Create, read, update, and delete profiles with rich attributes (tags, favorites, etc.).
- **Authentication**: JWT-based authentication (Login/Signup).
- **Zodiac Derivation**: Automatically calculates zodiac signs based on birthdays.
- **Documentation**: Full OpenAPI 3 (Swagger) documentation.
- **Database**: MySQL with automatic migrations.

## Prerequisites
- Go 1.21+
- MySQL 8.0+

## Setup

1.  **Database**: Ensure MySQL is running and create a database named `nexia_db`.
    ```sql
    CREATE DATABASE nexia_db;
    ```
    *Note: Migrations will run automatically when the server starts.*

2.  **Configuration**:
    - Update `config/local.yaml` with your database credentials.
    - Or use environment variables: `NEXIA_DB_PASSWORD=yourpassword`.

## Running the Server

### Development Mode
```bash
go run cmd/server/main.go
```
The server will start on port `8080`.

### Production Mode
To run in production mode (Release Mode), set the `APP_ENV` environment variable to `prod`. This will load `config/prod.yaml`.

```bash
APP_ENV=prod go run cmd/server/main.go
```

Or if you have built the binary:

```bash
go build -o nexia-backend cmd/server/main.go
export APP_ENV=prod
./nexia-backend
```

Make sure to update `config/prod.yaml` with your production database credentials and JWT secret.

## API Documentation

Access the Swagger UI at:
http://localhost:8080/api/v1/swagger/index.html

### Generating Documentation
Swagger documentation is **automatically generated** on startup when running in `debug` mode.

For production or manual updates, run:
```bash
go run github.com/swaggo/swag/cmd/swag init -g cmd/server/main.go -o docs/swagger --parseDependency --parseInternal
```
*This uses the `swag` tool directly from the module cache.*

## Testing Endpoints

### Authentication (Login/Signup)
```bash
curl -X POST http://localhost:8080/api/v1/auth \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```
Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Create Profile (Protected)
```bash
TOKEN="<your_token_here>"
curl -X POST http://localhost:8080/api/v1/profiles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "full_name": "John Doe",
    "relationship_type": "Friend",
    "birthday": "1990-01-01",
    "top_songs": [
      {"name": "Song 1", "artist": "Artist 1"}
    ]
  }'
```

### Get Profile (Protected)
```bash
curl http://localhost:8080/api/v1/profiles/1 \
  -H "Authorization: Bearer $TOKEN"
```

### List Profiles (Protected)
```bash
curl "http://localhost:8080/api/v1/profiles?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```
