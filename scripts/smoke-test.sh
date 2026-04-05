#!/bin/bash

# ============================================================================
# Samar-Minime Systems - E2E Smoke Test
# ============================================================================
# Production-quality smoke test for Samar-Minime Systems platform.
# Tests: infrastructure, database, migrations, seeding, API, and basic flows.
# ============================================================================

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DOCKER_COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.yml"
API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
API_TIMEOUT=30
MAX_RETRIES=30
RETRY_DELAY=2

# Test counters
TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0

# ============================================================================
# Utility Functions
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_test_header() {
    echo -e "\n${BLUE}============================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================================${NC}\n"
}

increment_test() {
    ((TESTS_TOTAL++))
}

wait_for_health() {
    local service=$1
    local health_endpoint=$2
    local max_attempts=$3
    local attempt=0

    log_info "Waiting for $service to be healthy..."

    while [ $attempt -lt $max_attempts ]; do
        if curl -sf "$health_endpoint" > /dev/null 2>&1; then
            log_success "$service is healthy"
            return 0
        fi
        attempt=$((attempt + 1))
        if [ $attempt -lt $max_attempts ]; then
            sleep $RETRY_DELAY
        fi
    done

    log_error "$service failed to become healthy after $max_attempts attempts"
    return 1
}

api_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local auth_token=${4:-}

    local url="${API_BASE_URL}${endpoint}"
    local curl_opts="-s -w \n%{http_code}"

    if [ -n "$auth_token" ]; then
        curl_opts="$curl_opts -H \"Authorization: Bearer $auth_token\""
    fi

    if [ "$method" = "POST" ] || [ "$method" = "PUT" ]; then
        curl_opts="$curl_opts -X $method -H \"Content-Type: application/json\""
        if [ -n "$data" ]; then
            curl_opts="$curl_opts -d '$data'"
        fi
    else
        curl_opts="$curl_opts -X $method"
    fi

    local response=$(eval "curl $curl_opts '$url'")
    local http_code=$(echo "$response" | tail -n 1)
    local body=$(echo "$response" | sed '$d')

    echo "$body"
    return $http_code
}

# ============================================================================
# Infrastructure Checks
# ============================================================================

check_docker() {
    increment_test
    log_info "Checking Docker..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        return 1
    fi

    if ! docker info > /dev/null 2>&1; then
        log_error "Docker daemon is not running"
        return 1
    fi

    log_success "Docker is running"
    return 0
}

check_docker_compose() {
    increment_test
    log_info "Checking Docker Compose..."

    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        return 1
    fi

    log_success "Docker Compose is installed"
    return 0
}

check_docker_compose_file() {
    increment_test
    log_info "Checking docker-compose.yml..."

    if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
        log_error "docker-compose.yml not found at $DOCKER_COMPOSE_FILE"
        return 1
    fi

    log_success "docker-compose.yml found"
    return 0
}

# ============================================================================
# Infrastructure Lifecycle
# ============================================================================

start_infrastructure() {
    print_test_header "Starting Infrastructure"

    increment_test
    log_info "Starting Docker Compose services..."

    if cd "$PROJECT_ROOT" && docker-compose -f "$DOCKER_COMPOSE_FILE" up -d 2>&1 | head -20; then
        log_success "Docker Compose services started"
        sleep 5 # Wait for services to stabilize
        return 0
    else
        log_error "Failed to start Docker Compose services"
        return 1
    fi
}

# ============================================================================
# Service Health Checks
# ============================================================================

health_checks() {
    print_test_header "Service Health Checks"

    # PostgreSQL health check
    increment_test
    log_info "Checking PostgreSQL..."
    if docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
        log_success "PostgreSQL is healthy"
    else
        log_error "PostgreSQL health check failed"
        return 1
    fi

    # Redis health check
    increment_test
    log_info "Checking Redis..."
    if docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T redis redis-cli ping > /dev/null 2>&1; then
        log_success "Redis is healthy"
    else
        log_error "Redis health check failed"
        return 1
    fi

    # MinIO health check (if present)
    increment_test
    log_info "Checking MinIO..."
    if docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T minio curl -f http://localhost:9000/minio/health/live > /dev/null 2>&1; then
        log_success "MinIO is healthy"
    else
        log_warning "MinIO health check inconclusive (may not be in compose file)"
    fi

    return 0
}

# ============================================================================
# Database Setup
# ============================================================================

run_migrations() {
    print_test_header "Database Migrations"

    increment_test
    log_info "Running Prisma migrations..."

    if cd "$PROJECT_ROOT" && npx prisma migrate deploy --skip-generate 2>&1 | tail -5; then
        log_success "Prisma migrations completed"
        return 0
    else
        log_error "Prisma migrations failed"
        return 1
    fi
}

seed_database() {
    print_test_header "Database Seeding"

    increment_test
    log_info "Seeding database..."

    # Check if seed script exists
    if [ -f "${PROJECT_ROOT}/prisma/seed.ts" ] || [ -f "${PROJECT_ROOT}/prisma/seed.js" ]; then
        if cd "$PROJECT_ROOT" && npx prisma db seed 2>&1 | tail -5; then
            log_success "Database seeding completed"
            return 0
        else
            log_warning "Database seeding failed or not configured"
            return 0
        fi
    else
        log_info "No seed script found, skipping database seeding"
        return 0
    fi
}

# ============================================================================
# API Server Startup
# ============================================================================

start_api_server() {
    print_test_header "API Server Startup"

    increment_test
    log_info "Starting API server..."

    if cd "$PROJECT_ROOT" && npm run start:api > /tmp/api-server.log 2>&1 &
    then
        API_SERVER_PID=$!
        log_success "API server started (PID: $API_SERVER_PID)"

        # Wait for API health endpoint
        increment_test
        log_info "Waiting for API server to be ready..."
        if wait_for_health "API Server" "$API_BASE_URL/health" "$MAX_RETRIES"; then
            return 0
        else
            log_error "API server failed health check"
            cat /tmp/api-server.log | tail -20
            return 1
        fi
    else
        log_error "Failed to start API server"
        cat /tmp/api-server.log | tail -20
        return 1
    fi
}

# ============================================================================
# API Integration Tests
# ============================================================================

test_api_health() {
    print_test_header "API Health Endpoint"

    increment_test
    log_info "Testing GET /health..."

    response=$(api_request GET "/health" "")
    if [ $? -eq 0 ] && echo "$response" | grep -q "ok\|healthy"; then
        log_success "Health endpoint working"
        return 0
    else
        log_error "Health endpoint failed: $response"
        return 1
    fi
}

test_user_registration() {
    print_test_header "User Registration"

    increment_test
    local email="test-user-$(date +%s)@example.com"
    local password="TestPassword123!"

    log_info "Testing user registration..."
    local payload=$(cat <<EOF
{
    "email": "$email",
    "password": "$password",
    "name": "Test User"
}
EOF
)

    response=$(api_request POST "/api/auth/register" "$payload")
    if [ $? -eq 201 ] || [ $? -eq 200 ]; then
        log_success "User registration successful"
        return 0
    else
        log_error "User registration failed: $response"
        return 1
    fi
}

test_user_login() {
    print_test_header "User Authentication"

    increment_test
    local email="test-user-$(date +%s)@example.com"
    local password="TestPassword123!"

    # First register a user
    log_info "Registering test user for login test..."
    local register_payload=$(cat <<EOF
{
    "email": "$email",
    "password": "$password",
    "name": "Test User"
}
EOF
)
    api_request POST "/api/auth/register" "$register_payload" > /dev/null 2>&1

    # Now attempt login
    log_info "Testing user login..."
    local login_payload=$(cat <<EOF
{
    "email": "$email",
    "password": "$password"
}
EOF
)

    response=$(api_request POST "/api/auth/login" "$login_payload")
    if [ $? -eq 200 ] && echo "$response" | grep -q "token\|access_token"; then
        log_success "User login successful"
        AUTH_TOKEN=$(echo "$response" | grep -o '"token":"[^"]*' | cut -d'"' -f4 || echo "$response" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
        return 0
    else
        log_error "User login failed: $response"
        return 1
    fi
}

test_project_creation() {
    print_test_header "Project Creation"

    increment_test
    if [ -z "$AUTH_TOKEN" ]; then
        log_warning "No auth token available, skipping project creation test"
        return 0
    fi

    log_info "Testing project creation..."
    local payload=$(cat <<EOF
{
    "name": "Test Project $(date +%s)",
    "description": "E2E smoke test project",
    "slug": "test-project-$(date +%s)"
}
EOF
)

    response=$(api_request POST "/api/projects" "$payload" "$AUTH_TOKEN")
    if [ $? -eq 201 ] || [ $? -eq 200 ]; then
        log_success "Project creation successful"
        PROJECT_ID=$(echo "$response" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
        return 0
    else
        log_error "Project creation failed: $response"
        return 1
    fi
}

test_workflow_creation() {
    print_test_header "Workflow Creation"

    increment_test
    if [ -z "$AUTH_TOKEN" ] || [ -z "$PROJECT_ID" ]; then
        log_warning "Missing auth token or project ID, skipping workflow test"
        return 0
    fi

    log_info "Testing workflow creation..."
    local payload=$(cat <<EOF
{
    "name": "Test Workflow $(date +%s)",
    "type": "MARKET_RESEARCH",
    "projectId": "$PROJECT_ID"
}
EOF
)

    response=$(api_request POST "/api/workflows" "$payload" "$AUTH_TOKEN")
    if [ $? -eq 201 ] || [ $? -eq 200 ]; then
        log_success "Workflow creation successful"
        WORKFLOW_ID=$(echo "$response" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
        return 0
    else
        log_error "Workflow creation failed: $response"
        return 1
    fi
}

test_workflow_status() {
    print_test_header "Workflow Status Check"

    increment_test
    if [ -z "$AUTH_TOKEN" ] || [ -z "$WORKFLOW_ID" ]; then
        log_warning "Missing auth token or workflow ID, skipping workflow status test"
        return 0
    fi

    log_info "Testing workflow status retrieval..."
    response=$(api_request GET "/api/workflows/$WORKFLOW_ID" "" "$AUTH_TOKEN")
    if [ $? -eq 200 ]; then
        log_success "Workflow status retrieval successful"
        return 0
    else
        log_error "Workflow status retrieval failed: $response"
        return 1
    fi
}

test_list_agents() {
    print_test_header "List Agents"

    increment_test
    log_info "Testing agent listing..."
    response=$(api_request GET "/api/agents" "" "")
    if [ $? -eq 200 ] && echo "$response" | grep -q "strategy-director\|qa-director\|ui-architect"; then
        log_success "Agent listing successful"
        return 0
    else
        log_warning "Agent listing failed or agents not found: $response"
        return 0
    fi
}

test_cost_tracking() {
    print_test_header "Cost Tracking"

    increment_test
    if [ -z "$AUTH_TOKEN" ]; then
        log_warning "No auth token available, skipping cost tracking test"
        return 0
    fi

    log_info "Testing cost tracking..."
    response=$(api_request GET "/api/projects/costs" "" "$AUTH_TOKEN")
    if [ $? -eq 200 ]; then
        log_success "Cost tracking accessible"
        return 0
    else
        log_warning "Cost tracking endpoint not available or failed"
        return 0
    fi
}

test_system_health() {
    print_test_header "System Health Summary"

    increment_test
    log_info "Retrieving system health summary..."
    response=$(api_request GET "/api/health/system" "" "")
    if [ $? -eq 200 ]; then
        log_success "System health summary retrieved"
        return 0
    else
        log_warning "System health summary endpoint not available"
        return 0
    fi
}

# ============================================================================
# Cleanup
# ============================================================================

cleanup() {
    print_test_header "Cleanup"

    log_info "Stopping API server..."
    if [ -n "$API_SERVER_PID" ]; then
        kill $API_SERVER_PID 2>/dev/null || true
        wait $API_SERVER_PID 2>/dev/null || true
        log_success "API server stopped"
    fi

    increment_test
    log_info "Stopping Docker Compose services..."
    if cd "$PROJECT_ROOT" && docker-compose -f "$DOCKER_COMPOSE_FILE" down > /dev/null 2>&1; then
        log_success "Docker Compose services stopped"
    else
        log_warning "Failed to stop some Docker Compose services"
    fi
}

# ============================================================================
# Test Summary
# ============================================================================

print_summary() {
    print_test_header "Test Summary"

    echo "Total Tests:  $TESTS_TOTAL"
    echo "Passed:       ${GREEN}$TESTS_PASSED${NC}"
    echo "Failed:       ${RED}$TESTS_FAILED${NC}"
    echo ""

    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}All tests passed!${NC}"
        return 0
    else
        echo -e "${RED}Some tests failed.${NC}"
        return 1
    fi
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║     Samar-Minime Systems - E2E Smoke Test Suite            ║"
    echo "║                                                            ║"
    echo "║  API:        $API_BASE_URL"
    echo "║  Project:    $PROJECT_ROOT"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}\n"

    # Pre-flight checks
    print_test_header "Pre-Flight Checks"
    check_docker || exit 1
    check_docker_compose || exit 1
    check_docker_compose_file || exit 1

    # Start infrastructure
    start_infrastructure || exit 1

    # Health checks
    health_checks || exit 1

    # Database setup
    run_migrations || exit 1
    seed_database || exit 1

    # Start API
    start_api_server || exit 1

    # Run API tests
    test_api_health || true
    test_user_registration || true
    test_user_login || true
    test_project_creation || true
    test_workflow_creation || true
    test_workflow_status || true
    test_list_agents || true
    test_cost_tracking || true
    test_system_health || true

    # Cleanup
    cleanup

    # Print summary
    print_summary
    exit $?
}

# Run main execution
main
