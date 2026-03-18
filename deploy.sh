#!/bin/bash

# AI Chatbot Project Deployment Script
# This script automates the complete deployment of the multi-service chatbot application

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration variables
NETWORK_NAME="chatbotnetwork"
MYSQL_ROOT_PASSWORD="12345678"
MYSQL_DATABASE="chatbotserver"
MYSQL_PORT="3306"

# Environment variables — loaded from .env file or set below
MYSQL_URI="mysql+pymysql://root:${MYSQL_ROOT_PASSWORD}@host.docker.internal:${MYSQL_PORT}/${MYSQL_DATABASE}"
OPENAI_API_KEY="${OPENAI_API_KEY:-}"
LANGCHAIN_API_KEY="${LANGCHAIN_API_KEY:-}"
GROQ_API_KEY="${GROQ_API_KEY:-}"
REDIS_URL="redis://redis-server:6379/0"
MAILJET_API_KEY="${MAILJET_API_KEY:-}"
MAILJET_SECRET_KEY="${MAILJET_SECRET_KEY:-}"
SENDER="${SENDER:-}"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to wait for service to be ready
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
    
    print_error "$service_name failed to start within expected time"
    return 1
}

# Function to check prerequisites
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
    
    print_success "Prerequisites check completed"
}

# Function to setup Docker network
setup_network() {
    print_status "Setting up Docker network: $NETWORK_NAME"
    
    if docker network ls | grep -q $NETWORK_NAME; then
        print_warning "Network $NETWORK_NAME already exists"
    else
        docker network create $NETWORK_NAME
        print_success "Created network: $NETWORK_NAME"
    fi
}

# Function to setup MySQL
setup_mysql() {
    print_status "Setting up MySQL database..."
    
    # Check if MySQL is running locally
    if command_exists mysql && nc -z localhost $MYSQL_PORT 2>/dev/null; then
        print_success "MySQL is already running on port $MYSQL_PORT"
        
        # Create database if it doesn't exist
        mysql -u root -p$MYSQL_ROOT_PASSWORD -e "CREATE DATABASE IF NOT EXISTS $MYSQL_DATABASE;" 2>/dev/null || {
            print_warning "Could not create database. Please ensure MySQL root password is: $MYSQL_ROOT_PASSWORD"
        }
    else
        print_warning "MySQL not found or not running. Please install and configure MySQL with:"
        echo "  - Root password: $MYSQL_ROOT_PASSWORD"
        echo "  - Database: $MYSQL_DATABASE"
        echo "  - Port: $MYSQL_PORT"
    fi
}

# Function to setup Redis
setup_redis() {
    print_status "Setting up Redis server..."
    
    # Stop any existing Redis container
    docker stop redis-server 2>/dev/null || true
    docker rm redis-server 2>/dev/null || true
    
    # Stop local Redis if running
    sudo snap stop redis 2>/dev/null || true
    
    # Start Redis container
    docker run --network $NETWORK_NAME --name redis-server -d -p 6379:6379 redis:latest
    
    wait_for_service "Redis" 6379
    print_success "Redis server is running"
}

# Function to setup RabbitMQ
setup_rabbitmq() {
    print_status "Setting up RabbitMQ server..."
    
    # Stop any existing RabbitMQ container
    docker stop rabbitmq 2>/dev/null || true
    docker rm rabbitmq 2>/dev/null || true
    
    # Start RabbitMQ container
    docker run --network $NETWORK_NAME --name rabbitmq -d \
        -p 5672:5672 -p 15672:15672 \
        rabbitmq:3.13-management
    
    wait_for_service "RabbitMQ" 5672
    print_success "RabbitMQ server is running (Management UI: http://localhost:15672)"
}

# Function to setup Qdrant
setup_qdrant() {
    print_status "Setting up Qdrant vector database..."
    
    # Stop any existing Qdrant container
    docker stop qdrant 2>/dev/null || true
    docker rm qdrant 2>/dev/null || true
    
    # Create qdrant storage directory if it doesn't exist
    mkdir -p $(pwd)/processing_server/qdrant_storage
    
    # Start Qdrant container
    docker run --network $NETWORK_NAME --name qdrant -d \
        -p 6333:6333 -p 6334:6334 \
        -v $(pwd)/processing_server/qdrant_storage:/qdrant/storage:z \
        qdrant/qdrant
    
    wait_for_service "Qdrant" 6333
    print_success "Qdrant vector database is running"
}

# Function to build and run main server
setup_main_server() {
    print_status "Building and starting main server..."
    
    # Stop any existing main server container
    docker stop chatbotmain 2>/dev/null || true
    docker rm chatbotmain 2>/dev/null || true
    
    # Build main server image
    cd main_server
    docker build -t chatbotmain .
    cd ..
    
    # Run main server
    docker run --network $NETWORK_NAME --name chatbotmain -d \
        -e MYSQL_URI="$MYSQL_URI" \
        -e OPENAI_API_KEY="$OPENAI_API_KEY" \
        -e LANGCHAIN_API_KEY="$LANGCHAIN_API_KEY" \
        -e DEEP_INFRA_API_KEY="$DEEP_INFRA_API_KEY" \
        -e GROQ_API_KEY="$GROQ_API_KEY" \
        -e REDIS_URL="$REDIS_URL" \
        -p 8000:8000 \
        chatbotmain
    
    wait_for_service "Main Server" 8000
    print_success "Main server is running on port 8000"
}

# Function to build and run processing server
setup_processing_server() {
    print_status "Building and starting processing server..."
    
    # Stop any existing processing server container
    docker stop chatbotprocess 2>/dev/null || true
    docker rm chatbotprocess 2>/dev/null || true
    
    # Build processing server image
    cd processing_server
    docker build -t chatbotprocess .
    cd ..
    
    # Run processing server
    docker run --network $NETWORK_NAME --name chatbotprocess -d \
        -e MYSQL_URI="$MYSQL_URI" \
        -e OPENAI_API_KEY="$OPENAI_API_KEY" \
        -e MAILJET_API_KEY="$MAILJET_API_KEY" \
        -e MAILJET_SECRET_KEY="$MAILJET_SECRET_KEY" \
        -e SENDER="$SENDER" \
        -p 9000:9000 \
        chatbotprocess
    
    wait_for_service "Processing Server" 9000
    print_success "Processing server is running on port 9000"
}

# Function to build and run frontend containers
setup_frontend_containers() {
    print_status "Setting up frontend containers..."
    
    # Build and run admin panel container
    if [ -d "front-end" ]; then
        print_status "Building admin panel Docker image..."
        cd front-end
        
        # Stop any existing container
        docker stop chatbot-admin 2>/dev/null || true
        docker rm chatbot-admin 2>/dev/null || true
        
        # Build with custom API URL if provided
        if [ -n "$FRONTEND_API_URL" ]; then
            docker build --build-arg REACT_APP_API_BASE_URL="$FRONTEND_API_URL" -t chatbot-admin .
        else
            docker build --build-arg REACT_APP_API_BASE_URL="http://localhost:8000" -t chatbot-admin .
        fi
        
        # Run the container
        docker run --network $NETWORK_NAME --name chatbot-admin -d \
            -p 3000:3000 \
            chatbot-admin
        
        wait_for_service "Admin Panel" 3000
        print_success "Admin panel is running on port 3000"
        cd ..
    fi
}

# Function to build and serve frontend applications (non-Docker)
setup_frontend() {
    if ! command_exists node; then
        print_warning "Node.js not available. Skipping frontend setup."
        return
    fi
    
    print_status "Setting up frontend applications..."
    
    # Build and serve admin panel
    if [ -d "front-end" ]; then
        print_status "Building admin panel..."
        cd front-end
        npm install
        npm run build
        print_success "Admin panel built successfully"
        print_status "To serve admin panel: cd front-end && npm start (port 3000)"
        cd ..
    fi
    
    # Build and serve query interface
    if [ -d "Chatbotquery" ]; then
        print_status "Setting up query interface..."
        cd Chatbotquery
        
        # Fix permissions for node_modules
        if [ -d "node_modules" ]; then
            print_status "Fixing node_modules permissions..."
            chmod -R 755 node_modules 2>/dev/null || true
            rm -rf node_modules/.vite 2>/dev/null || true
        fi
        
        npm install
        npm run build
        print_success "Query interface built successfully"
        print_status "To serve query interface: cd Chatbotquery && npm run dev (port 5173)"
        cd ..
    fi
}

# Function to run database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    # Run Alembic migrations for main server
    docker exec chatbotmain alembic upgrade head 2>/dev/null || {
        print_warning "Could not run migrations automatically. You may need to run them manually:"
        echo "  docker exec -it chatbotmain alembic upgrade head"
    }
    
    print_success "Database migrations completed"
}

# Function to display deployment summary
show_summary() {
    echo ""
    echo "==================== DEPLOYMENT SUMMARY ===================="
    echo ""
    print_success "All services have been deployed successfully!"
    echo ""
    echo "Service URLs:"
    echo "  🔗 Main Server API:       http://localhost:8000"
    echo "  🔗 Main Server Docs:      http://localhost:8000/docs"
    echo "  🔗 Processing Server API: http://localhost:9000"
    echo "  🔗 Processing Server Docs: http://localhost:9000/docs"
    echo "  🔗 RabbitMQ Management:   http://localhost:15672 (guest/guest)"
    echo "  🔗 Qdrant Dashboard:      http://localhost:6333/dashboard"
    echo "  🔗 Admin Panel:           http://localhost:3000"
    echo ""
    echo "Docker Commands:"
    echo "  🔧 Build admin panel with custom API URL:"
    echo "     docker build --build-arg REACT_APP_API_BASE_URL=https://api.example.com -t chatbot-admin ./front-end"
    echo "  🔧 Run admin panel with custom API URL:"
    echo "     FRONTEND_API_URL=https://api.example.com ./deploy.sh"
    echo ""
    echo "Useful Commands:"
    echo "  📊 View logs:             docker logs [container_name]"
    echo "  🔄 Restart service:       docker restart [container_name]"
    echo "  🛑 Stop all services:     docker stop \$(docker ps -q)"
    echo "  🧹 Clean up:              docker system prune"
    echo ""
    echo "=============================================================="
}

# Function to cleanup on failure
cleanup_on_failure() {
    print_error "Deployment failed. Cleaning up..."
    docker stop redis-server rabbitmq qdrant chatbotmain chatbotprocess chatbot-admin 2>/dev/null || true
    docker rm redis-server rabbitmq qdrant chatbotmain chatbotprocess chatbot-admin 2>/dev/null || true
}

# Main deployment function
main() {
    echo "🤖 AI Chatbot Project Deployment Script"
    echo "========================================"
    echo ""
    
    # Set trap for cleanup on failure
    trap cleanup_on_failure ERR
    
    check_prerequisites
    setup_network
    setup_mysql
    setup_redis
    setup_rabbitmq
    setup_qdrant
    setup_main_server
    setup_processing_server
    run_migrations
    setup_frontend_containers
    show_summary
    
    # Remove trap on successful completion
    trap - ERR
}

# Script options
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --clean        Clean up existing containers and networks"
        echo "  --services     Deploy only backend services (skip frontend)"
        echo ""
        echo "Environment Variables:"
        echo "  OPENAI_API_KEY       - OpenAI API key (required)"
        echo "  DEEP_INFRA_API_KEY   - Deep Infra API key (optional)"
        echo ""
        exit 0
        ;;
    --clean)
        print_status "Cleaning up existing deployment..."
        docker stop redis-server rabbitmq qdrant chatbotmain chatbotprocess chatbot-admin 2>/dev/null || true
        docker rm redis-server rabbitmq qdrant chatbotmain chatbotprocess chatbot-admin 2>/dev/null || true
        docker network rm $NETWORK_NAME 2>/dev/null || true
        print_success "Cleanup completed"
        exit 0
        ;;
    --services)
        print_status "Deploying backend services only..."
        check_prerequisites
        setup_network
        setup_mysql
        setup_redis
        setup_rabbitmq
        setup_qdrant
        setup_main_server
        setup_processing_server
        run_migrations
        show_summary
        exit 0
        ;;
    "")
        main
        ;;
    *)
        print_error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac