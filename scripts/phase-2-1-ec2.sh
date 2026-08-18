#!/usr/bin/env bash
# =============================================================================
# Phase 2.1 — EC2 Application Server
# =============================================================================
# Launches Ubuntu 24.04 backend instance with Docker, PostgreSQL, Nginx, AWS CLI.
#
# Prerequisites: Phase 1 complete (setup-vars.sh populated)
#
# Usage:
#   ./scripts/phase-2-1-ec2.sh
#
# Requires AWS key pair named "needforfit-key" in the target region.
# SSH locally with the matching private key file: needforfit-key.pem
#
# Cleanup:
#   aws ec2 terminate-instances --instance-ids $INSTANCE_ID
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=setup-vars.sh
source "${SCRIPT_DIR}/setup-vars.sh"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

require_aws

# Resolve subnet / security group (canonical + legacy names)
SUBNET_ID="${SUBNET_1A:-${PUBLIC_SUBNET_1_ID:-}}"
EC2_SG_ID="${EC2_SG:-${EC2_SECURITY_GROUP_ID:-}}"

for var_name in SUBNET_ID EC2_SG_ID; do
  if [[ -z "${!var_name}" ]]; then
    echo "ERROR: ${var_name} not set. Run Phase 1 first (./scripts/phase-1-all.sh)." >&2
    exit 1
  fi
done

# Fixed resource names per deployment spec
EC2_IAM_ROLE_NAME="needforfit-ec2-role"
EC2_INSTANCE_PROFILE_NAME="needforfit-ec2-profile"
EC2_KEY_NAME="needforfit-key"
EC2_INSTANCE_TYPE="${EC2_INSTANCE_TYPE:-t3.micro}"
EC2_VOLUME_SIZE_GB="${EC2_VOLUME_SIZE_GB:-50}"
INSTANCE_TAG_NAME="needforfit-backend"

ACCOUNT_ID="$(get_account_id)"
USER_DATA_FILE="$(mktemp)"
TRUST_POLICY_FILE="$(mktemp)"
SECRETS_POLICY_FILE="$(mktemp)"
S3_POLICY_FILE="$(mktemp)"

cleanup() {
  rm -f "${USER_DATA_FILE}" "${TRUST_POLICY_FILE}" "${SECRETS_POLICY_FILE}" "${S3_POLICY_FILE}"
}
trap cleanup EXIT

echo "==> Phase 2.1: EC2 Application Server"
echo "    Type: ${EC2_INSTANCE_TYPE} | Volume: ${EC2_VOLUME_SIZE_GB}GB gp2 | Key: ${EC2_KEY_NAME}"
echo ""

# =============================================================================
# 1. IAM role + policies (S3 + Secrets Manager for deployment)
# =============================================================================
echo "==> Creating IAM role and instance profile..."

cat > "${TRUST_POLICY_FILE}" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "ec2.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

if aws iam get-role --role-name "${EC2_IAM_ROLE_NAME}" >/dev/null 2>&1; then
  echo "✓ IAM role already exists: ${EC2_IAM_ROLE_NAME}"
else
  aws iam create-role \
    --role-name "${EC2_IAM_ROLE_NAME}" \
    --assume-role-policy-document "file://${TRUST_POLICY_FILE}" \
    --description "Needforfit EC2 — S3 sync + Secrets Manager read for deployments" \
    --tags Key=Project,Value="${APP_NAME}",Key=Environment,Value="${ENV_NAME}",Key=Phase,Value=2-1-ec2
  echo "✓ Created IAM role: ${EC2_IAM_ROLE_NAME}"
fi
append_setup_var "EC2_IAM_ROLE_NAME" "${EC2_IAM_ROLE_NAME}"

# Secrets Manager read
cat > "${SECRETS_POLICY_FILE}" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
      "Resource": "arn:aws:secretsmanager:${AWS_REGION}:${ACCOUNT_ID}:secret:${APP_NAME}/*"
    }
  ]
}
EOF

SECRETS_POLICY_ARN="arn:aws:iam::${ACCOUNT_ID}:policy/needforfit-ec2-secrets-read"
if ! aws iam get-policy --policy-arn "${SECRETS_POLICY_ARN}" >/dev/null 2>&1; then
  SECRETS_POLICY_ARN="$(aws iam create-policy \
    --policy-name "needforfit-ec2-secrets-read" \
    --policy-document "file://${SECRETS_POLICY_FILE}" \
    --query Policy.Arn \
    --output text)"
  echo "✓ Created Secrets Manager read policy"
fi
aws iam attach-role-policy --role-name "${EC2_IAM_ROLE_NAME}" --policy-arn "${SECRETS_POLICY_ARN}" 2>/dev/null || true
echo "✓ Attached Secrets Manager policy"

# S3 read (static + backup buckets from Phase 1)
S3_RESOURCES="[]"
if [[ -n "${S3_STATIC_BUCKET:-}" ]]; then
  S3_RESOURCES="$(python3 - <<PY
import json
buckets = ["${S3_STATIC_BUCKET:-}", "${S3_BACKUP_BUCKET:-}", "${S3_LOGS_BUCKET:-}"]
buckets = [b for b in buckets if b]
resources = []
for b in buckets:
    resources.append(f"arn:aws:s3:::{b}")
    resources.append(f"arn:aws:s3:::{b}/*")
print(json.dumps(list(dict.fromkeys(resources))))
PY
)"
fi

if [[ "${S3_RESOURCES}" != "[]" ]]; then
  cat > "${S3_POLICY_FILE}" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"],
      "Resource": ${S3_RESOURCES}
    }
  ]
}
EOF
  S3_POLICY_ARN="arn:aws:iam::${ACCOUNT_ID}:policy/needforfit-ec2-s3-deploy"
  if ! aws iam get-policy --policy-arn "${S3_POLICY_ARN}" >/dev/null 2>&1; then
    S3_POLICY_ARN="$(aws iam create-policy \
      --policy-name "needforfit-ec2-s3-deploy" \
      --policy-document "file://${S3_POLICY_FILE}" \
      --query Policy.Arn \
      --output text)"
    echo "✓ Created S3 deploy policy"
  fi
  aws iam attach-role-policy --role-name "${EC2_IAM_ROLE_NAME}" --policy-arn "${S3_POLICY_ARN}" 2>/dev/null || true
  echo "✓ Attached S3 policy"
else
  echo "⚠  S3_STATIC_BUCKET not set — skipping S3 policy (run Phase 1 first)"
fi

# ECR pull for backend container deploys (GitHub Actions)
aws iam attach-role-policy \
  --role-name "${EC2_IAM_ROLE_NAME}" \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly 2>/dev/null || true
echo "✓ Attached ECR read-only policy"

# Instance profile
if aws iam get-instance-profile --instance-profile-name "${EC2_INSTANCE_PROFILE_NAME}" >/dev/null 2>&1; then
  echo "✓ Instance profile already exists: ${EC2_INSTANCE_PROFILE_NAME}"
else
  aws iam create-instance-profile \
    --instance-profile-name "${EC2_INSTANCE_PROFILE_NAME}" \
    --tags Key=Project,Value="${APP_NAME}",Key=Environment,Value="${ENV_NAME}"
  echo "✓ Created instance profile: ${EC2_INSTANCE_PROFILE_NAME}"
fi
append_setup_var "EC2_INSTANCE_PROFILE_NAME" "${EC2_INSTANCE_PROFILE_NAME}"

aws iam add-role-to-instance-profile \
  --instance-profile-name "${EC2_INSTANCE_PROFILE_NAME}" \
  --role-name "${EC2_IAM_ROLE_NAME}" 2>/dev/null || true
echo "✓ Linked role to instance profile"
echo "  Waiting for IAM propagation..."
sleep 10

# =============================================================================
# 2. Verify key pair exists
# =============================================================================
if aws ec2 describe-key-pairs --key-names "${EC2_KEY_NAME}" >/dev/null 2>&1; then
  echo "✓ Key pair found: ${EC2_KEY_NAME}"
else
  echo "ERROR: Key pair '${EC2_KEY_NAME}' not found in ${AWS_REGION}." >&2
  echo "       Create it first: aws ec2 create-key-pair --key-name ${EC2_KEY_NAME} --query KeyMaterial --output text > needforfit-key.pem" >&2
  echo "       chmod 400 needforfit-key.pem" >&2
  exit 1
fi
append_setup_var "EC2_KEY_NAME" "${EC2_KEY_NAME}"

# =============================================================================
# 3. Latest Ubuntu 24.04 AMI
# =============================================================================
echo "==> Resolving latest Ubuntu 24.04 LTS AMI..."
AMI_ID="$(aws ec2 describe-images \
  --owners 099720109477 \
  --filters \
    "Name=name,Values=ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*" \
    "Name=state,Values=available" \
  --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
  --output text)"
echo "✓ AMI: ${AMI_ID}"
append_setup_var "EC2_AMI_ID" "${AMI_ID}"

# =============================================================================
# 4. User-data bootstrap (minimal)
# =============================================================================
cat > "${USER_DATA_FILE}" <<'EOF'
#!/bin/bash
set -euxo pipefail
export DEBIAN_FRONTEND=noninteractive

# Update system packages
apt-get update -y
apt-get upgrade -y

# Docker + Docker Compose plugin
apt-get install -y docker.io docker-compose-v2
systemctl enable docker
systemctl start docker
usermod -aG docker ubuntu

# PostgreSQL, Nginx, AWS CLI
apt-get install -y postgresql postgresql-contrib nginx awscli curl ca-certificates
systemctl enable postgresql nginx
systemctl start postgresql
systemctl start nginx

# Application directory
mkdir -p /home/ubuntu/needforfit-app
chown -R ubuntu:ubuntu /home/ubuntu/needforfit-app

echo "Needforfit EC2 bootstrap complete $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> /var/log/needforfit-bootstrap.log
EOF

# =============================================================================
# 5. Launch EC2 (or reuse existing needforfit-backend)
# =============================================================================
EXISTING_INSTANCE_ID="$(aws ec2 describe-instances \
  --filters \
    "Name=tag:Name,Values=${INSTANCE_TAG_NAME}" \
    "Name=instance-state-name,Values=pending,running,stopping,stopped" \
  --query 'Reservations[0].Instances[0].InstanceId' \
  --output text 2>/dev/null || true)"

if [[ -n "${EXISTING_INSTANCE_ID}" && "${EXISTING_INSTANCE_ID}" != "None" ]]; then
  EC2_INSTANCE_ID="${EXISTING_INSTANCE_ID}"
  echo "✓ EC2 instance already exists: ${EC2_INSTANCE_ID} (Name=${INSTANCE_TAG_NAME})"
else
  echo "==> Launching EC2 instance..."
  EC2_INSTANCE_ID="$(aws ec2 run-instances \
    --image-id "${AMI_ID}" \
    --instance-type "${EC2_INSTANCE_TYPE}" \
    --key-name "${EC2_KEY_NAME}" \
    --subnet-id "${SUBNET_ID}" \
    --security-group-ids "${EC2_SG_ID}" \
    --iam-instance-profile "Name=${EC2_INSTANCE_PROFILE_NAME}" \
    --user-data "file://${USER_DATA_FILE}" \
    --block-device-mappings "[{\"DeviceName\":\"/dev/sda1\",\"Ebs\":{\"VolumeSize\":${EC2_VOLUME_SIZE_GB},\"VolumeType\":\"gp2\",\"DeleteOnTermination\":true}}]" \
    --metadata-options "HttpTokens=required,HttpEndpoint=enabled" \
    --tag-specifications "ResourceType=instance,Tags=[$(tag_spec 2-1-ec2),{Key=Name,Value=${INSTANCE_TAG_NAME}}]" \
    --query 'Instances[0].InstanceId' \
    --output text)"
  echo "✓ Launched instance: ${EC2_INSTANCE_ID}"
fi

append_setup_var "EC2_INSTANCE_ID" "${EC2_INSTANCE_ID}"
append_setup_var "INSTANCE_ID" "${EC2_INSTANCE_ID}"

# =============================================================================
# 6. Wait for running + status checks
# =============================================================================
echo "==> Waiting for instance to reach running state..."
aws ec2 wait instance-running --instance-ids "${EC2_INSTANCE_ID}"
echo "✓ Instance state: running"

echo "==> Waiting for status checks (may take 1–3 minutes)..."
if aws ec2 wait instance-status-ok --instance-ids "${EC2_INSTANCE_ID}" 2>/dev/null; then
  echo "✓ Instance status checks: ok"
else
  echo "⚠  Status checks not OK yet — instance may still be bootstrapping user-data"
fi

# =============================================================================
# 7. Collect IPs
# =============================================================================
EC2_PUBLIC_IP="$(aws ec2 describe-instances \
  --instance-ids "${EC2_INSTANCE_ID}" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)"
EC2_PRIVATE_IP="$(aws ec2 describe-instances \
  --instance-ids "${EC2_INSTANCE_ID}" \
  --query 'Reservations[0].Instances[0].PrivateIpAddress' \
  --output text)"

if [[ -z "${EC2_PUBLIC_IP}" || "${EC2_PUBLIC_IP}" == "None" ]]; then
  echo "ERROR: Instance has no public IP. Check subnet auto-assign public IP settings." >&2
  exit 1
fi

append_setup_var "EC2_PUBLIC_IP" "${EC2_PUBLIC_IP}"
append_setup_var "EC2_PRIVATE_IP" "${EC2_PRIVATE_IP}"

# =============================================================================
# 8. Summary
# =============================================================================
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              Phase 2.1 Complete                               ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  INSTANCE_ID     = ${EC2_INSTANCE_ID}"
echo "  EC2_PUBLIC_IP   = ${EC2_PUBLIC_IP}   ← GitHub secret EC2_HOST"
echo "  EC2_PRIVATE_IP  = ${EC2_PRIVATE_IP}"
echo ""
echo "SSH (manual test):"
echo "  ssh -i needforfit-key.pem ubuntu@${EC2_PUBLIC_IP}"
echo ""
echo "Variables saved to: ${SCRIPT_DIR}/setup-vars.sh"
