#!/usr/bin/env bash
# =============================================================================
# Phase 3.1 — Application Load Balancer + Backend Target Group
# =============================================================================
# Creates backend target group (port 5000), registers EC2, creates internet-facing ALB.
#
# Prerequisites: Phase 1 (VPC, subnets, SGs) + Phase 2.1 (EC2)
#
# Usage:
#   ./scripts/phase-3-1-alb.sh
#
# Cleanup:
#   aws elbv2 delete-load-balancer --load-balancer-arn $ALB_ARN
#   aws elbv2 delete-target-group --target-group-arn $BACKEND_TARGET_GROUP_ARN
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=setup-vars.sh
source "${SCRIPT_DIR}/setup-vars.sh"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

require_aws

for var in VPC_ID PUBLIC_SUBNET_1_ID PUBLIC_SUBNET_2_ID ALB_SECURITY_GROUP_ID EC2_INSTANCE_ID; do
  if [[ -z "${!var:-}" ]]; then
    echo "ERROR: ${var} not set. Run Phase 1 & 2.1 scripts first." >&2
    exit 1
  fi
done

BACKEND_TG_NAME="${PROJECT_NAME}-backend-tg"
ALB_NAME="${PROJECT_NAME}-alb"

echo "==> Phase 3.1: ALB + Backend Target Group"

# --- Backend target group ---
EXISTING_TG_ARN="$(aws elbv2 describe-target-groups \
  --names "${BACKEND_TG_NAME}" \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text 2>/dev/null || true)"

if [[ -n "${EXISTING_TG_ARN}" && "${EXISTING_TG_ARN}" != "None" ]]; then
  BACKEND_TARGET_GROUP_ARN="${EXISTING_TG_ARN}"
  echo "✓ Backend target group already exists: ${BACKEND_TARGET_GROUP_ARN}"
else
  BACKEND_TARGET_GROUP_ARN="$(aws elbv2 create-target-group \
    --name "${BACKEND_TG_NAME}" \
    --protocol HTTP \
    --port 5000 \
    --vpc-id "${VPC_ID}" \
    --target-type instance \
    --health-check-protocol HTTP \
    --health-check-path /api/health \
    --health-check-interval-seconds 30 \
    --health-check-timeout-seconds 5 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3 \
    --matcher HttpCode=200 \
    --tags Key=Project,Value="${PROJECT_NAME}",Key=Environment,Value="${ENV_NAME}",Key=Phase,Value=3-1-alb \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)"
  echo "✓ Created backend target group: ${BACKEND_TARGET_GROUP_ARN}"
fi
append_setup_var "BACKEND_TARGET_GROUP_ARN" "${BACKEND_TARGET_GROUP_ARN}"

# --- Register EC2 ---
aws elbv2 register-targets \
  --target-group-arn "${BACKEND_TARGET_GROUP_ARN}" \
  --targets "Id=${EC2_INSTANCE_ID}" 2>/dev/null || true
echo "✓ Registered EC2 ${EC2_INSTANCE_ID} in backend target group"

# --- Application Load Balancer ---
EXISTING_ALB_ARN="$(aws elbv2 describe-load-balancers \
  --names "${ALB_NAME}" \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text 2>/dev/null || true)"

if [[ -n "${EXISTING_ALB_ARN}" && "${EXISTING_ALB_ARN}" != "None" ]]; then
  ALB_ARN="${EXISTING_ALB_ARN}"
  echo "✓ ALB already exists: ${ALB_ARN}"
else
  ALB_ARN="$(aws elbv2 create-load-balancer \
    --name "${ALB_NAME}" \
    --type application \
    --scheme internet-facing \
    --ip-address-type ipv4 \
    --subnets "${PUBLIC_SUBNET_1_ID}" "${PUBLIC_SUBNET_2_ID}" \
    --security-groups "${ALB_SECURITY_GROUP_ID}" \
    --tags Key=Project,Value="${PROJECT_NAME}",Key=Environment,Value="${ENV_NAME}",Key=Phase,Value=3-1-alb \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text)"
  echo "✓ Created ALB: ${ALB_ARN}"
fi

ALB_DNS_NAME="$(aws elbv2 describe-load-balancers \
  --load-balancer-arns "${ALB_ARN}" \
  --query 'LoadBalancers[0].DNSName' \
  --output text)"
ALB_HOSTED_ZONE_ID="$(aws elbv2 describe-load-balancers \
  --load-balancer-arns "${ALB_ARN}" \
  --query 'LoadBalancers[0].CanonicalHostedZoneId' \
  --output text)"

append_setup_var "ALB_ARN" "${ALB_ARN}"
append_setup_var "ALB_DNS_NAME" "${ALB_DNS_NAME}"
append_setup_var "ALB_HOSTED_ZONE_ID" "${ALB_HOSTED_ZONE_ID}"

echo ""
echo "Phase 3.1 complete. Variables saved to setup-vars.sh"
echo "  BACKEND_TARGET_GROUP_ARN=${BACKEND_TARGET_GROUP_ARN}"
echo "  ALB_ARN=${ALB_ARN}"
echo "  ALB_DNS_NAME=${ALB_DNS_NAME}"
echo "  ALB_HOSTED_ZONE_ID=${ALB_HOSTED_ZONE_ID}"
