#!/usr/bin/env bash
# =============================================================================
# Phase 1.3 — S3 Buckets (static site + logs)
# =============================================================================
# Creates 2 buckets with versioning and lifecycle policies:
#   - Static hosting bucket (frontend deploy target)
#   - Logs / backup bucket
#
# Usage:
#   ./scripts/phase-1-3-s3.sh
#
# Cleanup:
#   aws s3 rb s3://$S3_STATIC_BUCKET --force
#   aws s3 rb s3://$S3_LOGS_BUCKET --force
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=setup-vars.sh
source "${SCRIPT_DIR}/setup-vars.sh"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

require_aws

ACCOUNT_ID="$(get_account_id)"
S3_STATIC_BUCKET="${S3_STATIC_BUCKET:-${APP_NAME:-${PROJECT_NAME}}-static-${AWS_ACCOUNT_ID:-$(get_account_id)}-${TIMESTAMP}}"
S3_LOGS_BUCKET="${S3_LOGS_BUCKET:-${APP_NAME:-${PROJECT_NAME}}-logs-${AWS_ACCOUNT_ID:-$(get_account_id)}-${TIMESTAMP}}"
LIFECYCLE_FILE="$(mktemp)"

cleanup() {
  rm -f "${LIFECYCLE_FILE}"
}
trap cleanup EXIT

cat > "${LIFECYCLE_FILE}" <<'EOF'
{
  "Rules": [
    {
      "ID": "expire-noncurrent-versions",
      "Status": "Enabled",
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 90
      }
    },
    {
      "ID": "abort-incomplete-uploads",
      "Status": "Enabled",
      "AbortIncompleteMultipartUpload": {
        "DaysAfterInitiation": 7
      }
    }
  ]
}
EOF

ensure_bucket() {
  local bucket="$1"
  local purpose="$2"

  if aws s3api head-bucket --bucket "${bucket}" 2>/dev/null; then
    echo "✓ Bucket already exists: ${bucket}"
  else
    if [[ "${AWS_REGION}" == "us-east-1" ]]; then
      aws s3api create-bucket --bucket "${bucket}"
    else
      aws s3api create-bucket \
        --bucket "${bucket}" \
        --create-bucket-configuration "LocationConstraint=${AWS_REGION}"
    fi
    echo "✓ Created bucket: ${bucket} (${purpose})"
  fi

  aws s3api put-bucket-tagging --bucket "${bucket}" --tagging \
    "TagSet=[{Key=Project,Value=${PROJECT_NAME}},{Key=Environment,Value=${ENV_NAME}},{Key=Purpose,Value=${purpose}}]"

  aws s3api put-bucket-versioning --bucket "${bucket}" \
    --versioning-configuration Status=Enabled

  aws s3api put-bucket-lifecycle-configuration --bucket "${bucket}" \
    --lifecycle-configuration "file://${LIFECYCLE_FILE}"

  aws s3api put-public-access-block --bucket "${bucket}" \
    --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
}

echo "==> Phase 1.3: S3 Buckets (${AWS_REGION})"

ensure_bucket "${S3_STATIC_BUCKET}" "static-frontend"
append_setup_var "S3_STATIC_BUCKET" "${S3_STATIC_BUCKET}"

ensure_bucket "${S3_LOGS_BUCKET}" "logs"
append_setup_var "S3_LOGS_BUCKET" "${S3_LOGS_BUCKET}"

echo ""
echo "Phase 1.3 complete. Variables saved to setup-vars.sh"
echo "  S3_STATIC_BUCKET=${S3_STATIC_BUCKET}  ← use as GitHub secret"
echo "  S3_LOGS_BUCKET=${S3_LOGS_BUCKET}"
