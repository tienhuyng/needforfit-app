#!/usr/bin/env bash
# =============================================================================
# Needforfit — GitHub Actions secrets helper
# =============================================================================
# After AWS deployment, prints repository secrets to add in GitHub.
#
# Usage:
#   bash scripts/github-secrets-updater.sh           # print to stdout
#   bash scripts/github-secrets-updater.sh --write   # also update github-secrets-setup.txt
#   bash scripts/github-secrets-updater.sh --check   # exit 1 if required values missing
#
# Reads:
#   scripts/setup-vars.sh          — S3 buckets, EC2 IP, domain, etc.
#   scripts/github-secrets-setup.txt (optional) — AWS IAM keys from setup-github-iam.sh
#   scripts/aws-secrets.txt        (optional) — pre-generated JWT/DB (generate-aws-secrets.sh)
#   scripts/phase-1-secrets.txt    (optional) — JWT_SECRET, DB_PASSWORD from Phase 1
#   needforfit-key.pem                   (optional) — EC2_SSH_KEY source file
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SETUP_VARS="${SCRIPT_DIR}/setup-vars.sh"
IAM_SECRETS_FILE="${SCRIPT_DIR}/github-secrets-setup.txt"
AWS_SECRETS_FILE="${SCRIPT_DIR}/aws-secrets.txt"
PHASE1_SECRETS="${SCRIPT_DIR}/phase-1-secrets.txt"
EC2_KEY_FILE="${EC2_KEY_FILE:-${SCRIPT_DIR}/../needforfit-key.pem}"
OUTPUT_FILE="${SCRIPT_DIR}/github-secrets-setup.txt"

WRITE_FILE=false
CHECK_ONLY=false
EC2_USER_DEFAULT="ubuntu"

usage() {
  cat <<EOF
Usage: bash scripts/github-secrets-updater.sh [options]

Options:
  --write   Merge deployment values into ${OUTPUT_FILE}
  --check   Exit 1 if any required secret value is missing
  -h, --help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --write) WRITE_FILE=true ;;
    --check) CHECK_ONLY=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
  shift
done

# -----------------------------------------------------------------------------
# Load deployment state
# -----------------------------------------------------------------------------

if [[ ! -f "${SETUP_VARS}" ]]; then
  echo "ERROR: ${SETUP_VARS} not found. Run AWS deployment first." >&2
  exit 1
fi

# shellcheck source=setup-vars.sh
source "${SETUP_VARS}"
needforfit_sync_var_aliases 2>/dev/null || true

S3_STATIC_BUCKET="${S3_STATIC_BUCKET:-}"
S3_BACKUP_BUCKET="${S3_BACKUP_BUCKET:-}"
EC2_HOST="${EC2_PUBLIC_IP:-${EC2_HOST:-}}"
EC2_USER="${EC2_USER:-${EC2_USER_DEFAULT}}"
AWS_REGION="${AWS_REGION:-ap-southeast-1}"
ECR_REPOSITORY="${ECR_REPOSITORY:-needforfit-backend}"

# Optional: IAM keys from setup-github-iam.sh output
AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-}"
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-}"

if [[ -f "${IAM_SECRETS_FILE}" ]]; then
  while IFS='=' read -r key value; do
    [[ "${key}" =~ ^#.*$ || -z "${key}" ]] && continue
    key="$(echo "${key}" | tr -d '[:space:]')"
    value="$(echo "${value}" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
    case "${key}" in
      AWS_ACCESS_KEY_ID) [[ -z "${AWS_ACCESS_KEY_ID}" ]] && AWS_ACCESS_KEY_ID="${value}" ;;
      AWS_SECRET_ACCESS_KEY) [[ -z "${AWS_SECRET_ACCESS_KEY}" ]] && AWS_SECRET_ACCESS_KEY="${value}" ;;
    esac
  done < "${IAM_SECRETS_FILE}"
fi

# Optional: app secrets from phase 1
JWT_SECRET="${JWT_SECRET:-}"
DB_PASSWORD="${DB_PASSWORD:-}"

load_secrets_file() {
  local file="$1"
  [[ -f "${file}" ]] || return 0
  while IFS='=' read -r key value; do
    [[ "${key}" =~ ^#.*$ || -z "${key}" ]] && continue
    key="$(echo "${key}" | tr -d '[:space:]')"
    value="$(echo "${value}" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
    case "${key}" in
      JWT_SECRET) [[ -z "${JWT_SECRET}" ]] && JWT_SECRET="${value}" ;;
      DB_PASSWORD) [[ -z "${DB_PASSWORD}" ]] && DB_PASSWORD="${value}" ;;
      DATABASE_URL) [[ -z "${DATABASE_URL:-}" ]] && DATABASE_URL="${value}" ;;
    esac
  done < "${file}"
}

load_secrets_file "${AWS_SECRETS_FILE}"
load_secrets_file "${PHASE1_SECRETS}"

# Suggested DATABASE_URL for EC2-local PostgreSQL
DATABASE_URL="${DATABASE_URL:-}"
if [[ -z "${DATABASE_URL}" && -n "${DB_PASSWORD}" ]]; then
  DATABASE_URL="postgresql://postgres:${DB_PASSWORD}@localhost:5432/needforfit_db"
fi

EC2_SSH_KEY_STATUS="not found"
if [[ -f "${EC2_KEY_FILE}" ]]; then
  EC2_SSH_KEY_STATUS="ready (${EC2_KEY_FILE})"
fi

# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------

mask_value() {
  local v="$1"
  [[ -z "${v}" ]] && { echo "<not set>"; return; }
  if [[ ${#v} -le 8 ]]; then
    echo "****"
  else
    echo "${v:0:4}...${v: -4}"
  fi
}

print_secret_row() {
  local name="$1" value="$2" source="$3" required="${4:-true}"
  local display status

  if [[ -n "${value}" ]]; then
    if [[ "${name}" == *KEY* || "${name}" == *SECRET* || "${name}" == *PASSWORD* || "${name}" == DATABASE_URL ]]; then
      display="$(mask_value "${value}")"
    else
      display="${value}"
    fi
    status="✓"
  else
    display="<missing>"
    status="✗"
    [[ "${required}" == "false" ]] && status="○"
  fi

  printf "  %-22s %-36s %s  (%s)\n" "${name}" "${display}" "${status}" "${source}"
}

missing_required=0

check_required() {
  local name="$1" value="$2"
  if [[ -z "${value}" ]]; then
    missing_required=1
  fi
}

# -----------------------------------------------------------------------------
# Console output — copy-paste friendly
# -----------------------------------------------------------------------------

print_report() {
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║         GitHub Actions — Repository Secrets                  ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  echo "Add at: GitHub repo → Settings → Secrets and variables → Actions"
  echo "        → New repository secret (one name + value per secret)"
  echo ""
  echo "── Summary ────────────────────────────────────────────────────"
  print_secret_row "S3_STATIC_BUCKET" "${S3_STATIC_BUCKET}" "setup-vars.sh"
  print_secret_row "S3_BACKUP_BUCKET" "${S3_BACKUP_BUCKET}" "setup-vars.sh" "false"
  print_secret_row "EC2_HOST" "${EC2_HOST}" "EC2_PUBLIC_IP"
  print_secret_row "EC2_USER" "${EC2_USER}" "default"
  print_secret_row "AWS_ACCESS_KEY_ID" "${AWS_ACCESS_KEY_ID}" "setup-github-iam.sh"
  print_secret_row "AWS_SECRET_ACCESS_KEY" "${AWS_SECRET_ACCESS_KEY}" "setup-github-iam.sh"
  print_secret_row "JWT_SECRET" "${JWT_SECRET}" "phase-1-secrets.txt"
  print_secret_row "DATABASE_URL" "${DATABASE_URL}" "phase-1-secrets.txt"
  echo "  EC2_SSH_KEY            ${EC2_SSH_KEY_STATUS}"
  echo ""

  echo "── Copy-paste block (name → value) ───────────────────────────"
  echo ""
  cat <<EOF
# --- From AWS deployment (setup-vars.sh) ---
S3_STATIC_BUCKET=${S3_STATIC_BUCKET:-<run phase 1>}
S3_BACKUP_BUCKET=${S3_BACKUP_BUCKET:-<run phase 1>}
EC2_HOST=${EC2_HOST:-<run phase 2>}
EC2_USER=${EC2_USER}

# --- From setup-github-iam.sh (scripts/github-secrets-setup.txt) ---
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID:-<run ./scripts/setup-github-iam.sh>}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY:-<from github-secrets-setup.txt>}

# --- From phase-1-secrets.txt (DO NOT COMMIT) ---
JWT_SECRET=${JWT_SECRET:-<scripts/phase-1-secrets.txt>}
DATABASE_URL=${DATABASE_URL:-postgresql://postgres:PASSWORD@localhost:5432/needforfit_db}

# --- EC2 SSH private key (paste full PEM contents) ---
# Source file: ${EC2_KEY_FILE}
# EC2_SSH_KEY=<paste contents of needforfit-key.pem>
EOF
  echo ""

  echo "── GitHub CLI (optional) ─────────────────────────────────────"
  if command -v gh >/dev/null 2>&1; then
    echo "  gh secret set S3_STATIC_BUCKET --body \"${S3_STATIC_BUCKET:-VALUE}\""
    echo "  gh secret set EC2_HOST --body \"${EC2_HOST:-VALUE}\""
    echo "  gh secret set EC2_USER --body \"${EC2_USER}\""
    echo "  gh secret set AWS_ACCESS_KEY_ID --body \"<from github-secrets-setup.txt>\""
    echo "  gh secret set AWS_SECRET_ACCESS_KEY --body \"<from github-secrets-setup.txt>\""
    echo "  gh secret set JWT_SECRET --body \"<from phase-1-secrets.txt>\""
    echo "  gh secret set DATABASE_URL --body \"<postgresql URL>\""
    echo "  gh secret set EC2_SSH_KEY < ${EC2_KEY_FILE}"
  else
    echo "  Install GitHub CLI (gh) to set secrets from the terminal."
  fi
  echo ""

  echo "── Workflows using these secrets ─────────────────────────────"
  echo "  frontend-deploy.yml : AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_STATIC_BUCKET"
  echo "  backend-deploy.yml  : AWS_*, EC2_SSH_KEY, EC2_HOST, EC2_USER, DATABASE_URL, JWT_SECRET"
  echo ""

  check_required "S3_STATIC_BUCKET" "${S3_STATIC_BUCKET}"
  check_required "EC2_HOST" "${EC2_HOST}"
  check_required "AWS_ACCESS_KEY_ID" "${AWS_ACCESS_KEY_ID}"
  check_required "AWS_SECRET_ACCESS_KEY" "${AWS_SECRET_ACCESS_KEY}"
  check_required "JWT_SECRET" "${JWT_SECRET}"
  check_required "DATABASE_URL" "${DATABASE_URL}"

  if [[ ! -f "${EC2_KEY_FILE}" ]]; then
    missing_required=1
    echo "⚠  EC2_SSH_KEY: place private key at ${EC2_KEY_FILE} and paste PEM into GitHub."
  fi

  if [[ ${missing_required} -ne 0 ]]; then
    echo "Some required values are missing. Complete AWS setup and re-run this script."
  else
    echo "All required deployment values are available locally."
  fi
  echo ""
}

write_merged_file() {
  local tmp
  tmp="$(mktemp)"

  cat > "${tmp}" <<EOF
# Needforfit GitHub Actions — merged secrets reference
# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# WARNING: Contains secrets. DO NOT COMMIT THIS FILE.
#
# GitHub: Settings → Secrets and variables → Actions → New repository secret

# --- AWS IAM (from setup-github-iam.sh) ---
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID:-<not set>}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY:-<not set>}

# --- From AWS deployment (setup-vars.sh) ---
AWS_REGION=${AWS_REGION}
S3_STATIC_BUCKET=${S3_STATIC_BUCKET:-<not set>}
S3_BACKUP_BUCKET=${S3_BACKUP_BUCKET:-<not set>}
EC2_HOST=${EC2_HOST:-<not set>}
EC2_USER=${EC2_USER}

# --- Application secrets (from phase-1-secrets.txt) ---
JWT_SECRET=${JWT_SECRET:-<not set>}
DATABASE_URL=${DATABASE_URL:-<not set>}

# --- EC2 SSH ---
# Paste full PEM into GitHub secret EC2_SSH_KEY (file: ${EC2_KEY_FILE})

# --- Reference (not GitHub secrets) ---
ECR_REPOSITORY=${ECR_REPOSITORY}
DOMAIN_NAME=${DOMAIN_NAME:-}
INSTANCE_ID=${INSTANCE_ID:-}
EOF

  chmod 600 "${tmp}"
  mv "${tmp}" "${OUTPUT_FILE}"
  echo "Updated: ${OUTPUT_FILE}"
}

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------

print_report

if [[ "${WRITE_FILE}" == "true" ]]; then
  write_merged_file
fi

if [[ "${CHECK_ONLY}" == "true" && ${missing_required} -ne 0 ]]; then
  exit 1
fi

exit 0
