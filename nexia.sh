#!/bin/bash

# Nexia Development Utility Script
# Handles Docker-based environment management for: postgres, redis, backend, frontend

# Color codes for better readability
BLUE='\033[0;34m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

cd "$(dirname "$0")"

usage() {
    echo -e "${BLUE}Nexia Dev CLI${NC}"
    echo "Usage: ./nexia.sh [command] [options]"
    echo ""
    echo "Commands:"
    echo "  rb      - Build & Restart Backend (Ensures infra is up)"
    echo "  rf      - Build & Restart Frontend (Ensures backend/infra is up)"
    echo "  ra      - Build & Restart All services"
    echo "  infra   - Restart Postgres & Redis (Keeps data)"
    echo "  wipe    - RESTART INFRA & WIPE VOLUMES (Deletes all DB data/embeddings)"
    echo "  stop    - Stop all services"
    echo "  start   - Start all services (detached)"
    echo ""
    echo "Options:"
    echo "  -b, --build   Rebuild images when using 'start' or 'ra'"
    echo ""
}

# Check for build flag
BUILD_FLAG=""
for arg in "$@"; do
    if [[ "$arg" == "-b" || "$arg" == "--build" ]]; then
        BUILD_FLAG="--build"
    fi
done

case "$1" in
    rb)
        echo -e "${YELLOW}Building and Restarting Backend...${NC}"
        # docker compose up -d --build handles building and starting/restarting the specific service
        docker compose up -d --build backend
        echo -e "${GREEN}Backend built and restarted.${NC}"
        ;;
    rf)
        echo -e "${YELLOW}Building and Restarting Frontend...${NC}"
        docker compose up -d --build frontend
        echo -e "${GREEN}Frontend built and restarted.${NC}"
        ;;
    ra)
        echo -e "${YELLOW}Building and Restarting All Services...${NC}"
        docker compose up -d --build
        echo -e "${GREEN}All systems rebuilt and restarted.${NC}"
        ;;
    infra)
        echo -e "${YELLOW}Restarting Infrastructure (Postgres/Redis)...${NC}"
        docker compose restart postgres redis
        echo -e "${GREEN}Infrastructure restarted.${NC}"
        ;;
    wipe)
        echo -e "${RED}!!! WARNING: THIS WILL WIPE THE DATABASE (POSTGRES & REDIS) !!!${NC}"
        read -p "Are you sure? (y/N) " confirm
        if [[ $confirm == [yY] ]]; then
            docker compose down -v postgres redis
            docker compose up -d postgres redis
            echo -e "${GREEN}Infrastructure wiped and restarted fresh.${NC}"
        else
            echo "Operation cancelled."
        fi
        ;;
    stop)
        echo -e "${BLUE}Stopping All Services...${NC}"
        docker compose stop
        ;;
    start)
        echo -e "${BLUE}Starting All Services (Build: ${BUILD_FLAG:-off})...${NC}"
        docker compose up -d $BUILD_FLAG
        echo -e "${GREEN}Nexia is live.${NC}"
        ;;
    *)
        usage
        ;;
esac
