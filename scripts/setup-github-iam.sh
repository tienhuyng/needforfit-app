#!/usr/bin/env bash
# =============================================================================
# Setup IAM user and policies for Needforfit GitHub Actions deployments.
#
# Prerequisites:
#   - AWS CLI v2 installed and configured (aws configure)
#   - Caller IAM identity with permissions to create users, policies, and ECR repos
#
# Usage:
#   chmod +x scripts/setup-github-iam.sh
#   ./scripts/setup-github-iam.sh
#
# Output:
#   scripts/github-secrets-setup.txt  (contains secrets — DO NOT COMMIT)
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
AWS_REGION="${AWS_REGION:-ap-southeast-1}"
IAM_USER_NAME="github-actions-needforfit"
ECR_REPOSITORY="needforfit-backend"
S3_BUCKET_PREFIX="needforfit-static-"

S3_POLICY_NAME="NeedforfitGitHubActionsS3Deploy"
ECR_POLICY_NAME="NeedforfitGitHubActionsECRDeploy"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_FILE="${SCRIPT_DIR}/github-secrets-setup.txt"
S3_POLICY_FILE="$(mktemp)"
ECR_POLICY_FILE="$(mktemp)"

cleanup() {
  rm -f "${S3_POLICY_FILE}" "${ECR_POLICY_FILE}"
}
trap cleanup EXIT

echo "==> Needforfit GitHub Actions IAM setup"
echo "    Region      : ${AWS_REGION}"
echo "    IAM user    : ${IAM_USER_NAME}"
echo "    ECR repo    : ${ECR_REPOSITORY}"
echo "    S3 buckets  : ${S3_BUCKET_PREFIX}*"
echo ""

# -----------------------------------------------------------------------------
# Resolve AWS account
# -----------------------------------------------------------------------------
echo "==> Resolving AWS account ID..."
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
echo "    Account ID  : ${ACCOUNT_ID}"
echo "    ECR registry: ${ECR_REGISTRY}"
echo ""

# -----------------------------------------------------------------------------
# Step 1: Create IAM user (idempotent)
# -----------------------------------------------------------------------------
echo "==> Step 1: Creating IAM user '${IAM_USER_NAME}'..."
if aws iam get-user --user-name "${IAM_USER_NAME}" >/dev/null 2>&1; then
  echo "    User already exists, skipping create."
else
  aws iam create-user --user-name "${IAM_USER_NAME}" \
    --tags Key=Project,Value=Needforfit Key=ManagedBy,Value=setup-github-iam.sh
  echo "    User created."
fi
echo ""

# -----------------------------------------------------------------------------
# Step 2: Create S3 deploy policy JSON
# -----------------------------------------------------------------------------
echo "==> Step 2: Creating S3 deploy policy '${S3_POLICY_NAME}'..."
cat > "${S3_POLICY_FILE}" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ListStaticBuckets",
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::${S3_BUCKET_PREFIX}*"
    },
    {
      "Sid": "ManageStaticObjects",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::${S3_BUCKET_PREFIX}*/*"
    }
  ]
}
EOF

S3_POLICY_ARN="arn:aws:iam::${ACCOUNT_ID}:policy/${S3_POLICY_NAME}"
if aws iam get-policy --policy-arn "${S3_POLICY_ARN}" >/dev/null 2>&1; then
  echo "    Policy already exists: ${S3_POLICY_ARN}"
else
  S3_POLICY_ARN="$(aws iam create-policy \
    --policy-name "${S3_POLICY_NAME}" \
    --policy-document "file://${S3_POLICY_FILE}" \
    --description "Allow GitHub Actions to deploy Needforfit static assets to S3" \
    --query Policy.Arn \
    --output text)"
  echo "    Policy created: ${S3_POLICY_ARN}"
fi
echo ""

# -----------------------------------------------------------------------------
# Step 3: Attach S3 policy to user
# -----------------------------------------------------------------------------
echo "==> Step 3: Attaching S3 policy to user..."
aws iam attach-user-policy \
  --user-name "${IAM_USER_NAME}" \
  --policy-arn "${S3_POLICY_ARN}"
echo "    Attached."
echo ""

# -----------------------------------------------------------------------------
# Step 4: Create ECR policy JSON
# -----------------------------------------------------------------------------
echo "==> Step 4: Creating ECR policy '${ECR_POLICY_NAME}'..."
cat > "${ECR_POLICY_FILE}" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ECRAuthorization",
      "Effect": "Allow",
      "Action": ["ecr:GetAuthorizationToken"],
      "Resource": "*"
    },
    {
      "Sid": "ECRRepositoryAccess",
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:DescribeRepositories",
        "ecr:DescribeImages",
        "ecr:ListImages"
      ],
      "Resource": "arn:aws:ecr:${AWS_REGION}:${ACCOUNT_ID}:repository/${ECR_REPOSITORY}"
    }
  ]
}
EOF

ECR_POLICY_ARN="arn:aws:iam::${ACCOUNT_ID}:policy/${ECR_POLICY_NAME}"
if aws iam get-policy --policy-arn "${ECR_POLICY_ARN}" >/dev/null 2>&1; then
  echo "    Policy already exists: ${ECR_POLICY_ARN}"
else
  ECR_POLICY_ARN="$(aws iam create-policy \
    --policy-name "${ECR_POLICY_NAME}" \
    --policy-document "file://${ECR_POLICY_FILE}" \
    --description "Allow GitHub Actions to push Needforfit backend images to ECR" \
    --query Policy.Arn \
    --output text)"
  echo "    Policy created: ${ECR_POLICY_ARN}"
fi
echo ""

# -----------------------------------------------------------------------------
# Step 5: Attach ECR policy to user
# -----------------------------------------------------------------------------
echo "==> Step 5: Attaching ECR policy to user..."
aws iam attach-user-policy \
  --user-name "${IAM_USER_NAME}" \
  --policy-arn "${ECR_POLICY_ARN}"
echo "    Attached."
echo ""

# -----------------------------------------------------------------------------
# Step 6: Generate access keys
# -----------------------------------------------------------------------------
echo "==> Step 6: Generating access keys..."
EXISTING_KEYS="$(aws iam list-access-keys --user-name "${IAM_USER_NAME}" --query 'AccessKeyMetadata | length(@)' --output text)"
if [[ "${EXISTING_KEYS}" -ge 2 ]]; then
  echo "ERROR: IAM user already has 2 access keys (AWS limit)." >&2
  echo "       Delete an unused key, then re-run this script." >&2
  exit 1
fi

ACCESS_KEY_LINE="$(aws iam create-access-key \
  --user-name "${IAM_USER_NAME}" \
  --query 'AccessKey.[AccessKeyId,SecretAccessKey]' \
  --output text)"
AWS_ACCESS_KEY_ID="$(echo "${ACCESS_KEY_LINE}" | awk '{print $1}')"
AWS_SECRET_ACCESS_KEY="$(echo "${ACCESS_KEY_LINE}" | awk '{print $2}')"
echo "    Access key created: ${AWS_ACCESS_KEY_ID}"
echo ""

# -----------------------------------------------------------------------------
# Step 7: Create ECR repository (if not exists)
# -----------------------------------------------------------------------------
echo "==> Step 7: Ensuring ECR repository '${ECR_REPOSITORY}' exists..."
if aws ecr describe-repositories \
  --repository-names "${ECR_REPOSITORY}" \
  --region "${AWS_REGION}" >/dev/null 2>&1; then
  echo "    Repository already exists."
else
  aws ecr create-repository \
    --repository-name "${ECR_REPOSITORY}" \
    --region "${AWS_REGION}" \
    --image-scanning-configuration scanOnPush=true \
    --encryption-configuration encryptionType=AES256 >/dev/null
  echo "    Repository created."
fi
echo ""

# -----------------------------------------------------------------------------
# Step 8: Write GitHub secrets reference file
# -----------------------------------------------------------------------------
echo "==> Step 8: Writing output to ${OUTPUT_FILE}..."
cat > "${OUTPUT_FILE}" <<EOF
# Needforfit GitHub Actions — AWS credentials setup
# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# WARNING: Contains secrets. DO NOT COMMIT THIS FILE.
#
# Add these as GitHub repository secrets:
#   Settings → Secrets and variables → Actions → New repository secret

AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}

# Additional values for workflows / manual reference
AWS_REGION=${AWS_REGION}
ECR_REGISTRY=${ECR_REGISTRY}
ECR_REPOSITORY=${ECR_REPOSITORY}
S3_STATIC_BUCKET=<your-bucket-name e.g. needforfit-static-prod>

# Other secrets (not created by this script — set manually):
# EC2_SSH_KEY
# EC2_HOST
# EC2_USER
# DATABASE_URL
# JWT_SECRET
EOF

chmod 600 "${OUTPUT_FILE}"

# -----------------------------------------------------------------------------
# Step 9: Console summary
# -----------------------------------------------------------------------------
echo ""
echo "=============================================="
echo " Setup complete"
echo "=============================================="
echo "AWS_ACCESS_KEY_ID     = ${AWS_ACCESS_KEY_ID}"
echo "AWS_SECRET_ACCESS_KEY = (saved to file only)"
echo "ECR_REGISTRY          = ${ECR_REGISTRY}"
echo ""
echo "Secrets saved to: ${OUTPUT_FILE}"
echo ""
echo "Next steps:"
echo "  1. Copy values from ${OUTPUT_FILE} into GitHub Actions secrets"
echo "  2. Set S3_STATIC_BUCKET to your static hosting bucket name"
echo "  3. Never commit ${OUTPUT_FILE}"
echo "=============================================="
