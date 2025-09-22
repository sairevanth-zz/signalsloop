#!/bin/bash

# Custom Domain Testing Setup Script
# This script helps you quickly set up a test environment for custom domains

echo "🚀 Custom Domain Testing Setup"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "Found project directory"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

print_status "Node.js is installed: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

print_status "npm is installed: $(npm --version)"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_info "Installing dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        print_status "Dependencies installed successfully"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
else
    print_status "Dependencies already installed"
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    print_warning ".env.local file not found"
    print_info "Please create .env.local with your environment variables:"
    echo ""
    echo "NEXT_PUBLIC_SUPABASE_URL=your_supabase_url"
    echo "SUPABASE_SERVICE_ROLE=your_service_role_key"
    echo "OPENAI_API_KEY=your_openai_key"
    echo ""
    print_info "You can copy from .env.example if it exists"
    if [ -f ".env.example" ]; then
        cp .env.example .env.local
        print_status "Created .env.local from .env.example"
        print_warning "Please update the values in .env.local"
    fi
else
    print_status ".env.local file exists"
fi

# Make test script executable
chmod +x test-custom-domain.js
print_status "Made test script executable"

# Run the test script
print_info "Running custom domain tests..."
echo ""

if node test-custom-domain.js; then
    print_status "All tests passed! 🎉"
else
    print_warning "Some tests failed. Check the output above for details."
fi

echo ""
echo "🧪 Testing Options:"
echo "==================="
echo ""
echo "1. Automated API Testing:"
echo "   node test-custom-domain.js"
echo ""
echo "2. Interactive Web Testing:"
echo "   npm run dev"
echo "   Then visit: http://localhost:3000/test-custom-domain"
echo ""
echo "3. Manual Domain Testing:"
echo "   - Set up a test domain (e.g., test-feedback.yourdomain.com)"
echo "   - Add DNS records as shown in the UI"
echo "   - Test domain verification"
echo ""
echo "4. Production Testing:"
echo "   - Run database migration: add-custom-domain-schema.sql"
echo "   - Test with real Pro users"
echo "   - Monitor error rates"
echo ""
echo "📚 Documentation:"
echo "================="
echo "- Testing Guide: CUSTOM_DOMAIN_TESTING_GUIDE.md"
echo "- Database Schema: add-custom-domain-schema.sql"
echo ""
print_status "Setup complete! Ready for custom domain testing."
