#!/usr/bin/env bash
# =============================================================================
# Needforfit AWS — Central deployment variables
# =============================================================================
#
# USAGE
# -----
# Source from any deployment script (recommended):
#   SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
#   source "${SCRIPT_DIR}/setup-vars.sh"
#
# Export overrides before sourcing:
#   export AWS_REGION=ap-southeast-1
#   export APP_NAME=needforfit
#   export DOMAIN_NAME=training.withkris.life
#   source scripts/setup-vars.sh
#
# Run directly to print current configuration:
#   ./scripts/setup-vars.sh
#   ./scripts/setup-vars.sh status
#
# APPENDING VARIABLES (from phase scripts)
# ----------------------------------------
# Phase scripts use append_setup_var in lib/common.sh to persist resource IDs
# between the markers below. Do not hand-edit appended lines unless recovering
# from a failed run.
#
#   append_setup_var "VPC_ID" "vpc-0abc123"
#
# Phase 1 appends: VPC_ID, IGW_ID, SUBNET_1A, SUBNET_1B, ALB_SG, EC2_SG,
#                   S3_STATIC_BUCKET, SECRET_* , ROUTE53_*
# Phase 2 appends: INSTANCE_ID, EC2_PUBLIC_IP, EC2_PRIVATE_IP
# Phase 3 appends: ALB_ARN, ALB_DNS, CERT_ARN, target groups, listeners
#
# SAFETY
# ------
# - Safe to commit: contains resource IDs only, no secrets
# - Idempotent: re-sourcing is guarded by NEEDFORFIT_SETUP_VARS_LOADED
# - If AWS CLI is available, AWS_ACCOUNT_ID is resolved automatically
# =============================================================================

# -----------------------------------------------------------------------------
# Initialize core variables (defaults)
# -----------------------------------------------------------------------------
export AWS_REGION="${AWS_REGION:-ap-southeast-1}"
export APP_NAME="${APP_NAME:-needforfit}"
export PROJECT_NAME="${APP_NAME}"                       # legacy alias used by phase scripts
export DOMAIN_NAME="${DOMAIN_NAME:-training.withkris.life}"
export ENV_NAME="${ENV_NAME:-prod}"
export TIMESTAMP="${TIMESTAMP:-$(date +%s)}"

if command -v aws >/dev/null 2>&1; then
  export AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text 2>/dev/null || true)}"
else
  export AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-}"
fi

# -----------------------------------------------------------------------------
# Auto-appended deployment state (written by phase scripts via append_setup_var)
# NEEDFORFIT_DEPLOY_VARS_START

# NEEDFORFIT_DEPLOY_VARS_END
# -----------------------------------------------------------------------------

# Sync canonical names ↔ legacy aliases so all scripts share one config.
needforfit_sync_var_aliases() {
  # Subnets
  export SUBNET_1A="${SUBNET_1A:-${PUBLIC_SUBNET_1_ID:-}}"
  export PUBLIC_SUBNET_1_ID="${PUBLIC_SUBNET_1_ID:-${SUBNET_1A:-}}"
  export SUBNET_1B="${SUBNET_1B:-${PUBLIC_SUBNET_2_ID:-}}"
  export PUBLIC_SUBNET_2_ID="${PUBLIC_SUBNET_2_ID:-${SUBNET_1B:-}}"

  # Security groups
  export ALB_SG="${ALB_SG:-${ALB_SECURITY_GROUP_ID:-}}"
  export ALB_SECURITY_GROUP_ID="${ALB_SECURITY_GROUP_ID:-${ALB_SG:-}}"
  export EC2_SG="${EC2_SG:-${EC2_SECURITY_GROUP_ID:-}}"
  export EC2_SECURITY_GROUP_ID="${EC2_SECURITY_GROUP_ID:-${EC2_SG:-}}"

  # EC2 / ALB / ACM
  export INSTANCE_ID="${INSTANCE_ID:-${EC2_INSTANCE_ID:-}}"
  export EC2_INSTANCE_ID="${EC2_INSTANCE_ID:-${INSTANCE_ID:-}}"
  export ALB_DNS="${ALB_DNS:-${ALB_DNS_NAME:-}}"
  export ALB_DNS_NAME="${ALB_DNS_NAME:-${ALB_DNS:-}}"
  export CERT_ARN="${CERT_ARN:-${ACM_CERTIFICATE_ARN:-}}"
  export ACM_CERTIFICATE_ARN="${ACM_CERTIFICATE_ARN:-${CERT_ARN:-}}"

  # App naming
  export PROJECT_NAME="${APP_NAME}"
}

needforfit_print_status() {
  needforfit_sync_var_aliases
  echo "Needforfit deployment variables"
  echo "==========================="
  printf "  AWS_REGION       = %s\n" "${AWS_REGION}"
  printf "  AWS_ACCOUNT_ID   = %s\n" "${AWS_ACCOUNT_ID:-<unknown>}"
  printf "  APP_NAME         = %s\n" "${APP_NAME}"
  printf "  DOMAIN_NAME      = %s\n" "${DOMAIN_NAME}"
  printf "  TIMESTAMP        = %s\n" "${TIMESTAMP}"
  echo ""
  echo "Phase 1 (network & storage)"
  printf "  VPC_ID           = %s\n" "${VPC_ID:-<not set>}"
  printf "  IGW_ID           = %s\n" "${IGW_ID:-<not set>}"
  printf "  SUBNET_1A        = %s\n" "${SUBNET_1A:-<not set>}"
  printf "  SUBNET_1B        = %s\n" "${SUBNET_1B:-<not set>}"
  printf "  ALB_SG           = %s\n" "${ALB_SG:-<not set>}"
  printf "  EC2_SG           = %s\n" "${EC2_SG:-<not set>}"
  printf "  S3_STATIC_BUCKET = %s\n" "${S3_STATIC_BUCKET:-<not set>}"
  echo ""
  echo "Phase 2 (compute)"
  printf "  INSTANCE_ID      = %s\n" "${INSTANCE_ID:-<not set>}"
  printf "  EC2_PUBLIC_IP    = %s\n" "${EC2_PUBLIC_IP:-<not set>}"
  echo ""
  echo "Phase 3 (load balancer & DNS)"
  printf "  ALB_ARN          = %s\n" "${ALB_ARN:-<not set>}"
  printf "  ALB_DNS          = %s\n" "${ALB_DNS:-<not set>}"
  printf "  CERT_ARN         = %s\n" "${CERT_ARN:-<not set>}"
}

# --- Finalize on source or direct execution ---
needforfit_sync_var_aliases

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  case "${1:-status}" in
    status|--status|help|-h)
      needforfit_print_status
      ;;
    *)
      echo "Usage: $(basename "$0") [status]" >&2
      exit 1
      ;;
  esac
fi
