#!/usr/bin/env bash
# =============================================================================
# Needforfit — Create EC2 key pair for deploy & GitHub SSH
# =============================================================================
# Creates AWS key pair "needforfit-key" and saves the private key locally.
#
# Usage:
#   bash scripts/create-ec2-keypair.sh
#   EC2_KEY_NAME=my-key bash scripts/create-ec2-keypair.sh
#
# Output:
#   needforfit-key.pem  (repo root — DO NOT COMMIT)
#
# Required before:
#   - aws configure (AdministratorAccess or ec2:CreateKeyPair)
#   - bash scripts/setup-all.sh (Phase 2+)
#   - GitHub secret EC2_SSH_KEY (paste PEM contents)
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EC2_KEY_NAME="${EC2_KEY_NAME:-needforfit-key}"
AWS_REGION="${AWS_REGION:-ap-southeast-1}"
KEY_FILE="${EC2_KEY_FILE:-${SCRIPT_DIR}/../${EC2_KEY_NAME}.pem}"

echo "==> Needforfit EC2 key pair setup"
echo "    Key name : ${EC2_KEY_NAME}"
echo "    Region   : ${AWS_REGION}"
echo "    PEM file : ${KEY_FILE}"
echo ""

if ! command -v aws >/dev/null 2>&1; then
  echo "ERROR: AWS CLI is required." >&2
  exit 1
fi

if ! aws sts get-caller-identity >/dev/null 2>&1; then
  echo "ERROR: AWS credentials not configured. Run: aws configure" >&2
  exit 1
fi

export AWS_DEFAULT_REGION="${AWS_REGION}"

KEY_EXISTS_AWS=false
if aws ec2 describe-key-pairs --key-names "${EC2_KEY_NAME}" --region "${AWS_REGION}" >/dev/null 2>&1; then
  KEY_EXISTS_AWS=true
  echo "✓ Key pair '${EC2_KEY_NAME}' already exists in AWS (${AWS_REGION})"
else
  echo "==> Creating key pair in AWS..."
  mkdir -p "$(dirname "${KEY_FILE}")"
  aws ec2 create-key-pair \
    --key-name "${EC2_KEY_NAME}" \
    --region "${AWS_REGION}" \
    --query KeyMaterial \
    --output text > "${KEY_FILE}"
  chmod 400 "${KEY_FILE}"
  echo "✓ Created key pair and saved private key"
fi

if [[ -f "${KEY_FILE}" ]]; then
  chmod 400 "${KEY_FILE}" 2>/dev/null || true
  echo "✓ Private key file: ${KEY_FILE} ($(wc -c < "${KEY_FILE}" | tr -d ' ') bytes, mode 400)"
elif [[ "${KEY_EXISTS_AWS}" == "true" ]]; then
  echo "" >&2
  echo "⚠  Key pair exists in AWS but ${KEY_FILE} is missing." >&2
  echo "   AWS does not allow downloading the private key again." >&2
  echo "   Options:" >&2
  echo "     1. Restore needforfit-key.pem from your backup" >&2
  echo "     2. Delete the key pair in AWS Console, then re-run this script:" >&2
  echo "        aws ec2 delete-key-pair --key-name ${EC2_KEY_NAME} --region ${AWS_REGION}" >&2
  exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              EC2 key pair ready                               ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "  1. Back up ${KEY_FILE} securely"
echo "  2. GitHub secret EC2_SSH_KEY → paste full PEM contents"
echo "  3. Run deploy: bash scripts/setup-all.sh all"
echo ""
echo "Test SSH (after EC2 is running):"
echo "  ssh -i ${KEY_FILE} ubuntu@<EC2_PUBLIC_IP>"
