#!/bin/bash

# CodeRabbit Pre-commit Hook
# Runs CodeRabbit review before committing changes

echo "🤖 Running CodeRabbit pre-commit review..."

# Set CodeRabbit CLI path
CODERABBIT_CLI="/Users/revanth/.local/bin/coderabbit"

# Check if CodeRabbit CLI is available
if [ ! -f "$CODERABBIT_CLI" ]; then
    echo "⚠️  CodeRabbit CLI not found. Installing..."
    curl -fsSL https://cli.coderabbit.ai/install.sh | sh
fi

# Check authentication status
if ! "$CODERABBIT_CLI" auth status &> /dev/null; then
    echo "⚠️  Not authenticated with CodeRabbit. Please run: $CODERABBIT_CLI auth login"
    echo "   Continuing with commit..."
    exit 0
fi

# Run CodeRabbit review
echo "📋 Reviewing changes..."
if "$CODERABBIT_CLI" review --plain -c .coderabbit.yaml; then
    echo "✅ CodeRabbit review completed successfully"
else
    echo "⚠️  CodeRabbit review found issues. Check the output above."
    echo "   You can still commit by running: git commit --no-verify"
    read -p "   Do you want to continue with the commit? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Commit cancelled"
        exit 1
    fi
fi

echo "✅ Pre-commit hook completed"
