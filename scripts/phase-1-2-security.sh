#!/usr/bin/env bash
# =============================================================================
# Phase 1.2 — Security Groups (ALB + EC2)
# =============================================================================
# Creates:
#   - ALB SG: inbound 80/443 from internet
#   - EC2 SG: inbound 5000 from ALB, inbound 22 (restrict in production)
#
# Usage:
#   ./scripts/phase-1-1-vpc.sh   # required first
#   ./scripts/phase-1-2-security.sh
#
# Cleanup:
#   aws ec2 delete-security-group --group-id $EC2_SECURITY_GROUP_ID
#   aws ec2 delete-security-group --group-id $ALB_SECURITY_GROUP_ID
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=setup-vars.sh
source "${SCRIPT_DIR}/setup-vars.sh"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

require_aws

if [[ -z "${VPC_ID:-}" ]]; then
  echo "ERROR: VPC_ID not set. Run ./scripts/phase-1-1-vpc.sh first." >&2
  exit 1
fi

echo "==> Phase 1.2: Security Groups (VPC: ${VPC_ID})"

# --- ALB Security Group ---
if [[ -n "${ALB_SECURITY_GROUP_ID:-}" ]] && aws ec2 describe-security-groups --group-ids "${ALB_SECURITY_GROUP_ID}" >/dev/null 2>&1; then
  echo "✓ ALB security group already exists: ${ALB_SECURITY_GROUP_ID}"
else
  ALB_SECURITY_GROUP_ID="$(aws ec2 create-security-group \
    --group-name "${PROJECT_NAME}-alb-sg" \
    --description "Needforfit ALB - HTTP/HTTPS from internet" \
    --vpc-id "${VPC_ID}" \
    --tag-specifications "ResourceType=security-group,Tags=[$(tag_spec 1-2-security),{Key=Name,Value=${PROJECT_NAME}-alb-sg}]" \
    --query GroupId \
    --output text)"
  aws ec2 authorize-security-group-ingress --group-id "${ALB_SECURITY_GROUP_ID}" --protocol tcp --port 80 --cidr 0.0.0.0/0
  aws ec2 authorize-security-group-ingress --group-id "${ALB_SECURITY_GROUP_ID}" --protocol tcp --port 443 --cidr 0.0.0.0/0
  append_setup_var "ALB_SECURITY_GROUP_ID" "${ALB_SECURITY_GROUP_ID}"
  echo "✓ Created ALB security group: ${ALB_SECURITY_GROUP_ID}"
fi

# --- EC2 Security Group ---
if [[ -n "${EC2_SECURITY_GROUP_ID:-}" ]] && aws ec2 describe-security-groups --group-ids "${EC2_SECURITY_GROUP_ID}" >/dev/null 2>&1; then
  echo "✓ EC2 security group already exists: ${EC2_SECURITY_GROUP_ID}"
else
  EC2_SECURITY_GROUP_ID="$(aws ec2 create-security-group \
    --group-name "${PROJECT_NAME}-ec2-sg" \
    --description "Needforfit EC2 backend - API from ALB" \
    --vpc-id "${VPC_ID}" \
    --tag-specifications "ResourceType=security-group,Tags=[$(tag_spec 1-2-security),{Key=Name,Value=${PROJECT_NAME}-ec2-sg}]" \
    --query GroupId \
    --output text)"
  aws ec2 authorize-security-group-ingress --group-id "${EC2_SECURITY_GROUP_ID}" --protocol tcp --port 5000 --source-group "${ALB_SECURITY_GROUP_ID}"
  # Restrict SSH to your IP in production: --cidr YOUR_IP/32
  aws ec2 authorize-security-group-ingress --group-id "${EC2_SECURITY_GROUP_ID}" --protocol tcp --port 22 --cidr 0.0.0.0/0
  append_setup_var "EC2_SECURITY_GROUP_ID" "${EC2_SECURITY_GROUP_ID}"
  echo "✓ Created EC2 security group: ${EC2_SECURITY_GROUP_ID}"
  echo "  NOTE: SSH (22) is open to 0.0.0.0/0 — restrict to your IP before production."
fi

echo ""
echo "Phase 1.2 complete. Variables saved to setup-vars.sh"
echo "  ALB_SECURITY_GROUP_ID=${ALB_SECURITY_GROUP_ID}"
echo "  EC2_SECURITY_GROUP_ID=${EC2_SECURITY_GROUP_ID}"
