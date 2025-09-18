#!/bin/bash

echo "🤖 AI Features Setup Script"
echo "=========================="

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local file not found!"
    echo "📋 Please create .env.local from env.example first:"
    echo "   cp env.example .env.local"
    echo ""
    echo "Then edit .env.local with your actual values."
    exit 1
fi

echo "✅ .env.local file found"
echo ""

# Check for required environment variables
echo "🔍 Checking required environment variables..."

# Check OPENAI_API_KEY
if grep -q "OPENAI_API_KEY=sk-" .env.local; then
    echo "✅ OPENAI_API_KEY is set"
else
    echo "❌ OPENAI_API_KEY is missing or invalid"
    echo "   Please add your OpenAI API key to .env.local"
    echo "   OPENAI_API_KEY=sk-your_actual_key_here"
fi

# Check NEXT_PUBLIC_SITE_URL
if grep -q "NEXT_PUBLIC_SITE_URL=" .env.local; then
    echo "✅ NEXT_PUBLIC_SITE_URL is set"
else
    echo "❌ NEXT_PUBLIC_SITE_URL is missing"
    echo "   Please add your site URL to .env.local"
    echo "   NEXT_PUBLIC_SITE_URL=https://your-domain.com"
fi

# Check SUPABASE_SERVICE_ROLE
if grep -q "SUPABASE_SERVICE_ROLE=" .env.local; then
    echo "✅ SUPABASE_SERVICE_ROLE is set"
else
    echo "❌ SUPABASE_SERVICE_ROLE is missing"
    echo "   Please add your Supabase service role key to .env.local"
fi

echo ""
echo "📋 Next Steps:"
echo "1. Run the database schema in Supabase SQL Editor"
echo "2. Add missing environment variables to .env.local"
echo "3. Test the features with: node test-ai-features.js"
echo ""
echo "📖 See AI_FEATURES_SETUP_GUIDE.md for detailed instructions"
