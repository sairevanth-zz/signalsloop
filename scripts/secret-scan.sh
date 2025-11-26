#!/usr/bin/env bash
#
# Secret scanning helper used by the pre-commit hook. It inspects the staged
# versions of tracked files for well-known API-key/JWT patterns so we can block
# accidental commits before they happen.

set -euo pipefail

if [[ "${SKIP_SECRET_SCAN:-0}" == "1" ]]; then
  echo "⚠️  Secret scan skipped because SKIP_SECRET_SCAN=1"
  exit 0
fi

# Using standard grep instead of ripgrep

staged_files=$(git diff --cached --name-only --diff-filter=ACMR)

if [[ -z "${staged_files}" ]]; then
  exit 0
fi

patterns=(
  'sk_(live|test)_[0-9A-Za-z]{20,}'          # Stripe secret keys
  'pk_(live|test)_[0-9A-Za-z]{20,}'          # Stripe publishable keys
  'whsec_[0-9A-Za-z]{10,}'                   # Stripe webhook secrets
  're_[A-Za-z0-9_-]{20,}'                    # Resend / other keys starting with re_
  'eyJ[A-Za-z0-9._-]{10,}\.[A-Za-z0-9._-]{10,}\.[A-Za-z0-9._-]{10,}' # JWT tokens
  'AIza[0-9A-Za-z_-]{35}'                    # Google API keys
  'xox[baprs]-[A-Za-z0-9_-]{10,}'            # Slack tokens
  'SUPABASE_SERVICE_ROLE[[:space:]]*='       # Supabase service role key assignment
  'NEXT_PUBLIC_SUPABASE_ANON_KEY[[:space:]]*=' # Supabase anon key assignment
  'OPENAI_API_KEY[[:space:]]*='              # OpenAI keys
  'sk-proj-[A-Za-z0-9_-]{30,}'               # OpenAI project keys
  '-----BEGIN (RSA )?PRIVATE KEY-----'       # PEM private keys
)

pattern_args=()
for pattern in "${patterns[@]}"; do
  pattern_args+=("-e" "$pattern")
done

tmpfile=$(mktemp)
trap 'rm -f "$tmpfile"' EXIT

found=0
while IFS= read -r file; do
  # Skip deleted files
  if ! git ls-files --error-unmatch "$file" >/dev/null 2>&1; then
    continue
  fi

  match_tmp=$(mktemp)
  if git show ":$file" 2>/dev/null | grep -nE "${pattern_args[@]}" --color=never >"$match_tmp" 2>/dev/null; then
    sed "s#^#$file:#" "$match_tmp" >>"$tmpfile"
    found=1
  fi
  rm -f "$match_tmp"

done <<<"$staged_files"

if [[ $found -eq 1 ]]; then
  echo "❌ Potential secrets detected in staged changes:"
  cat "$tmpfile"
  echo
  echo "Fix or intentionally mask the values, then restage your changes."
  echo "If this is a false positive, set SKIP_SECRET_SCAN=1 for a single commit."
  exit 1
fi

exit 0
