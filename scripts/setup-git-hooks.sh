#!/usr/bin/env bash
set -euo pipefail

git config core.hooksPath .githooks
chmod +x .githooks/pre-commit scripts/secret-scan.sh

echo "✅ Git hooks path set to .githooks"
echo "   Secret scanning pre-commit hook is now active."
