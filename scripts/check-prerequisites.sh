#!/usr/bin/env bash
# =============================================================================
# Needforfit — Check deploy prerequisites
# =============================================================================
# Verifies local tools and SSH key before AWS deploy or CI/CD setup.
#
# Usage:
#   bash scripts/check-prerequisites.sh
#   bash scripts/check-prerequisites.sh --strict   # also require Docker daemon running
#
# Checks:
#   - AWS CLI (installed + credentials)
#   - Docker (installed; daemon optional unless --strict)
#   - jq
#   - SSH key (needforfit-key.pem locally + key pair in AWS)
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EC2_KEY_NAME="${EC2_KEY_NAME:-needforfit-key}"
EC2_KEY_FILE="${EC2_KEY_FILE:-${SCRIPT_DIR}/../${EC2_KEY_NAME}.pem}"
AWS_REGION="${AWS_REGION:-ap-southeast-1}"
STRICT=false

declare -i CHECKS_PASSED=0
declare -i CHECKS_FAILED=0
declare -i CHECKS_WARN=0

usage() {
  cat <<EOF
Usage: bash scripts/check-prerequisites.sh [--strict]

Options:
  --strict   Fail if Docker daemon is not running
  -h, --help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --strict) STRICT=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "ERROR: Unknown option: $1" >&2; usage; exit 1 ;;
  esac
  shift
done

log_ok()   { echo "  ✓ $*"; CHECKS_PASSED=$((CHECKS_PASSED + 1)); }
log_fail() { echo "  ✗ $*" >&2; CHECKS_FAILED=$((CHECKS_FAILED + 1)); }
log_warn() { echo "  ⚠ $*"; CHECKS_WARN=$((CHECKS_WARN + 1)); }

check_command() {
  local cmd="$1" label="$2" install_hint="$3"
  if command -v "${cmd}" >/dev/null 2>&1; then
    local version=""
    case "${cmd}" in
      aws) version="$(aws --version 2>&1 | head -1)" ;;
      docker) version="$(docker --version 2>&1)" ;;
      jq) version="$(jq --version 2>&1)" ;;
      *) version="$("${cmd}" --version 2>&1 | head -1 || true)" ;;
    esac
    log_ok "${label}${version:+ — ${version}}"
    return 0
  fi
  log_fail "${label} — not installed"
  [[ -n "${install_hint}" ]] && echo "      Install: ${install_hint}" >&2
  return 1
}

print_banner() {
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║         Needforfit — Prerequisites Check                     ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
}

print_banner

# -----------------------------------------------------------------------------
# 1. AWS CLI
# -----------------------------------------------------------------------------
echo "── AWS CLI ────────────────────────────────────────────────────"
if check_command aws "AWS CLI" "brew install awscli"; then
  echo "  Checking credentials..."
  if aws sts get-caller-identity >/dev/null 2>&1; then
    account="$(aws sts get-caller-identity --query Account --output text)"
    arn="$(aws sts get-caller-identity --query Arn --output text)"
    configured_region="$(aws configure get region 2>/dev/null || true)"
    export AWS_DEFAULT_REGION="${AWS_REGION:-${configured_region:-ap-southeast-1}}"
    log_ok "Credentials OK — account ${account}"
    echo "      Identity : ${arn}"
    echo "      Region   : ${AWS_DEFAULT_REGION}"
  else
    log_fail "AWS credentials not configured"
    echo "      Run: aws configure" >&2
  fi
else
  :
fi
echo ""

# -----------------------------------------------------------------------------
# 2. Docker
# -----------------------------------------------------------------------------
echo "── Docker ─────────────────────────────────────────────────────"
if check_command docker "Docker CLI" "Install Docker Desktop: https://www.docker.com/products/docker-desktop/"; then
  if docker info >/dev/null 2>&1; then
    log_ok "Docker daemon is running"
  elif [[ "${STRICT}" == "true" ]]; then
    log_fail "Docker daemon is not running (start Docker Desktop)"
  else
    log_warn "Docker installed but daemon not running (OK for AWS deploy scripts; needed for local image builds)"
  fi
fi
echo ""

# -----------------------------------------------------------------------------
# 3. jq
# -----------------------------------------------------------------------------
echo "── jq ─────────────────────────────────────────────────────────"
check_command jq "jq" "brew install jq" || true
echo ""

# -----------------------------------------------------------------------------
# 4. SSH key (local PEM + AWS key pair)
# -----------------------------------------------------------------------------
echo "── SSH key (${EC2_KEY_NAME}) ─────────────────────────────────────"
if [[ -f "${EC2_KEY_FILE}" ]]; then
  perms="$(stat -f '%Lp' "${EC2_KEY_FILE}" 2>/dev/null || stat -c '%a' "${EC2_KEY_FILE}" 2>/dev/null || echo '?')"
  if [[ "${perms}" == "400" || "${perms}" == "600" ]]; then
    log_ok "Local PEM: ${EC2_KEY_FILE} (mode ${perms})"
  else
    log_warn "Local PEM exists but permissions are ${perms} (recommended: 400)"
    echo "      Fix: chmod 400 ${EC2_KEY_FILE}"
  fi
else
  log_fail "Local PEM not found: ${EC2_KEY_FILE}"
  echo "      Run: bash scripts/create-ec2-keypair.sh" >&2
fi

if command -v aws >/dev/null 2>&1 && aws sts get-caller-identity >/dev/null 2>&1; then
  region="${AWS_DEFAULT_REGION:-${AWS_REGION}}"
  if aws ec2 describe-key-pairs --key-names "${EC2_KEY_NAME}" --region "${region}" >/dev/null 2>&1; then
    log_ok "AWS key pair '${EC2_KEY_NAME}' exists in ${region}"
  else
    log_fail "AWS key pair '${EC2_KEY_NAME}' not found in ${region}"
    echo "      Run: bash scripts/create-ec2-keypair.sh" >&2
  fi
else
  log_warn "Skipped AWS key pair check (AWS CLI/credentials unavailable)"
fi
echo ""

# -----------------------------------------------------------------------------
# Optional (full setup-all.sh deploy)
# -----------------------------------------------------------------------------
echo "── Optional (setup-all.sh) ────────────────────────────────────"
for cmd_label_hint in "openssl:OpenSSL:brew install openssl" "python3:Python 3:brew install python"; do
  IFS=':' read -r cmd label hint <<< "${cmd_label_hint}"
  if command -v "${cmd}" >/dev/null 2>&1; then
    log_ok "${label}"
  else
    log_warn "${label} — not installed (${hint})"
  fi
done
echo ""

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                         Summary                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  Passed : ${CHECKS_PASSED}"
echo "  Failed : ${CHECKS_FAILED}"
echo "  Warn   : ${CHECKS_WARN}"
echo ""

if [[ ${CHECKS_FAILED} -gt 0 ]]; then
  echo "Fix failed checks above, then re-run:"
  echo "  bash scripts/check-prerequisites.sh"
  exit 1
fi

echo "All required prerequisites are ready."
if [[ ${CHECKS_WARN} -gt 0 ]]; then
  echo "Review warnings above before deploy."
fi
echo ""
echo "Next:"
echo "  bash scripts/generate-aws-secrets.sh      # pre-generate JWT/DB"
echo "  bash scripts/create-ec2-keypair.sh        # if SSH key still missing"
echo "  bash scripts/setup-all.sh all             # deploy AWS infrastructure"
exit 0
