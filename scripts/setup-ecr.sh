#!/usr/bin/env bash
# =============================================================================
# Needforfit — Create ECR repository for backend Docker images
# =============================================================================
# Idempotent: safe to re-run if the repository already exists.
#
# Usage:
#   bash scripts/setup-ecr.sh
#   ECR_REPOSITORY=my-backend bash scripts/setup-ecr.sh
#
# Also embedded in setup-github-iam.sh (Step 7) — use this script when you
# only need the ECR repo without creating the GitHub Actions IAM user.
#
# Output:
#   Appends ECR_REPOSITORY, ECR_REGISTRY, ECR_REPOSITORY_URI to setup-vars.sh
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=setup-vars.sh
source "${SCRIPT_DIR}/setup-vars.sh"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

ECR_REPOSITORY="${ECR_REPOSITORY:-needforfit-backend}"

require_aws

echo "==> Needforfit ECR setup"
echo "    Region     : ${AWS_REGION}"
echo "    Repository : ${ECR_REPOSITORY}"
echo ""

ACCOUNT_ID="$(get_account_id)"
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

echo "==> Ensuring ECR repository exists..."
if aws ecr describe-repositories \
  --repository-names "${ECR_REPOSITORY}" \
  --region "${AWS_REGION}" >/dev/null 2>&1; then
  echo "✓ Repository already exists: ${ECR_REPOSITORY}"
else
  aws ecr create-repository \
    --repository-name "${ECR_REPOSITORY}" \
    --region "${AWS_REGION}" \
    --image-scanning-configuration scanOnPush=true \
    --encryption-configuration encryptionType=AES256 \
    --tags "Key=Project,Value=${APP_NAME}" "Key=Environment,Value=${ENV_NAME}" "Key=ManagedBy,Value=setup-ecr.sh" \
    >/dev/null
  echo "✓ Created repository: ${ECR_REPOSITORY}"
fi

ECR_REPOSITORY_URI="$(aws ecr describe-repositories \
  --repository-names "${ECR_REPOSITORY}" \
  --region "${AWS_REGION}" \
  --query 'repositories[0].repositoryUri' \
  --output text)"

append_setup_var "ECR_REPOSITORY" "${ECR_REPOSITORY}"
append_setup_var "ECR_REGISTRY" "${ECR_REGISTRY}"
append_setup_var "ECR_REPOSITORY_URI" "${ECR_REPOSITORY_URI}"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              ECR Repository Ready                            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  ECR_REPOSITORY     = ${ECR_REPOSITORY}"
echo "  ECR_REGISTRY       = ${ECR_REGISTRY}"
echo "  ECR_REPOSITORY_URI = ${ECR_REPOSITORY_URI}"
echo ""
echo "  Docker login:"
echo "    aws ecr get-login-password --region ${AWS_REGION} \\"
echo "      | docker login --username AWS --password-stdin ${ECR_REGISTRY}"
echo ""
echo "  Push example:"
echo "    docker tag needforfit-backend:latest ${ECR_REPOSITORY_URI}:latest"
echo "    docker push ${ECR_REPOSITORY_URI}:latest"
echo ""
echo "Variables saved to: ${SCRIPT_DIR}/setup-vars.sh"
