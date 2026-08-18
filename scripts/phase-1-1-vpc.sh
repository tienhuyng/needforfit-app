#!/usr/bin/env bash
# =============================================================================
# Phase 1.1 — VPC + Networking
# =============================================================================
# Creates: VPC, Internet Gateway, 2 public subnets, route table, IGW route
#
# Usage:
#   chmod +x scripts/phase-1-1-vpc.sh
#   ./scripts/phase-1-1-vpc.sh
#
# Cleanup (manual — run in reverse order after deleting dependents):
#   aws ec2 delete-route-table --route-table-id $PUBLIC_ROUTE_TABLE_ID
#   aws ec2 detach-internet-gateway --internet-gateway-id $IGW_ID --vpc-id $VPC_ID
#   aws ec2 delete-subnet --subnet-id $PUBLIC_SUBNET_1_ID
#   aws ec2 delete-subnet --subnet-id $PUBLIC_SUBNET_2_ID
#   aws ec2 delete-internet-gateway --internet-gateway-id $IGW_ID
#   aws ec2 delete-vpc --vpc-id $VPC_ID
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=setup-vars.sh
source "${SCRIPT_DIR}/setup-vars.sh"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

require_aws

VPC_CIDR="10.0.0.0/16"
SUBNET_1_CIDR="10.0.1.0/24"
SUBNET_2_CIDR="10.0.2.0/24"
AZ_1="${AWS_REGION}a"
AZ_2="${AWS_REGION}b"

echo "==> Phase 1.1: VPC + Networking (${AWS_REGION})"

# --- VPC ---
if [[ -n "${VPC_ID:-}" ]] && aws ec2 describe-vpcs --vpc-ids "${VPC_ID}" >/dev/null 2>&1; then
  echo "✓ VPC already exists: ${VPC_ID}"
else
  VPC_ID="$(aws ec2 create-vpc \
    --cidr-block "${VPC_CIDR}" \
    --tag-specifications "ResourceType=vpc,Tags=[$(tag_spec 1-1-vpc),{Key=Name,Value=${PROJECT_NAME}-vpc}]" \
    --query Vpc.VpcId \
    --output text)"
  aws ec2 modify-vpc-attribute --vpc-id "${VPC_ID}" --enable-dns-hostnames
  aws ec2 modify-vpc-attribute --vpc-id "${VPC_ID}" --enable-dns-support
  append_setup_var "VPC_ID" "${VPC_ID}"
  echo "✓ Created VPC: ${VPC_ID}"
fi

# --- Internet Gateway ---
if [[ -n "${IGW_ID:-}" ]] && aws ec2 describe-internet-gateways --internet-gateway-ids "${IGW_ID}" >/dev/null 2>&1; then
  echo "✓ Internet Gateway already exists: ${IGW_ID}"
else
  IGW_ID="$(aws ec2 create-internet-gateway \
    --tag-specifications "ResourceType=internet-gateway,Tags=[$(tag_spec 1-1-vpc),{Key=Name,Value=${PROJECT_NAME}-igw}]" \
    --query InternetGateway.InternetGatewayId \
    --output text)"
  aws ec2 attach-internet-gateway --internet-gateway-id "${IGW_ID}" --vpc-id "${VPC_ID}"
  append_setup_var "IGW_ID" "${IGW_ID}"
  echo "✓ Created & attached IGW: ${IGW_ID}"
fi

# --- Public Subnet 1 ---
if [[ -n "${PUBLIC_SUBNET_1_ID:-}" ]] && aws ec2 describe-subnets --subnet-ids "${PUBLIC_SUBNET_1_ID}" >/dev/null 2>&1; then
  echo "✓ Public subnet 1 already exists: ${PUBLIC_SUBNET_1_ID}"
else
  PUBLIC_SUBNET_1_ID="$(aws ec2 create-subnet \
    --vpc-id "${VPC_ID}" \
    --cidr-block "${SUBNET_1_CIDR}" \
    --availability-zone "${AZ_1}" \
    --tag-specifications "ResourceType=subnet,Tags=[$(tag_spec 1-1-vpc),{Key=Name,Value=${PROJECT_NAME}-public-${AZ_1}}]" \
    --query Subnet.SubnetId \
    --output text)"
  aws ec2 modify-subnet-attribute --subnet-id "${PUBLIC_SUBNET_1_ID}" --map-public-ip-on-launch
  append_setup_var "PUBLIC_SUBNET_1_ID" "${PUBLIC_SUBNET_1_ID}"
  echo "✓ Created public subnet 1 (${AZ_1}): ${PUBLIC_SUBNET_1_ID}"
fi

# --- Public Subnet 2 ---
if [[ -n "${PUBLIC_SUBNET_2_ID:-}" ]] && aws ec2 describe-subnets --subnet-ids "${PUBLIC_SUBNET_2_ID}" >/dev/null 2>&1; then
  echo "✓ Public subnet 2 already exists: ${PUBLIC_SUBNET_2_ID}"
else
  PUBLIC_SUBNET_2_ID="$(aws ec2 create-subnet \
    --vpc-id "${VPC_ID}" \
    --cidr-block "${SUBNET_2_CIDR}" \
    --availability-zone "${AZ_2}" \
    --tag-specifications "ResourceType=subnet,Tags=[$(tag_spec 1-1-vpc),{Key=Name,Value=${PROJECT_NAME}-public-${AZ_2}}]" \
    --query Subnet.SubnetId \
    --output text)"
  aws ec2 modify-subnet-attribute --subnet-id "${PUBLIC_SUBNET_2_ID}" --map-public-ip-on-launch
  append_setup_var "PUBLIC_SUBNET_2_ID" "${PUBLIC_SUBNET_2_ID}"
  echo "✓ Created public subnet 2 (${AZ_2}): ${PUBLIC_SUBNET_2_ID}"
fi

# --- Route Table ---
if [[ -n "${PUBLIC_ROUTE_TABLE_ID:-}" ]] && aws ec2 describe-route-tables --route-table-ids "${PUBLIC_ROUTE_TABLE_ID}" >/dev/null 2>&1; then
  echo "✓ Public route table already exists: ${PUBLIC_ROUTE_TABLE_ID}"
else
  PUBLIC_ROUTE_TABLE_ID="$(aws ec2 create-route-table \
    --vpc-id "${VPC_ID}" \
    --tag-specifications "ResourceType=route-table,Tags=[$(tag_spec 1-1-vpc),{Key=Name,Value=${PROJECT_NAME}-public-rt}]" \
    --query RouteTable.RouteTableId \
    --output text)"
  aws ec2 create-route --route-table-id "${PUBLIC_ROUTE_TABLE_ID}" --destination-cidr-block 0.0.0.0/0 --gateway-id "${IGW_ID}"
  aws ec2 associate-route-table --route-table-id "${PUBLIC_ROUTE_TABLE_ID}" --subnet-id "${PUBLIC_SUBNET_1_ID}"
  aws ec2 associate-route-table --route-table-id "${PUBLIC_ROUTE_TABLE_ID}" --subnet-id "${PUBLIC_SUBNET_2_ID}"
  append_setup_var "PUBLIC_ROUTE_TABLE_ID" "${PUBLIC_ROUTE_TABLE_ID}"
  echo "✓ Created public route table: ${PUBLIC_ROUTE_TABLE_ID}"
fi

echo ""
echo "Phase 1.1 complete. Variables saved to setup-vars.sh"
echo "  VPC_ID=${VPC_ID}"
echo "  IGW_ID=${IGW_ID}"
echo "  PUBLIC_SUBNET_1_ID=${PUBLIC_SUBNET_1_ID}"
echo "  PUBLIC_SUBNET_2_ID=${PUBLIC_SUBNET_2_ID}"
echo "  PUBLIC_ROUTE_TABLE_ID=${PUBLIC_ROUTE_TABLE_ID}"
