#!/usr/bin/env bash
# =============================================================================
# Phase 1 (All) — VPC, Security, S3, Secrets, Route 53
# =============================================================================
# Consolidated script replacing phase-1-1 through phase-1-5.
#
# Usage:
#   chmod +x scripts/phase-1-all.sh
#   ./scripts/phase-1-all.sh
#
# Optional env (skip prompts):
#   SSH_CIDR=203.0.113.10/32 DOMAIN_NAME=training.withkris.life ./scripts/phase-1-all.sh
#
# Outputs:
#   - Appends resource IDs to scripts/setup-vars.sh
#   - Saves generated secrets to scripts/phase-1-secrets.txt (DO NOT COMMIT)
#   - Saves Route 53 nameservers to scripts/route53-nameservers.txt
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=setup-vars.sh
source "${SCRIPT_DIR}/setup-vars.sh"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

SECRETS_OUTPUT="${SCRIPT_DIR}/phase-1-secrets.txt"
NS_OUTPUT="${SCRIPT_DIR}/route53-nameservers.txt"
STATIC_LIFECYCLE_FILE="$(mktemp)"
BACKUP_LIFECYCLE_FILE="$(mktemp)"

VPC_CIDR="10.0.0.0/16"
SUBNET_1_CIDR="10.0.1.0/24"
SUBNET_2_CIDR="10.0.2.0/24"
AZ_1="${AWS_REGION}a"
AZ_2="${AWS_REGION}b"

cleanup() {
  rm -f "${STATIC_LIFECYCLE_FILE}" "${BACKUP_LIFECYCLE_FILE}"
}
trap cleanup EXIT

# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------

prompt_inputs() {
  echo "==> User inputs"
  echo ""

  if [[ -z "${SSH_CIDR:-}" ]]; then
    read -rp "Your public IP for SSH (CIDR, e.g. 203.0.113.10/32): " SSH_CIDR
    if [[ -z "${SSH_CIDR}" ]]; then
      echo "ERROR: SSH CIDR is required for EC2 security group." >&2
      exit 1
    fi
  fi
  # Normalize bare IP to /32
  if [[ "${SSH_CIDR}" != */* ]]; then
    SSH_CIDR="${SSH_CIDR}/32"
  fi
  echo "  SSH allowed from: ${SSH_CIDR}"

  if [[ -z "${DOMAIN_NAME_INPUT:-}" ]]; then
    read -rp "Domain name for Route 53 [${DOMAIN_NAME}]: " DOMAIN_NAME_INPUT
    DOMAIN_NAME="${DOMAIN_NAME_INPUT:-${DOMAIN_NAME}}"
  else
    DOMAIN_NAME="${DOMAIN_NAME_INPUT}"
  fi
  export DOMAIN_NAME
  append_setup_var "DOMAIN_NAME" "${DOMAIN_NAME}"
  echo "  Domain name       : ${DOMAIN_NAME}"
  echo ""
}

create_or_get_secret() {
  local name="$1"
  local value="$2"
  local arn

  arn="$(aws secretsmanager describe-secret --secret-id "${name}" --query ARN --output text 2>/dev/null || true)"
  if [[ -n "${arn}" && "${arn}" != "None" ]]; then
    echo "✓ Secret already exists: ${name}" >&2
    echo "${arn}"
    return
  fi

  # aws secretsmanager create-secret — store sensitive config outside the repo
  arn="$(aws secretsmanager create-secret \
    --name "${name}" \
    --description "Needforfit ${name}" \
    --secret-string "${value}" \
    --tags Key=Project,Value="${APP_NAME}",Key=Environment,Value="${ENV_NAME}",Key=Phase,Value=1-all \
    --query ARN \
    --output text)"
  echo "✓ Created secret: ${name}" >&2
  echo "${arn}"
}

ensure_bucket() {
  local bucket="$1"
  local purpose="$2"
  local lifecycle_file="$3"

  if aws s3api head-bucket --bucket "${bucket}" 2>/dev/null; then
    echo "✓ Bucket already exists: ${bucket}"
  else
    # aws s3api create-bucket — regional bucket for static/backup assets
    if [[ "${AWS_REGION}" == "us-east-1" ]]; then
      aws s3api create-bucket --bucket "${bucket}"
    else
      aws s3api create-bucket \
        --bucket "${bucket}" \
        --create-bucket-configuration "LocationConstraint=${AWS_REGION}"
    fi
    echo "✓ Created bucket: ${bucket} (${purpose})"
  fi

  aws s3api put-bucket-tagging --bucket "${bucket}" \
    --tagging "TagSet=[{Key=Project,Value=${APP_NAME}},{Key=Environment,Value=${ENV_NAME}},{Key=Purpose,Value=${purpose}}]"

  # aws s3api put-bucket-versioning — keep object history for rollbacks
  aws s3api put-bucket-versioning --bucket "${bucket}" \
    --versioning-configuration Status=Enabled

  aws s3api put-bucket-lifecycle-configuration --bucket "${bucket}" \
    --lifecycle-configuration "file://${lifecycle_file}"

  # aws s3api put-public-access-block — deny public ACLs/policies
  aws s3api put-public-access-block --bucket "${bucket}" \
    --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
}

# =============================================================================
# STEP 1.1 — VPC & Networking
# =============================================================================
step_1_1_vpc() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " STEP 1.1 — VPC & Networking"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if [[ -n "${VPC_ID:-}" ]] && aws ec2 describe-vpcs --vpc-ids "${VPC_ID}" >/dev/null 2>&1; then
    echo "✓ VPC already exists: ${VPC_ID}"
  else
    # aws ec2 create-vpc — isolated network for Needforfit resources
    VPC_ID="$(aws ec2 create-vpc \
      --cidr-block "${VPC_CIDR}" \
      --tag-specifications "ResourceType=vpc,Tags=[$(tag_spec 1-all-vpc),{Key=Name,Value=${APP_NAME}-vpc}]" \
      --query Vpc.VpcId \
      --output text)"
    # aws ec2 modify-vpc-attribute — required for DNS hostnames in the VPC
    aws ec2 modify-vpc-attribute --vpc-id "${VPC_ID}" --enable-dns-hostnames
    aws ec2 modify-vpc-attribute --vpc-id "${VPC_ID}" --enable-dns-support
    echo "✓ Created VPC ${VPC_CIDR}: ${VPC_ID}"
  fi
  append_setup_var "VPC_ID" "${VPC_ID}"

  if [[ -n "${IGW_ID:-}" ]] && aws ec2 describe-internet-gateways --internet-gateway-ids "${IGW_ID}" >/dev/null 2>&1; then
    echo "✓ Internet Gateway already exists: ${IGW_ID}"
  else
    IGW_ID="$(aws ec2 create-internet-gateway \
      --tag-specifications "ResourceType=internet-gateway,Tags=[$(tag_spec 1-all-vpc),{Key=Name,Value=${APP_NAME}-igw}]" \
      --query InternetGateway.InternetGatewayId \
      --output text)"
    aws ec2 attach-internet-gateway --internet-gateway-id "${IGW_ID}" --vpc-id "${VPC_ID}"
    echo "✓ Created & attached Internet Gateway: ${IGW_ID}"
  fi
  append_setup_var "IGW_ID" "${IGW_ID}"

  if [[ -n "${SUBNET_1A:-}" ]] && aws ec2 describe-subnets --subnet-ids "${SUBNET_1A}" >/dev/null 2>&1; then
    echo "✓ Subnet 1A already exists: ${SUBNET_1A}"
  else
    SUBNET_1A="$(aws ec2 create-subnet \
      --vpc-id "${VPC_ID}" \
      --cidr-block "${SUBNET_1_CIDR}" \
      --availability-zone "${AZ_1}" \
      --tag-specifications "ResourceType=subnet,Tags=[$(tag_spec 1-all-vpc),{Key=Name,Value=${APP_NAME}-public-${AZ_1}}]" \
      --query Subnet.SubnetId \
      --output text)"
    aws ec2 modify-subnet-attribute --subnet-id "${SUBNET_1A}" --map-public-ip-on-launch
    echo "✓ Created subnet 1A (${AZ_1} ${SUBNET_1_CIDR}): ${SUBNET_1A}"
  fi
  append_setup_var "SUBNET_1A" "${SUBNET_1A}"

  if [[ -n "${SUBNET_1B:-}" ]] && aws ec2 describe-subnets --subnet-ids "${SUBNET_1B}" >/dev/null 2>&1; then
    echo "✓ Subnet 1B already exists: ${SUBNET_1B}"
  else
    SUBNET_1B="$(aws ec2 create-subnet \
      --vpc-id "${VPC_ID}" \
      --cidr-block "${SUBNET_2_CIDR}" \
      --availability-zone "${AZ_2}" \
      --tag-specifications "ResourceType=subnet,Tags=[$(tag_spec 1-all-vpc),{Key=Name,Value=${APP_NAME}-public-${AZ_2}}]" \
      --query Subnet.SubnetId \
      --output text)"
    aws ec2 modify-subnet-attribute --subnet-id "${SUBNET_1B}" --map-public-ip-on-launch
    echo "✓ Created subnet 1B (${AZ_2} ${SUBNET_2_CIDR}): ${SUBNET_1B}"
  fi
  append_setup_var "SUBNET_1B" "${SUBNET_1B}"

  if [[ -n "${ROUTE_TABLE_ID:-}" ]] && aws ec2 describe-route-tables --route-table-ids "${ROUTE_TABLE_ID}" >/dev/null 2>&1; then
    echo "✓ Route table already exists: ${ROUTE_TABLE_ID}"
  else
    ROUTE_TABLE_ID="$(aws ec2 create-route-table \
      --vpc-id "${VPC_ID}" \
      --tag-specifications "ResourceType=route-table,Tags=[$(tag_spec 1-all-vpc),{Key=Name,Value=${APP_NAME}-public-rt}]" \
      --query RouteTable.RouteTableId \
      --output text)"
    # aws ec2 create-route — default route to Internet Gateway
    aws ec2 create-route --route-table-id "${ROUTE_TABLE_ID}" \
      --destination-cidr-block 0.0.0.0/0 --gateway-id "${IGW_ID}"
    aws ec2 associate-route-table --route-table-id "${ROUTE_TABLE_ID}" --subnet-id "${SUBNET_1A}"
    aws ec2 associate-route-table --route-table-id "${ROUTE_TABLE_ID}" --subnet-id "${SUBNET_1B}"
    echo "✓ Created route table with 0.0.0.0/0 → IGW: ${ROUTE_TABLE_ID}"
  fi
  append_setup_var "ROUTE_TABLE_ID" "${ROUTE_TABLE_ID}"
  append_setup_var "PUBLIC_ROUTE_TABLE_ID" "${ROUTE_TABLE_ID}"
}

# =============================================================================
# STEP 1.2 — Security Groups
# =============================================================================
step_1_2_security() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " STEP 1.2 — Security Groups"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if [[ -n "${ALB_SG:-}" ]] && aws ec2 describe-security-groups --group-ids "${ALB_SG}" >/dev/null 2>&1; then
    echo "✓ ALB security group already exists: ${ALB_SG}"
  else
    ALB_SG="$(aws ec2 create-security-group \
      --group-name "${APP_NAME}-alb-sg" \
      --description "Needforfit ALB — HTTP/HTTPS from internet" \
      --vpc-id "${VPC_ID}" \
      --tag-specifications "ResourceType=security-group,Tags=[$(tag_spec 1-all-sg),{Key=Name,Value=${APP_NAME}-alb-sg}]" \
      --query GroupId \
      --output text)"
    aws ec2 authorize-security-group-ingress --group-id "${ALB_SG}" --protocol tcp --port 80 --cidr 0.0.0.0/0
    aws ec2 authorize-security-group-ingress --group-id "${ALB_SG}" --protocol tcp --port 443 --cidr 0.0.0.0/0
    echo "✓ Created ALB SG (80/443 from internet): ${ALB_SG}"
  fi
  append_setup_var "ALB_SG" "${ALB_SG}"

  if [[ -n "${EC2_SG:-}" ]] && aws ec2 describe-security-groups --group-ids "${EC2_SG}" >/dev/null 2>&1; then
    echo "✓ EC2 security group already exists: ${EC2_SG}"
  else
    EC2_SG="$(aws ec2 create-security-group \
      --group-name "${APP_NAME}-ec2-sg" \
      --description "Needforfit EC2 — SSH + traffic from ALB" \
      --vpc-id "${VPC_ID}" \
      --tag-specifications "ResourceType=security-group,Tags=[$(tag_spec 1-all-sg),{Key=Name,Value=${APP_NAME}-ec2-sg}]" \
      --query GroupId \
      --output text)"
    aws ec2 authorize-security-group-ingress --group-id "${EC2_SG}" --protocol tcp --port 22 --cidr "${SSH_CIDR}"
    aws ec2 authorize-security-group-ingress --group-id "${EC2_SG}" --protocol tcp --port 80 --source-group "${ALB_SG}"
    # Backend API target group (Phase 3) uses port 5000
    authorize_sg_ingress "${EC2_SG}" --protocol tcp --port 5000 --source-group "${ALB_SG}"
    echo "✓ Created EC2 SG (SSH ${SSH_CIDR}, HTTP/5000 from ALB): ${EC2_SG}"
  fi
  append_setup_var "EC2_SG" "${EC2_SG}"
  append_setup_var "SSH_CIDR" "${SSH_CIDR}"
}

# =============================================================================
# STEP 1.3 — S3 Buckets
# =============================================================================
step_1_3_s3() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " STEP 1.3 — S3 Buckets"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  S3_STATIC_BUCKET="${S3_STATIC_BUCKET:-${APP_NAME}-static-${TIMESTAMP}}"
  S3_BACKUP_BUCKET="${S3_BACKUP_BUCKET:-${APP_NAME}-db-backups-${TIMESTAMP}}"

  cat > "${STATIC_LIFECYCLE_FILE}" <<'EOF'
{
  "Rules": [
    {
      "ID": "expire-noncurrent-versions",
      "Status": "Enabled",
      "NoncurrentVersionExpiration": { "NoncurrentDays": 90 }
    },
    {
      "ID": "abort-incomplete-uploads",
      "Status": "Enabled",
      "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 7 }
    }
  ]
}
EOF

  cat > "${BACKUP_LIFECYCLE_FILE}" <<'EOF'
{
  "Rules": [
    {
      "ID": "delete-backups-after-30-days",
      "Status": "Enabled",
      "Expiration": { "Days": 30 }
    },
    {
      "ID": "abort-incomplete-uploads",
      "Status": "Enabled",
      "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 7 }
    }
  ]
}
EOF

  ensure_bucket "${S3_STATIC_BUCKET}" "static-frontend" "${STATIC_LIFECYCLE_FILE}"
  append_setup_var "S3_STATIC_BUCKET" "${S3_STATIC_BUCKET}"

  ensure_bucket "${S3_BACKUP_BUCKET}" "db-backups" "${BACKUP_LIFECYCLE_FILE}"
  append_setup_var "S3_BACKUP_BUCKET" "${S3_BACKUP_BUCKET}"
  append_setup_var "S3_LOGS_BUCKET" "${S3_BACKUP_BUCKET}"

  echo "✓ S3 buckets ready"
}

# =============================================================================
# STEP 1.4 — Secrets Manager
# =============================================================================
step_1_4_secrets() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " STEP 1.4 — Secrets Manager"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  JWT_SECRET="$(openssl rand -hex 32)"
  DB_PASSWORD="$(openssl rand -hex 16)"

  SECRET_JWT_NAME="${APP_NAME}/jwt-secret"
  SECRET_DB_PASSWORD_NAME="${APP_NAME}/db-password"
  SECRET_S3_STATIC_NAME="${APP_NAME}/s3-static-bucket"
  SECRET_S3_BACKUP_NAME="${APP_NAME}/s3-backup-bucket"

  SECRET_JWT_ARN="$(create_or_get_secret "${SECRET_JWT_NAME}" "${JWT_SECRET}")"
  SECRET_DB_PASSWORD_ARN="$(create_or_get_secret "${SECRET_DB_PASSWORD_NAME}" "${DB_PASSWORD}")"
  SECRET_S3_STATIC_ARN="$(create_or_get_secret "${SECRET_S3_STATIC_NAME}" "${S3_STATIC_BUCKET}")"
  SECRET_S3_BACKUP_ARN="$(create_or_get_secret "${SECRET_S3_BACKUP_NAME}" "${S3_BACKUP_BUCKET}")"

  append_setup_var "SECRET_JWT_ARN" "${SECRET_JWT_ARN}"
  append_setup_var "SECRET_DB_PASSWORD_ARN" "${SECRET_DB_PASSWORD_ARN}"
  append_setup_var "SECRET_S3_STATIC_ARN" "${SECRET_S3_STATIC_ARN}"
  append_setup_var "SECRET_S3_BACKUP_ARN" "${SECRET_S3_BACKUP_ARN}"
  append_setup_var "SECRET_JWT_NAME" "${SECRET_JWT_NAME}"
  append_setup_var "SECRET_DB_PASSWORD_NAME" "${SECRET_DB_PASSWORD_NAME}"

  # Save locally for one-time manual backup (not committed to git)
  cat > "${SECRETS_OUTPUT}" <<EOF
# Needforfit Phase 1 — generated secrets
# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# WARNING: DO NOT COMMIT. Also stored in AWS Secrets Manager.

JWT_SECRET=${JWT_SECRET}
DB_PASSWORD=${DB_PASSWORD}

S3_STATIC_BUCKET=${S3_STATIC_BUCKET}
S3_BACKUP_BUCKET=${S3_BACKUP_BUCKET}

Secrets Manager names:
  ${SECRET_JWT_NAME}
  ${SECRET_DB_PASSWORD_NAME}
  ${SECRET_S3_STATIC_NAME}
  ${SECRET_S3_BACKUP_NAME}
EOF
  chmod 600 "${SECRETS_OUTPUT}"

  echo "✓ Secrets stored in AWS Secrets Manager"
  echo "✓ Local copy saved: ${SECRETS_OUTPUT}"
  echo "  (JWT_SECRET and DB_PASSWORD — save securely, not printed to console)"
}

# =============================================================================
# STEP 1.5 — Route 53
# =============================================================================
step_1_5_route53() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " STEP 1.5 — Route 53 Hosted Zone"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  EXISTING_ZONE_ID="$(aws route53 list-hosted-zones-by-name \
    --dns-name "${DOMAIN_NAME}." \
    --query "HostedZones[?Name=='${DOMAIN_NAME}.'].Id | [0]" \
    --output text 2>/dev/null || true)"

  if [[ -n "${EXISTING_ZONE_ID}" && "${EXISTING_ZONE_ID}" != "None" ]]; then
    HOSTED_ZONE_ID="${EXISTING_ZONE_ID#/hostedzone/}"
    echo "✓ Hosted zone already exists: ${HOSTED_ZONE_ID}"
  else
    # aws route53 create-hosted-zone — public DNS for the app domain
    HOSTED_ZONE_ID="$(aws route53 create-hosted-zone \
      --name "${DOMAIN_NAME}" \
      --caller-reference "${APP_NAME}-phase1-$(date +%s)" \
      --hosted-zone-config Comment="Needforfit ${ENV_NAME}",PrivateZone=false \
      --query HostedZone.Id \
      --output text)"
    HOSTED_ZONE_ID="${HOSTED_ZONE_ID#/hostedzone/}"
    echo "✓ Created hosted zone for ${DOMAIN_NAME}: ${HOSTED_ZONE_ID}"
  fi

  append_setup_var "HOSTED_ZONE_ID" "${HOSTED_ZONE_ID}"
  append_setup_var "ROUTE53_HOSTED_ZONE_ID" "${HOSTED_ZONE_ID}"

  NAME_SERVERS="$(aws route53 get-hosted-zone \
    --id "${HOSTED_ZONE_ID}" \
    --query DelegationSet.NameServers \
    --output text)"

  append_setup_var "ROUTE53_NAME_SERVERS" "${NAME_SERVERS}"

  {
    echo "# Route 53 nameservers for ${DOMAIN_NAME}"
    echo "# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    echo "# Add these at your domain registrar. A record → ALB is created in Phase 3."
    echo ""
    for ns in ${NAME_SERVERS}; do
      echo "${ns}"
    done
  } > "${NS_OUTPUT}"

  echo "✓ Nameservers written to ${NS_OUTPUT}"
  for ns in ${NAME_SERVERS}; do
    echo "  ✓ ${ns}"
  done
  echo "  (A record alias to ALB will be configured in Phase 3)"
}

# =============================================================================
# Summary
# =============================================================================
print_summary() {
  needforfit_sync_var_aliases

  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║              Phase 1 Complete — Summary                     ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  echo "Networking"
  echo "  VPC_ID          = ${VPC_ID}"
  echo "  IGW_ID          = ${IGW_ID}"
  echo "  SUBNET_1A       = ${SUBNET_1A}"
  echo "  SUBNET_1B       = ${SUBNET_1B}"
  echo "  ROUTE_TABLE_ID  = ${ROUTE_TABLE_ID}"
  echo ""
  echo "Security"
  echo "  ALB_SG          = ${ALB_SG}"
  echo "  EC2_SG          = ${EC2_SG}"
  echo "  SSH_CIDR        = ${SSH_CIDR}"
  echo ""
  echo "Storage"
  echo "  S3_STATIC_BUCKET= ${S3_STATIC_BUCKET}  ← GitHub secret"
  echo "  S3_BACKUP_BUCKET= ${S3_BACKUP_BUCKET}"
  echo ""
  echo "DNS"
  echo "  DOMAIN_NAME     = ${DOMAIN_NAME}"
  echo "  HOSTED_ZONE_ID  = ${HOSTED_ZONE_ID}"
  echo ""
  echo "Secrets (see ${SECRETS_OUTPUT})"
  echo "  ${APP_NAME}/jwt-secret"
  echo "  ${APP_NAME}/db-password"
  echo "  ${APP_NAME}/s3-static-bucket"
  echo "  ${APP_NAME}/s3-backup-bucket"
  echo ""
  echo "All variables appended to: ${SCRIPT_DIR}/setup-vars.sh"
  echo ""
  echo "Next: ./scripts/phase-2-1-ec2.sh  or  ./scripts/setup-all.sh 2"
}

# =============================================================================
# Main
# =============================================================================
main() {
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║        Needforfit Phase 1 — Full Infrastructure Setup           ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo "  Region   : ${AWS_REGION}"
  echo "  App      : ${APP_NAME}"
  echo "  Account  : ${AWS_ACCOUNT_ID:-detecting...}"
  echo "  Timestamp: ${TIMESTAMP}"
  echo ""

  require_aws
  AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-$(get_account_id)}"
  export AWS_ACCOUNT_ID

  if ! command -v openssl >/dev/null 2>&1; then
    echo "ERROR: openssl is required for secret generation." >&2
    exit 1
  fi

  prompt_inputs
  step_1_1_vpc
  step_1_2_security
  step_1_3_s3
  step_1_4_secrets
  step_1_5_route53
  print_summary
}

main "$@"
