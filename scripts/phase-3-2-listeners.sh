#!/usr/bin/env bash
# =============================================================================
# Phase 3.2 — ALB Listeners, SSL Certificate, Routing Rules
# =============================================================================
# Creates:
#   - Static target group (Nginx port 80)
#   - ACM certificate (DNS validation via Route 53)
#   - HTTP listener → redirect HTTPS
#   - HTTPS listener: /api/* → backend, default /* → static
#
# Prerequisites: Phase 1.5 (Route 53), Phase 3.1 (ALB + backend TG)
#
# Usage:
#   ./scripts/phase-3-2-listeners.sh
#
# Cleanup:
#   aws elbv2 delete-listener --listener-arn $HTTPS_LISTENER_ARN
#   aws elbv2 delete-listener --listener-arn $HTTP_LISTENER_ARN
#   aws acm delete-certificate --certificate-arn $ACM_CERTIFICATE_ARN
#   aws elbv2 delete-target-group --target-group-arn $STATIC_TARGET_GROUP_ARN
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=setup-vars.sh
source "${SCRIPT_DIR}/setup-vars.sh"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

require_aws

for var in VPC_ID ALB_ARN BACKEND_TARGET_GROUP_ARN EC2_INSTANCE_ID EC2_SECURITY_GROUP_ID ALB_SECURITY_GROUP_ID ROUTE53_HOSTED_ZONE_ID; do
  if [[ -z "${!var:-}" ]]; then
    echo "ERROR: ${var} not set. Run prior phase scripts first." >&2
    exit 1
  fi
done

STATIC_TG_NAME="${PROJECT_NAME}-static-tg"
CERT_DOMAIN="${DOMAIN_NAME}"
WILDCARD_DOMAIN="*.${DOMAIN_NAME}"

echo "==> Phase 3.2: Listeners, SSL, Routing (${CERT_DOMAIN})"

# Allow Nginx (80) from ALB to EC2
authorize_sg_ingress "${EC2_SECURITY_GROUP_ID}" \
  --protocol tcp --port 80 --source-group "${ALB_SECURITY_GROUP_ID}"
echo "✓ EC2 security group allows port 80 from ALB"

# --- Static target group (Nginx) ---
EXISTING_STATIC_TG="$(aws elbv2 describe-target-groups \
  --names "${STATIC_TG_NAME}" \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text 2>/dev/null || true)"

if [[ -n "${EXISTING_STATIC_TG}" && "${EXISTING_STATIC_TG}" != "None" ]]; then
  STATIC_TARGET_GROUP_ARN="${EXISTING_STATIC_TG}"
  echo "✓ Static target group already exists: ${STATIC_TARGET_GROUP_ARN}"
else
  STATIC_TARGET_GROUP_ARN="$(aws elbv2 create-target-group \
    --name "${STATIC_TG_NAME}" \
    --protocol HTTP \
    --port 80 \
    --vpc-id "${VPC_ID}" \
    --target-type instance \
    --health-check-protocol HTTP \
    --health-check-path /health \
    --health-check-interval-seconds 30 \
    --health-check-timeout-seconds 5 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3 \
    --matcher HttpCode=200 \
    --tags Key=Project,Value="${PROJECT_NAME}",Key=Environment,Value="${ENV_NAME}",Key=Phase,Value=3-2-listeners \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)"
  echo "✓ Created static target group: ${STATIC_TARGET_GROUP_ARN}"
fi
append_setup_var "STATIC_TARGET_GROUP_ARN" "${STATIC_TARGET_GROUP_ARN}"

aws elbv2 register-targets \
  --target-group-arn "${STATIC_TARGET_GROUP_ARN}" \
  --targets "Id=${EC2_INSTANCE_ID}" 2>/dev/null || true
echo "✓ Registered EC2 in static target group"

# --- ACM certificate ---
EXISTING_CERT_ARN="$(aws acm list-certificates \
  --certificate-statuses ISSUED PENDING_VALIDATION \
  --query "CertificateSummaryList[?DomainName=='${CERT_DOMAIN}'].CertificateArn | [0]" \
  --output text 2>/dev/null || true)"

if [[ -n "${EXISTING_CERT_ARN}" && "${EXISTING_CERT_ARN}" != "None" ]]; then
  ACM_CERTIFICATE_ARN="${EXISTING_CERT_ARN}"
  echo "✓ ACM certificate already exists: ${ACM_CERTIFICATE_ARN}"
else
  ACM_CERTIFICATE_ARN="$(aws acm request-certificate \
    --domain-name "${CERT_DOMAIN}" \
    --subject-alternative-names "${WILDCARD_DOMAIN}" \
    --validation-method DNS \
    --tags Key=Project,Value="${PROJECT_NAME}",Key=Environment,Value="${ENV_NAME}" \
    --query CertificateArn \
    --output text)"
  echo "✓ Requested ACM certificate: ${ACM_CERTIFICATE_ARN}"

  echo "==> Creating Route 53 DNS validation records..."
  sleep 5

  VALIDATION_JSON="$(mktemp)"
  CHANGE_BATCH_JSON="$(mktemp)"

  aws acm describe-certificate \
    --certificate-arn "${ACM_CERTIFICATE_ARN}" \
    --query 'Certificate.DomainValidationOptions' \
    --output json > "${VALIDATION_JSON}"

  python3 - "${VALIDATION_JSON}" "${CHANGE_BATCH_JSON}" <<'PY'
import json
import sys

validation_path, batch_path = sys.argv[1], sys.argv[2]
records = json.load(open(validation_path))

changes = []
seen = set()
for item in records:
    opt = item.get("ResourceRecord")
    if not opt:
        continue
    key = (opt["Name"], opt["Type"])
    if key in seen:
        continue
    seen.add(key)
    changes.append({
        "Action": "UPSERT",
        "ResourceRecordSet": {
            "Name": opt["Name"],
            "Type": opt["Type"],
            "TTL": 300,
            "ResourceRecords": [{"Value": opt["Value"]}],
        },
    })

json.dump({"Comment": "ACM DNS validation", "Changes": changes}, open(batch_path, "w"))
PY

  if [[ -s "${CHANGE_BATCH_JSON}" ]] && grep -q '"Changes"' "${CHANGE_BATCH_JSON}"; then
    aws route53 change-resource-record-sets \
      --hosted-zone-id "${ROUTE53_HOSTED_ZONE_ID}" \
      --change-batch "file://${CHANGE_BATCH_JSON}" >/dev/null
    echo "✓ DNS validation records created"
  fi

  rm -f "${VALIDATION_JSON}" "${CHANGE_BATCH_JSON}"

  echo "==> Waiting for certificate validation (up to 20 minutes)..."
  aws acm wait certificate-validated --certificate-arn "${ACM_CERTIFICATE_ARN}"
  echo "✓ Certificate validated"
fi
append_setup_var "ACM_CERTIFICATE_ARN" "${ACM_CERTIFICATE_ARN}"

# --- HTTP listener (redirect to HTTPS) ---
HTTP_LISTENER_ARN="$(aws elbv2 describe-listeners \
  --load-balancer-arn "${ALB_ARN}" \
  --query "Listeners[?Port==\`80\`].ListenerArn | [0]" \
  --output text 2>/dev/null || true)"

if [[ -n "${HTTP_LISTENER_ARN}" && "${HTTP_LISTENER_ARN}" != "None" ]]; then
  echo "✓ HTTP listener already exists: ${HTTP_LISTENER_ARN}"
else
  HTTP_LISTENER_ARN="$(aws elbv2 create-listener \
    --load-balancer-arn "${ALB_ARN}" \
    --protocol HTTP \
    --port 80 \
    --default-actions '[{"Type":"redirect","RedirectConfig":{"Protocol":"HTTPS","Port":"443","StatusCode":"HTTP_301"}}]' \
    --query 'Listeners[0].ListenerArn' \
    --output text)"
  echo "✓ Created HTTP listener (redirect → HTTPS)"
fi
append_setup_var "HTTP_LISTENER_ARN" "${HTTP_LISTENER_ARN}"

# --- HTTPS listener (default → static) ---
HTTPS_LISTENER_ARN="$(aws elbv2 describe-listeners \
  --load-balancer-arn "${ALB_ARN}" \
  --query "Listeners[?Port==\`443\`].ListenerArn | [0]" \
  --output text 2>/dev/null || true)"

if [[ -n "${HTTPS_LISTENER_ARN}" && "${HTTPS_LISTENER_ARN}" != "None" ]]; then
  echo "✓ HTTPS listener already exists: ${HTTPS_LISTENER_ARN}"
else
  HTTPS_LISTENER_ARN="$(aws elbv2 create-listener \
    --load-balancer-arn "${ALB_ARN}" \
    --protocol HTTPS \
    --port 443 \
    --certificates "CertificateArn=${ACM_CERTIFICATE_ARN}" \
    --ssl-policy ELBSecurityPolicy-TLS13-1-2-2021-06 \
    --default-actions "Type=forward,TargetGroupArn=${STATIC_TARGET_GROUP_ARN}" \
    --query 'Listeners[0].ListenerArn' \
    --output text)"
  echo "✓ Created HTTPS listener (default → static TG)"
fi
append_setup_var "HTTPS_LISTENER_ARN" "${HTTPS_LISTENER_ARN}"

# --- Routing rule: /api/* → backend ---
EXISTING_RULE="$(aws elbv2 describe-rules \
  --listener-arn "${HTTPS_LISTENER_ARN}" \
  --query "Rules[?Priority!='default'] | [?contains(to_string(Conditions), '/api/')].RuleArn | [0]" \
  --output text 2>/dev/null || true)"

if [[ -n "${EXISTING_RULE}" && "${EXISTING_RULE}" != "None" ]]; then
  echo "✓ /api/* routing rule already exists"
else
  aws elbv2 create-rule \
    --listener-arn "${HTTPS_LISTENER_ARN}" \
    --priority 100 \
    --conditions "Field=path-pattern,Values=/api/*" \
    --actions "Type=forward,TargetGroupArn=${BACKEND_TARGET_GROUP_ARN}"
  echo "✓ Created rule: /api/* → backend (port 5000)"
fi

echo ""
echo "Phase 3.2 complete. Variables saved to setup-vars.sh"
echo "  STATIC_TARGET_GROUP_ARN=${STATIC_TARGET_GROUP_ARN}"
echo "  ACM_CERTIFICATE_ARN=${ACM_CERTIFICATE_ARN}"
echo "  HTTPS_LISTENER_ARN=${HTTPS_LISTENER_ARN}"
echo ""
echo "Routing:"
echo "  https://${DOMAIN_NAME}/api/*  → backend target group"
echo "  https://${DOMAIN_NAME}/*        → static (Nginx) target group"
