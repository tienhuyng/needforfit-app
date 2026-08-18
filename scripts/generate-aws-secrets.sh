#!/usr/bin/env bash
# =============================================================================
# Needforfit — Pre-generate app secrets before AWS deploy
# =============================================================================
# Generate JWT_SECRET and DB_PASSWORD locally so you can save them before
# running setup-all.sh on deploy day.
#
# Usage:
#   bash scripts/generate-aws-secrets.sh
#   bash scripts/generate-aws-secrets.sh --force   # overwrite existing file
#
# Output:
#   scripts/aws-secrets.txt  (DO NOT COMMIT — gitignored)
#
# After deploy, use github-secrets-updater.sh for the full GitHub secrets list.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_FILE="${SCRIPT_DIR}/aws-secrets.txt"
AWS_REGION="${AWS_REGION:-ap-southeast-1}"
DB_NAME="${DB_NAME:-needforfit_db}"
FORCE=false

usage() {
  cat <<EOF
Usage: bash scripts/generate-aws-secrets.sh [--force]

Generates JWT_SECRET and DB_PASSWORD with openssl and saves to:
  ${OUTPUT_FILE}

Options:
  --force   Overwrite existing file without prompting
  -h, --help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --force) FORCE=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "ERROR: Unknown option: $1" >&2; usage; exit 1 ;;
  esac
  shift
done

if ! command -v openssl >/dev/null 2>&1; then
  echo "ERROR: openssl is required." >&2
  exit 1
fi

if [[ -f "${OUTPUT_FILE}" && "${FORCE}" != "true" ]]; then
  echo "ERROR: ${OUTPUT_FILE} already exists." >&2
  echo "       Use --force to regenerate (old values will be lost)." >&2
  exit 1
fi

JWT_SECRET="$(openssl rand -hex 32)"
DB_PASSWORD="$(openssl rand -hex 16)"
DATABASE_URL="postgresql://postgres:${DB_PASSWORD}@localhost:5432/${DB_NAME}"
GENERATED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

cat > "${OUTPUT_FILE}" <<EOF
# Needforfit — pre-generated app secrets
# Generated: ${GENERATED_AT}
# WARNING: DO NOT COMMIT THIS FILE.
#
# Use on deploy day:
#   - Phase 1 stores JWT/DB password in AWS Secrets Manager (or generates new ones)
#   - GitHub secret JWT_SECRET → value below
#   - GitHub secret DATABASE_URL → value below
#
# Copy-paste to GitHub (Settings → Secrets → Actions → New repository secret):

JWT_SECRET=${JWT_SECRET}
DB_PASSWORD=${DB_PASSWORD}
DATABASE_URL=${DATABASE_URL}
AWS_REGION=${AWS_REGION}

# Human-readable reference
# JWT_SECRET
# ${JWT_SECRET}
#
# DB_PASSWORD
# ${DB_PASSWORD}
#
# DATABASE_URL (production EC2 PostgreSQL)
# ${DATABASE_URL}
#
# Region
# ${AWS_REGION}
EOF

chmod 600 "${OUTPUT_FILE}"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           App secrets generated                               ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Saved to: ${OUTPUT_FILE}"
echo ""
echo "  JWT_SECRET   = $(printf '%.8s...' "${JWT_SECRET}") (masked)"
echo "  DB_PASSWORD  = $(printf '%.8s...' "${DB_PASSWORD}") (masked)"
echo "  DATABASE_URL = postgresql://postgres:***@localhost:5432/${DB_NAME}"
echo "  AWS_REGION   = ${AWS_REGION}"
echo ""
echo "Next steps:"
echo "  1. Back up ${OUTPUT_FILE} somewhere secure (password manager, encrypted drive)"
echo "  2. On deploy day: bash scripts/setup-all.sh all"
echo "  3. Add GitHub secrets: bash scripts/github-secrets-updater.sh"
echo ""
echo "Full values (save now — shown once):"
echo "────────────────────────────────────"
grep -E '^(JWT_SECRET|DB_PASSWORD|DATABASE_URL|AWS_REGION)=' "${OUTPUT_FILE}"
echo "────────────────────────────────────"
