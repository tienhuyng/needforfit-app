#!/usr/bin/env bash
# =============================================================================
# Phase 1.4 — AWS Secrets Manager
# =============================================================================
# Creates secrets (placeholder values — update before production deploy):
#   - ${PROJECT_NAME}/database-url
#   - ${PROJECT_NAME}/jwt-secret
#
# Usage:
#   ./scripts/phase-1-4-secrets.sh
#
# Update secret values:
#   aws secretsmanager put-secret-value --secret-id needforfit/database-url --secret-string '...'
#   aws secretsmanager put-secret-value --secret-id needforfit/jwt-secret --secret-string '...'
#
# Cleanup:
#   aws secretsmanager delete-secret --secret-id $SECRET_DATABASE_ARN --force-delete-without-recovery
#   aws secretsmanager delete-secret --secret-id $SECRET_JWT_ARN --force-delete-without-recovery
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=setup-vars.sh
source "${SCRIPT_DIR}/setup-vars.sh"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

require_aws

SECRET_DATABASE_NAME="${PROJECT_NAME}/database-url"
SECRET_JWT_NAME="${PROJECT_NAME}/jwt-secret"

create_or_get_secret() {
  local name="$1"
  local placeholder="$2"
  local arn

  arn="$(aws secretsmanager describe-secret --secret-id "${name}" --query ARN --output text 2>/dev/null || true)"
  if [[ -n "${arn}" && "${arn}" != "None" ]]; then
    echo "✓ Secret already exists: ${name}" >&2
    echo "${arn}"
    return
  fi

  arn="$(aws secretsmanager create-secret \
    --name "${name}" \
    --description "Needforfit ${name} (update before production)" \
    --secret-string "${placeholder}" \
    --tags Key=Project,Value="${PROJECT_NAME}",Key=Environment,Value="${ENV_NAME}",Key=Phase,Value=1-4-secrets \
    --query ARN \
    --output text)"
  echo "✓ Created secret: ${name}" >&2
  echo "${arn}"
}

echo "==> Phase 1.4: Secrets Manager (${AWS_REGION})"

SECRET_DATABASE_ARN="$(create_or_get_secret \
  "${SECRET_DATABASE_NAME}" \
  "postgresql://postgres:CHANGE_ME@localhost:5432/needforfit_db")"
append_setup_var "SECRET_DATABASE_ARN" "${SECRET_DATABASE_ARN}"
append_setup_var "SECRET_DATABASE_NAME" "${SECRET_DATABASE_NAME}"

JWT_PLACEHOLDER="$(openssl rand -hex 32 2>/dev/null || echo 'REPLACE_WITH_openssl_rand_hex_32')"
SECRET_JWT_ARN="$(create_or_get_secret \
  "${SECRET_JWT_NAME}" \
  "${JWT_PLACEHOLDER}")"
append_setup_var "SECRET_JWT_ARN" "${SECRET_JWT_ARN}"
append_setup_var "SECRET_JWT_NAME" "${SECRET_JWT_NAME}"

echo ""
echo "Phase 1.4 complete. Variables saved to setup-vars.sh"
echo "  SECRET_DATABASE_ARN=${SECRET_DATABASE_ARN}"
echo "  SECRET_JWT_ARN=${SECRET_JWT_ARN}"
echo ""
echo "IMPORTANT: Update secret values before deploying:"
echo "  aws secretsmanager put-secret-value --secret-id ${SECRET_DATABASE_NAME} --secret-string 'YOUR_DATABASE_URL'"
echo "  aws secretsmanager put-secret-value --secret-id ${SECRET_JWT_NAME} --secret-string 'YOUR_JWT_SECRET'"
