#!/usr/bin/env bash
# =============================================================================
# Needforfit AWS — Master deployment orchestrator
# =============================================================================
# Runs Phase 1 → 2.1 → 3 in order with checks, verification, and guidance.
#
# Usage:
#   bash scripts/setup-all.sh all     # Phase 1 + 2.1 + 3
#   bash scripts/setup-all.sh 1       # Phase 1 only
#   bash scripts/setup-all.sh 2       # Phase 2.1 only
#   bash scripts/setup-all.sh 3       # Phase 3 only
#   bash scripts/setup-all.sh help
#
# Optional env (skip prompts):
#   SSH_CIDR=203.0.113.10/32
#   DOMAIN_NAME=needforfit-app.withkris.life
#   DOMAIN_REGISTRAR="Namecheap"
#   AWS_REGION=ap-southeast-1
#
# Separate: ./scripts/setup-github-iam.sh (GitHub Actions credentials)
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SETUP_VARS="${SCRIPT_DIR}/setup-vars.sh"
EC2_KEY_NAME="${EC2_KEY_NAME:-needforfit-key}"
EC2_KEY_FILE="${EC2_KEY_FILE:-${SCRIPT_DIR}/../needforfit-key.pem}"
EXPECTED_REGION="${AWS_REGION:-ap-southeast-1}"

TARGET=""
START_PHASE=1
END_PHASE=3

declare -a COMPLETED_PHASES=()
declare -a FAILED_PHASES=()
declare -a SKIPPED_PHASES=()

# =============================================================================
# Error handling
# =============================================================================

on_error() {
  local exit_code=$?
  local line="${1:-unknown}"
  echo "" >&2
  echo "╔══════════════════════════════════════════════════════════════╗" >&2
  echo "║  DEPLOYMENT FAILED                                           ║" >&2
  echo "╚══════════════════════════════════════════════════════════════╝" >&2
  echo "  Exit code : ${exit_code}" >&2
  echo "  Near line : ${line}" >&2
  echo "" >&2
  echo "Common fixes:" >&2
  echo "  • AWS credentials:  aws configure" >&2
  echo "  • Wrong region:     export AWS_REGION=ap-southeast-1" >&2
  echo "  • Missing key pair: aws ec2 create-key-pair --key-name needforfit-key ..." >&2
  echo "  • Phase partial OK: re-run same phase (scripts are idempotent)" >&2
  echo "  • SSL stuck:        check ACM CNAME records in Route 53 hosted zone" >&2
  echo "" >&2
  echo "Re-run: bash scripts/setup-all.sh ${TARGET:-1}" >&2
  exit "${exit_code}"
}
trap 'on_error ${LINENO}' ERR

# =============================================================================
# UI helpers
# =============================================================================

print_banner() {
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║        Needforfit AWS Deployment — Master Orchestrator           ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
}

print_usage() {
  print_banner
  cat <<EOF
Usage: bash scripts/setup-all.sh <target>

Targets:
  all       Run Phase 1 → 2.1 → 3
  1         Phase 1 — VPC, Security, S3, Secrets, Route 53
  2         Phase 2.1 — EC2 instance
  3         Phase 3 — ALB, SSL, DNS

Examples:
  bash scripts/setup-all.sh all
  bash scripts/setup-all.sh 1
  SSH_CIDR=1.2.3.4/32 DOMAIN_NAME=needforfit-app.withkris.life bash scripts/setup-all.sh all

Prerequisites:
  AWS CLI, jq, openssl, python3
  AWS credentials with admin/IAM permissions
  EC2 key pair: needforfit-key (region ${EXPECTED_REGION})
  Private key file: needforfit-key.pem (for Phase 2 SSH checks)

EOF
}

log_step() { echo "==> $*"; }
log_ok()   { echo "  ✓ $*"; }
log_warn() { echo "  ⚠ $*"; }
log_fail() { echo "  ✗ $*" >&2; }

# =============================================================================
# Prerequisites
# =============================================================================

check_command() {
  local cmd="$1" label="$2" required="${3:-true}"
  if command -v "${cmd}" >/dev/null 2>&1; then
    log_ok "${label}"
    return 0
  fi
  if [[ "${required}" == "true" ]]; then
    log_fail "${label} — required but not installed"
    return 1
  fi
  log_warn "${label} — optional, not found"
  return 0
}

check_prerequisites() {
  log_step "Checking prerequisites..."
  local failed=0

  check_command aws "AWS CLI" true || failed=1
  check_command jq "jq (JSON parsing)" true || failed=1
  check_command openssl "OpenSSL" true || failed=1
  check_command python3 "Python 3 (ACM validation)" true || failed=1

  if [[ ${failed} -ne 0 ]]; then
    echo "" >&2
    echo "Install missing tools and retry." >&2
    exit 1
  fi

  log_step "Verifying AWS credentials & region..."
  if ! aws sts get-caller-identity >/dev/null 2>&1; then
    log_fail "AWS credentials not configured. Run: aws configure"
    exit 1
  fi

  local account configured_region
  account="$(aws sts get-caller-identity --query Account --output text)"
  configured_region="$(aws configure get region 2>/dev/null || true)"
  export AWS_REGION="${AWS_REGION:-${configured_region:-${EXPECTED_REGION}}}"
  export AWS_DEFAULT_REGION="${AWS_REGION}"

  log_ok "AWS account  : ${account}"
  log_ok "AWS region   : ${AWS_REGION}"

  if [[ "${AWS_REGION}" != "${EXPECTED_REGION}" ]]; then
    log_warn "Expected region ${EXPECTED_REGION}; using ${AWS_REGION}"
  fi

  if [[ "${START_PHASE}" -le 2 && "${END_PHASE}" -ge 2 ]]; then
    log_step "Checking EC2 key pair '${EC2_KEY_NAME}'..."
    if aws ec2 describe-key-pairs --key-names "${EC2_KEY_NAME}" --region "${AWS_REGION}" >/dev/null 2>&1; then
      log_ok "Key pair '${EC2_KEY_NAME}' exists"
    else
      log_fail "Key pair '${EC2_KEY_NAME}' not found in ${AWS_REGION}"
      echo "       Create: aws ec2 create-key-pair --key-name ${EC2_KEY_NAME} --query KeyMaterial --output text > needforfit-key.pem && chmod 400 needforfit-key.pem" >&2
      exit 1
    fi
  fi

  echo ""
}

# =============================================================================
# Setup — init vars & collect inputs
# =============================================================================

ensure_setup_vars() {
  if [[ ! -f "${SETUP_VARS}" ]]; then
    log_fail "Missing ${SETUP_VARS}"
    exit 1
  fi
  # shellcheck source=setup-vars.sh
  source "${SETUP_VARS}"
  log_ok "Loaded ${SETUP_VARS}"
}

collect_inputs() {
  # Only collect when running Phase 1 (or all from start)
  if [[ "${START_PHASE}" -gt 1 ]]; then
    return 0
  fi

  echo ""
  log_step "Essential inputs (exported to phase scripts)"
  echo ""

  if [[ -z "${SSH_CIDR:-}" ]]; then
    read -rp "Your public IP for SSH whitelist (e.g. 203.0.113.10 or 203.0.113.10/32): " SSH_CIDR
    [[ -z "${SSH_CIDR}" ]] && { log_fail "SSH CIDR is required"; exit 1; }
  fi
  [[ "${SSH_CIDR}" != */* ]] && SSH_CIDR="${SSH_CIDR}/32"
  export SSH_CIDR
  append_setup_var "SSH_CIDR" "${SSH_CIDR}" 2>/dev/null || true
  log_ok "SSH CIDR: ${SSH_CIDR}"

  if [[ -z "${USER_DOMAIN_NAME:-}" ]]; then
    read -rp "Domain name [${DOMAIN_NAME}]: " _domain_input
    DOMAIN_NAME="${_domain_input:-${DOMAIN_NAME}}"
  elif [[ -n "${USER_DOMAIN_NAME}" ]]; then
    DOMAIN_NAME="${USER_DOMAIN_NAME}"
  fi
  export DOMAIN_NAME
  export DOMAIN_NAME_INPUT="${DOMAIN_NAME}"
  append_setup_var "DOMAIN_NAME" "${DOMAIN_NAME}" 2>/dev/null || true
  log_ok "Domain: ${DOMAIN_NAME}"

  if [[ -z "${DOMAIN_REGISTRAR:-}" && -z "${USER_DOMAIN_REGISTRAR:-}" ]]; then
    read -rp "Domain registrar (optional, e.g. GoDaddy, Namecheap): " DOMAIN_REGISTRAR
    [[ -n "${DOMAIN_REGISTRAR}" ]] && append_setup_var "DOMAIN_REGISTRAR" "${DOMAIN_REGISTRAR}" 2>/dev/null || true
  elif [[ -n "${USER_DOMAIN_REGISTRAR:-}" ]]; then
    DOMAIN_REGISTRAR="${USER_DOMAIN_REGISTRAR}"
  fi
  [[ -n "${DOMAIN_REGISTRAR:-}" ]] && log_ok "Registrar: ${DOMAIN_REGISTRAR} (for NS instructions)"

  echo ""
}

# Load common helpers for append_setup_var during input collection
load_common() {
  # shellcheck source=lib/common.sh
  source "${SCRIPT_DIR}/lib/common.sh"
}

# =============================================================================
# Phase runners
# =============================================================================

run_script() {
  local label="$1" script="$2"
  local path="${SCRIPT_DIR}/${script}"

  if [[ ! -f "${path}" ]]; then
    log_fail "Script not found: ${path}"
    return 1
  fi

  chmod +x "${path}"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " ▶ ${label}"
  echo "   bash scripts/${script}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Re-source vars so child inherits latest exports
  # shellcheck source=setup-vars.sh
  source "${SETUP_VARS}"
  export SSH_CIDR DOMAIN_NAME DOMAIN_NAME_INPUT AWS_REGION

  bash "${path}"
}

verify_required_vars() {
  local phase="$1"
  shift
  local var missing=0
  for var in "$@"; do
    # shellcheck source=setup-vars.sh
    source "${SETUP_VARS}"
    if [[ -z "${!var:-}" ]]; then
      log_fail "Missing exported variable: ${var}"
      missing=1
    else
      log_ok "${var}=${!var}"
    fi
  done
  return "${missing}"
}

run_phase_1() {
  log_step "Phase 1 — VPC, Security, S3, Secrets, Route 53"
  run_script "Phase 1" "phase-1-all.sh"

  log_step "Verifying Phase 1 exports..."
  verify_required_vars 1 \
    VPC_ID IGW_ID SUBNET_1A SUBNET_1B ROUTE_TABLE_ID \
    ALB_SG EC2_SG S3_STATIC_BUCKET S3_BACKUP_BUCKET \
    HOSTED_ZONE_ID || return 1

  COMPLETED_PHASES+=("Phase 1")
  log_ok "Phase 1 complete"
}

run_phase_2() {
  log_step "Phase 2.1 — EC2 launch"
  run_script "Phase 2.1" "phase-2-1-ec2.sh"

  # shellcheck source=setup-vars.sh
  source "${SETUP_VARS}"

  log_step "Verifying Phase 2 exports..."
  verify_required_vars 2 INSTANCE_ID EC2_PUBLIC_IP EC2_PRIVATE_IP || return 1

  log_step "Waiting for EC2 bootstrap (cloud-init)..."
  verify_ec2_cloud_init || return 1

  COMPLETED_PHASES+=("Phase 2.1")
  log_ok "Phase 2.1 complete"
}

verify_ec2_cloud_init() {
  local ip="${EC2_PUBLIC_IP:-}"
  local key="${EC2_KEY_FILE}"
  local attempt max=12

  if [[ ! -f "${key}" ]]; then
    log_warn "SSH key not found at ${key} — skipping cloud-init log check"
    log_warn "Verify manually: ssh -i needforfit-key.pem ubuntu@${ip} 'tail /var/log/cloud-init-output.log'"
    return 0
  fi

  chmod 400 "${key}" 2>/dev/null || true

  for (( attempt=1; attempt<=max; attempt++ )); do
    if ssh -i "${key}" -o StrictHostKeyChecking=no -o ConnectTimeout=15 -o BatchMode=yes \
      "ubuntu@${ip}" \
      'grep -q "Needforfit EC2 bootstrap complete" /var/log/cloud-init-output.log 2>/dev/null ||
       grep -q "Needforfit EC2 bootstrap complete" /var/log/needforfit-bootstrap.log 2>/dev/null' 2>/dev/null; then
      log_ok "cloud-init bootstrap complete on ${ip}"
      return 0
    fi
    echo "  Waiting for cloud-init... (${attempt}/${max})"
    sleep 15
  done

  log_fail "cloud-init bootstrap not confirmed on ${ip}"
  echo "  Debug: ssh -i ${key} ubuntu@${ip} 'sudo tail -50 /var/log/cloud-init-output.log'" >&2
  return 1
}

run_phase_3() {
  log_step "Phase 3 — ALB, SSL, DNS"
  run_script "Phase 3" "phase-3-alb.sh"

  # shellcheck source=setup-vars.sh
  source "${SETUP_VARS}"

  log_step "Verifying Phase 3 exports..."
  verify_required_vars 3 TG_BACKEND_ARN ALB_ARN ALB_DNS ALB_HZ CERT_ARN || return 1

  log_step "Verifying ALB is active..."
  if aws elbv2 describe-load-balancers --load-balancer-arns "${ALB_ARN}" \
    --query 'LoadBalancers[0].State.Code' --output text 2>/dev/null | grep -q active; then
    log_ok "ALB state: active"
  else
    log_warn "ALB not yet active — may still be provisioning"
  fi

  log_step "Verifying Route 53 A record..."
  verify_dns_record || log_warn "DNS record verification inconclusive (propagation may be pending)"

  COMPLETED_PHASES+=("Phase 3")
  log_ok "Phase 3 complete"
}

verify_dns_record() {
  local zone domain
  zone="${HOSTED_ZONE_ID:-${ROUTE53_HOSTED_ZONE_ID:-}}"
  domain="${DOMAIN_NAME}."

  [[ -z "${zone}" ]] && return 1

  local records
  records="$(aws route53 list-resource-record-sets \
    --hosted-zone-id "${zone}" \
    --query "ResourceRecordSets[?Name=='${domain}' && Type=='A'] | length(@)" \
    --output text 2>/dev/null || echo 0)"

  if [[ "${records}" != "0" && -n "${records}" ]]; then
    log_ok "A record exists for ${DOMAIN_NAME}"
    return 0
  fi
  return 1
}

# =============================================================================
# Verification & instructions
# =============================================================================

print_verification() {
  # shellcheck source=setup-vars.sh
  source "${SETUP_VARS}" 2>/dev/null || true
  needforfit_sync_var_aliases 2>/dev/null || true

  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║                  Deployment Verification                    ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  echo "Resources (from setup-vars.sh):"
  echo "  Networking   VPC=${VPC_ID:-—}  SUBNET_1A=${SUBNET_1A:-—}  SUBNET_1B=${SUBNET_1B:-—}"
  echo "  Security     ALB_SG=${ALB_SG:-—}  EC2_SG=${EC2_SG:-—}  SSH=${SSH_CIDR:-—}"
  echo "  Storage      S3_STATIC=${S3_STATIC_BUCKET:-—}"
  echo "               S3_BACKUP=${S3_BACKUP_BUCKET:-—}"
  echo "  Compute      INSTANCE=${INSTANCE_ID:-—}  IP=${EC2_PUBLIC_IP:-—}"
  echo "  Load balancer ALB=${ALB_ARN:-—}"
  echo "               DNS=${ALB_DNS:-—}"
  echo "  SSL          CERT=${CERT_ARN:-—}"
  echo "  DNS zone     HOSTED_ZONE=${HOSTED_ZONE_ID:-—}  DOMAIN=${DOMAIN_NAME:-—}"
  echo ""
}

print_instructions() {
  # shellcheck source=setup-vars.sh
  source "${SETUP_VARS}" 2>/dev/null || true

  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║                  Next Steps & Instructions                  ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  echo "1. Domain nameservers (after Phase 1)"
  echo "   Update NS at ${DOMAIN_REGISTRAR:-your registrar} using:"
  echo "   cat scripts/route53-nameservers.txt"
  echo ""
  echo "2. SSL certificate (Phase 3 / ACM)"
  echo "   Validation is automatic via Route 53 if the domain uses AWS NS."
  echo "   Check status:"
  echo "   aws acm describe-certificate --certificate-arn ${CERT_ARN:-<CERT_ARN>} --query Certificate.Status"
  echo ""
  echo "3. Test deployment"
  echo "   curl -I https://${DOMAIN_NAME:-needforfit-app.withkris.life}/"
  echo "   curl https://${DOMAIN_NAME:-needforfit-app.withkris.life}/api/health"
  if [[ -n "${EC2_PUBLIC_IP:-}" ]]; then
    echo "   ssh -i needforfit-key.pem ubuntu@${EC2_PUBLIC_IP}"
  fi
  echo ""
  echo "4. Configure Nginx on EC2 (proxy /api → localhost:5000, serve static /*)"
  echo ""
  echo "5. GitHub Actions"
  echo "   ./scripts/setup-github-iam.sh"
  echo "   Set secrets: AWS_*, S3_STATIC_BUCKET, EC2_HOST, EC2_SSH_KEY, DATABASE_URL, JWT_SECRET"
  echo ""
  echo "6. Deploy application"
  echo "   Push to main → frontend-deploy.yml + backend-deploy.yml"
  echo ""
}

print_final_summary() {
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║                     Final Summary                           ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""

  if [[ ${#COMPLETED_PHASES[@]} -gt 0 ]]; then
    echo "Completed:"
    for p in "${COMPLETED_PHASES[@]}"; do echo "  ✓ ${p}"; done
    echo ""
  fi
  if [[ ${#SKIPPED_PHASES[@]} -gt 0 ]]; then
    echo "Skipped:"
    for p in "${SKIPPED_PHASES[@]}"; do echo "  ○ ${p}"; done
    echo ""
  fi
  if [[ ${#FAILED_PHASES[@]} -gt 0 ]]; then
    echo "Failed:"
    for p in "${FAILED_PHASES[@]}"; do echo "  ✗ ${p}"; done
    echo ""
    return 1
  fi

  if [[ ${#COMPLETED_PHASES[@]} -gt 0 ]]; then
    print_verification
    print_instructions
    echo "All requested phases finished successfully."
    echo "State file: ${SETUP_VARS}"
  fi
  return 0
}

# =============================================================================
# Target parsing & main
# =============================================================================

parse_target() {
  case "${1:-}" in
    all)   START_PHASE=1; END_PHASE=3 ;;
    1)     START_PHASE=1; END_PHASE=1 ;;
    2)     START_PHASE=2; END_PHASE=2 ;;
    3)     START_PHASE=3; END_PHASE=3 ;;
    1-3|"") START_PHASE=1; END_PHASE=3 ;;
    help|-h|--help) print_usage; exit 0 ;;
    *)
      log_fail "Unknown target: $1"
      print_usage
      exit 1
      ;;
  esac
}

main() {
  TARGET="${1:-}"

  case "${TARGET}" in
    help|-h|--help|"") print_usage; exit 0 ;;
  esac

  # Preserve env overrides set before sourcing setup-vars (defaults would mask them)
  USER_DOMAIN_NAME="${DOMAIN_NAME:-}"
  USER_DOMAIN_REGISTRAR="${DOMAIN_REGISTRAR:-}"

  parse_target "${TARGET}"
  print_banner
  echo "Target: phases ${START_PHASE} → ${END_PHASE}"
  echo ""

  check_prerequisites
  ensure_setup_vars
  load_common
  collect_inputs

  # Disable ERR trap during phase dispatch so we control failure flow
  trap - ERR

  if [[ "${START_PHASE}" -le 1 && "${END_PHASE}" -ge 1 ]]; then
    run_phase_1 || { FAILED_PHASES+=("Phase 1"); print_final_summary; exit 1; }
  else
    SKIPPED_PHASES+=("Phase 1")
  fi

  if [[ "${START_PHASE}" -le 2 && "${END_PHASE}" -ge 2 ]]; then
    run_phase_2 || { FAILED_PHASES+=("Phase 2.1"); print_final_summary; exit 1; }
  else
    SKIPPED_PHASES+=("Phase 2.1")
  fi

  if [[ "${START_PHASE}" -le 3 && "${END_PHASE}" -ge 3 ]]; then
    run_phase_3 || { FAILED_PHASES+=("Phase 3"); print_final_summary; exit 1; }
  else
    SKIPPED_PHASES+=("Phase 3")
  fi

  print_final_summary
}

main "$@"
