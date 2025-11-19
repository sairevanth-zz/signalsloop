#!/bin/bash

# Manual API Testing Script for AI Roadmap Feature
# Run this after starting the development server

echo "==================================="
echo "AI Roadmap API Manual Testing"
echo "==================================="
echo ""

# Configuration
BASE_URL="http://localhost:3000"
AUTH_TOKEN="" # Set this to a valid auth token
PROJECT_ID="" # Set this to a valid project ID

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to run test
run_test() {
    local test_name=$1
    local method=$2
    local endpoint=$3
    local data=$4

    TESTS_RUN=$((TESTS_RUN + 1))

    echo -e "${YELLOW}Test $TESTS_RUN: $test_name${NC}"
    echo "  Method: $method"
    echo "  Endpoint: $endpoint"

    if [ -z "$AUTH_TOKEN" ]; then
        echo -e "  ${RED}✗ SKIPPED: AUTH_TOKEN not set${NC}"
        echo ""
        return
    fi

    if [ -z "$PROJECT_ID" ] && [[ "$endpoint" == *"projectId"* ]]; then
        echo -e "  ${RED}✗ SKIPPED: PROJECT_ID not set${NC}"
        echo ""
        return
    fi

    # Replace placeholders
    endpoint="${endpoint//\{PROJECT_ID\}/$PROJECT_ID}"

    # Make request
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
            -H "Authorization: Bearer $AUTH_TOKEN" \
            "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
            -X "$method" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $AUTH_TOKEN" \
            -d "$data" \
            "$BASE_URL$endpoint")
    fi

    http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
    response_body=$(echo "$response" | sed '/HTTP_STATUS/d')

    echo "  Response Status: $http_status"

    if [ "$http_status" -ge 200 ] && [ "$http_status" -lt 300 ]; then
        echo -e "  ${GREEN}✓ PASSED${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo "  Response: ${response_body:0:100}..."
    else
        echo -e "  ${RED}✗ FAILED${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo "  Error: $response_body"
    fi

    echo ""
}

# Configuration Check
echo "Configuration:"
echo "  BASE_URL: $BASE_URL"
echo "  AUTH_TOKEN: ${AUTH_TOKEN:0:20}..."
echo "  PROJECT_ID: $PROJECT_ID"
echo ""

if [ -z "$AUTH_TOKEN" ]; then
    echo -e "${YELLOW}WARNING: AUTH_TOKEN not set. Tests will be skipped.${NC}"
    echo "To run tests, export AUTH_TOKEN:"
    echo "  export AUTH_TOKEN='your-token-here'"
    echo ""
fi

if [ -z "$PROJECT_ID" ]; then
    echo -e "${YELLOW}WARNING: PROJECT_ID not set. Project-specific tests will be skipped.${NC}"
    echo "To run project tests, export PROJECT_ID:"
    echo "  export PROJECT_ID='your-project-id'"
    echo ""
fi

# Test 1: Generate Roadmap (without AI reasoning)
run_test "Generate Roadmap - No AI Reasoning" \
    "POST" \
    "/api/roadmap/generate" \
    '{"projectId": "'$PROJECT_ID'", "generateReasoning": false}'

# Test 2: Get Roadmap Suggestions
run_test "Get Roadmap Suggestions - All" \
    "GET" \
    "/api/roadmap/suggestions?projectId={PROJECT_ID}"

# Test 3: Filter by Priority - Critical Only
run_test "Filter Suggestions - Critical Only" \
    "GET" \
    "/api/roadmap/suggestions?projectId={PROJECT_ID}&priorities=critical"

# Test 4: Filter by Priority - Critical and High
run_test "Filter Suggestions - Critical and High" \
    "GET" \
    "/api/roadmap/suggestions?projectId={PROJECT_ID}&priorities=critical,high"

# Test 5: Filter by Minimum Score
run_test "Filter Suggestions - Min Score 60" \
    "GET" \
    "/api/roadmap/suggestions?projectId={PROJECT_ID}&minScore=60"

# Test 6: Sort by Theme Name
run_test "Sort Suggestions - By Theme Name" \
    "GET" \
    "/api/roadmap/suggestions?projectId={PROJECT_ID}&sort=theme_name&order=asc"

# Test 7: Search Themes
run_test "Search Suggestions - With Query" \
    "GET" \
    "/api/roadmap/suggestions?projectId={PROJECT_ID}&search=feature"

# Test 8: Pagination
run_test "Pagination - Limit 5, Offset 0" \
    "GET" \
    "/api/roadmap/suggestions?projectId={PROJECT_ID}&limit=5&offset=0"

# Summary
echo "==================================="
echo "Test Summary"
echo "==================================="
echo "Total Tests:  $TESTS_RUN"
echo -e "${GREEN}Passed:       $TESTS_PASSED${NC}"
if [ $TESTS_FAILED -gt 0 ]; then
    echo -e "${RED}Failed:       $TESTS_FAILED${NC}"
else
    echo "Failed:       $TESTS_FAILED"
fi

# Calculate percentage
if [ $TESTS_RUN -gt 0 ]; then
    percentage=$((TESTS_PASSED * 100 / TESTS_RUN))
    echo "Success Rate: ${percentage}%"
fi

echo ""

# Exit with error if tests failed
if [ $TESTS_FAILED -gt 0 ]; then
    exit 1
fi

exit 0
