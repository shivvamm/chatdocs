#!/bin/bash

# AI Chatbot Project Deployment Script
# This script automates the complete deployment of the multi-service chatbot application

set -e # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# --- Configuration ---
NETWORK_NAME="chatbotnetwork"
MYSQL_ROOT_PASSWORD="12345678"
MYSQL_DATABASE="chatbotserver"
MYSQL_PORT="3306"
ENV_FILE=".env"

# --- Function to print colored output ---
print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# --- Helper Functions ---
command_exists() { command -v "$1" >/dev/null 2>&1; }

# NEW: Function to load environment variables from .env file
load_env() {
    print_status "Loading environment variables from $ENV_FILE..."
    if [ -f "$ENV_FILE" ]; then
        export $(grep -v '^#' $ENV_FILE | xargs)
        print_success "Loaded environment variables."
    else
        print_warning "$ENV_FILE not found. Please create it with your API keys."
        # Initialize with empty strings if not found to avoid unbound variable errors
        export OPENAI_API_KEY="" LANGCHAIN_API_KEY="" GROQ_API_KEY="" DEEP_INFRA_API_KEY=""
        export MAILJET_API_KEY="" MAILJET_SECRET_KEY="" SENDER=""
    fi

    # Check for essential keys
    if [ -z "$OPENAI_API_KEY" ]; then
        print_error "OPENAI_API_KEY is not set in $ENV_FILE. Please add it."
        exit 1
    fi
}

wait_for_service() {
    local service_name=$1
    local port=$2
    local max_attempts=30
    local attempt=1
    print_status "Waiting for $service_name to be ready on port $port..."
    while [ $attempt -le $max_attempts ]; do
        if nc -z localhost $port 2>/dev/null; then
            print_success "$service_name is ready!"
            return 0
        fi
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    print_error "$service_name failed to start within the expected time."
    return 1
}

check_prerequisites() {
    print_status "Checking prerequisites..."
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install Docker and try again."
        exit 1
    fi
    if ! command_exists node; then
        print_warning "Node.js not found. Frontend builds will be skipped."
    fi
    if ! command_exists mysql; then
        print_warning "MySQL client not found. Database setup will be skipped."
    fi
    if ! command_exists nc; then
        print_warning "netcat not found. Service health checks will be limited."
    fi
    print_success "Prerequisites check completed."
}

# --- Service Setup Functions ---

setup_network() {
    print_status "Setting up Docker network: $NETWORK_NAME"
    if ! docker network ls | grep -q $NETWORK_NAME; then
        docker network create $NETWORK_NAME
        print_success "Created network: $NETWORK_NAME"
    else
        print_warning "Network $NETWORK_NAME already exists."
    fi
}

setup_mysql() {
    print_status "Setting up MySQL database..."
    if command_exists mysql && nc -z localhost $MYSQL_PORT 2>/dev/null; then
        print_success "MySQL is already running on port $MYSQL_PORT."
        mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS $MYSQL_DATABASE;" 2>/dev/null || {
            print_warning "Could not create database. Ensure MySQL root password is correct."
        }
    else
        print_warning "Local MySQL not found or not running. Please ensure it is installed and configured."
    fi
}

# Generic function to start a Docker service
start_docker_service() {
    local name=$1
    local image=$2
    local port_map=$3
    local args="${@:4}"
    
    print_status "Setting up $name..."
    docker stop $name 2>/dev/null || true
    docker rm $name 2>/dev/null || true
    # shellcheck disable=SC2086
    docker run --network $NETWORK_NAME --name $name -d -p $port_map $args $image
    wait_for_service "$name" "${port_map%%:*}" # Check host port
    print_success "$name server is running."
}

setup_all_infra() {
    # Redis
    start_docker_service "redis-server" "redis:latest" "6379:6379"

    # RabbitMQ
    start_docker_service "rabbitmq" "rabbitmq:3.13-management" "5672:5672" "-p 15672:15672"
    print_status "RabbitMQ Management UI is at http://localhost:15672"
    
    # Qdrant
    mkdir -p "$(pwd)/processing_server/qdrant_storage"
    local qdrant_volume="-v $(pwd)/processing_server/qdrant_storage:/qdrant/storage:z"
    start_docker_service "qdrant" "qdrant/qdrant" "6333:6333" "-p 6334:6334 $qdrant_volume"
}

setup_main_server() {
    print_status "Building and starting main server..."
    docker stop chatbotmain 2>/dev/null || true
    docker rm chatbotmain 2>/dev/null || true
    cd main_server && docker build -t chatbotmain . && cd ..

    # FIX: Added --add-host to allow the container to connect to MySQL on the host
    docker run --network $NETWORK_NAME --name chatbotmain -d \
        --add-host=host.docker.internal:host-gateway \
        -e MYSQL_URI="$MYSQL_URI" \
        -e OPENAI_API_KEY="$OPENAI_API_KEY" \
        -e LANGCHAIN_API_KEY="$LANGCHAIN_API_KEY" \
        -e DEEP_INFRA_API_KEY="$DEEP_INFRA_API_KEY" \
        -e GROQ_API_KEY="$GROQ_API_KEY" \
        -e REDIS_URL="redis://redis-server:6379/0" \
        -p 8000:8000 \
        chatbotmain
        
    wait_for_service "Main Server" 8000
    print_success "Main server is running on port 8000."
}

setup_processing_server() {
    print_status "Building and starting processing server..."
    docker stop chatbotprocess 2>/dev/null || true
    docker rm chatbotprocess 2>/dev/null || true
    cd processing_server && docker build -t chatbotprocess . && cd ..

    # FIX: Added --add-host to allow the container to connect to MySQL on the host
    docker run --network $NETWORK_NAME --name chatbotprocess -d \
        --add-host=host.docker.internal:host-gateway \
        -e MYSQL_URI="$MYSQL_URI" \
        -e OPENAI_API_KEY="$OPENAI_API_KEY" \
        -e MAILJET_API_KEY="$MAILJET_API_KEY" \
        -e MAILJET_SECRET_KEY="$MAILJET_SECRET_KEY" \
        -e SENDER="$SENDER" \
        -p 9000:9000 \
        chatbotprocess

    wait_for_service "Processing Server" 9000
    print_success "Processing server is running on port 9000."
}

setup_frontend() {
    if ! command_exists node; then
        print_warning "Node.js not available. Skipping frontend setup."
        return
    fi
    
    print_status "Setting up frontend applications (this may take a while)..."
    if [ -d "front-end" ]; then
        print_status "Building admin panel..."
        (cd front-end && npm install && npm run build)
        print_success "Admin panel built."
    fi
    if [ -d "Chatbotquery" ]; then
        print_status "Building query interface..."
        (cd Chatbotquery && npm install && npm run build)
        print_success "Query interface built."
    fi
}

run_migrations() {
    print_status "Running database migrations..."
    # FIX: Added a delay to ensure the app is ready for DB connections.
    print_status "Waiting for main server to initialize..."
    sleep 5 

    if docker exec chatbotmain alembic upgrade head; then
        print_success "Database migrations completed successfully."
    else
        print_error "Database migrations failed. Please check the logs:"
        echo "  docker logs chatbotmain"
        echo "You may need to run migrations manually:"
        echo "  docker exec -it chatbotmain alembic upgrade head"
    fi
}

show_summary() {
    echo -e "\n==================== ${GREEN}DEPLOYMENT SUMMARY${NC} ===================="
    echo -e "\n✅ ${GREEN}All services have been deployed successfully!${NC}\n"
    echo "Service URLs:"
    echo "  🔗 Main Server API:       http://localhost:8000"
    echo "  🔗 Main Server Docs:      http://localhost:8000/docs"
    echo "  🔗 Processing Server API: http://localhost:9000"
    echo "  🔗 Processing Server Docs: http://localhost:9000/docs"
    echo "  🔗 RabbitMQ Management:   http://localhost:15672 (guest/guest)"
    echo "  🔗 Qdrant Dashboard:      http://localhost:6333/dashboard"
    echo ""
    echo "Frontend Applications:"
    echo "  📱 Admin Panel:           cd front-end && npm start"
    # FIX: Corrected the command for the query interface
    echo "  📱 Query Interface:       cd Chatbotquery && npm run dev"
    echo ""
    echo "Useful Commands:"
    echo "  📊 View logs:             docker logs [container_name]"
    echo "  🔄 Restart service:       docker restart [container_name]"
    echo "  🛑 Stop all services:     docker stop \$(docker ps -q -f network=$NETWORK_NAME)"
    echo "================================================================"
}

cleanup_on_failure() {
    print_error "Deployment failed. Cleaning up created containers..."
    docker stop redis-server rabbitmq qdrant chatbotmain chatbotprocess 2>/dev/null || true
    docker rm redis-server rabbitmq qdrant chatbotmain chatbotprocess 2>/dev/null || true
}

# --- Main Deployment Logic ---
main() {
    echo "🤖 AI Chatbot Project Deployment Script 🤖"
    trap cleanup_on_failure ERR
    
    load_env
    check_prerequisites
    setup_network
    setup_mysql
    setup_all_infra
    setup_main_server
    setup_processing_server
    run_migrations
    setup_frontend
    show_summary
    
    trap - ERR # Remove trap on success
}

# --- Script Options Handling ---
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [OPTION]"
        echo "Options:"
        echo "  --help, -h     Show this help message."
        echo "  --clean        Stop and remove all project containers and the network."
        echo "  --services     Deploy only backend services (skip frontend build)."
        exit 0
        ;;
    --clean)
        print_status "Cleaning up existing deployment..."
        docker stop redis-server rabbitmq qdrant chatbotmain chatbotprocess 2>/dev/null || true
        docker rm redis-server rabbitmq qdrant chatbotmain chatbotprocess 2>/dev/null || true
        docker network rm $NETWORK_NAME 2>/dev/null || true
        print_success "Cleanup completed."
        exit 0
        ;;
    --services)
        print_status "Deploying backend services only..."
        trap cleanup_on_failure ERR
        load_env
        check_prerequisites
        setup_network
        setup_mysql
        setup_all_infra
        setup_main_server
        setup_processing_server
        run_migrations
        show_summary
        trap - ERR
        exit 0
        ;;
    "")
        main
        ;;
    *)
        print_error "Unknown option: $1. Use --help for usage information."
        exit 1
        ;;
esac