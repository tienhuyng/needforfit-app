#!/usr/bin/env bash
# =============================================================================
# Phase 3 (All) — ALB, Listeners, SSL, Route 53
# =============================================================================
# Consolidated script: target group + ALB + HTTPS listeners + DNS alias.
#
# Usage:
#   ./scripts/phase-3-alb.sh
#   DOMAIN_NAME=needforfit-app.withkris.life ./scripts/phase-3-alb.sh
#
# Prerequisites: Phase 1 (phase-1-all.sh) + Phase 2 (phase-2-1-ec2.sh)
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=setup-vars.sh
source "${SCRIPT_DIR}/setup-vars.sh"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

ALB_NAME="needforfit-alb"
TG_BACKEND_NAME="needforfit-backend-tg"
TG_PORT=80

# Resolved from setup-vars (canonical + legacy names)
SUBNET_A="${SUBNET_1A:-${PUBLIC_SUBNET_1_ID:-}}"
SUBNET_B="${SUBNET_1B:-${PUBLIC_SUBNET_2_ID:-}}"
ALB_SG_ID="${ALB_SG:-${ALB_SECURITY_GROUP_ID:-}}"
EC2_SG_ID="${EC2_SG:-${EC2_SECURITY_GROUP_ID:-}}"
INSTANCE="${INSTANCE_ID:-${EC2_INSTANCE_ID:-}}"
HOSTED_ZONE="${HOSTED_ZONE_ID:-${ROUTE53_HOSTED_ZONE_ID:-}}"

# =============================================================================
# Helpers
# =============================================================================

require_phase_prereqs() {
  local missing=()
  for var_name in VPC_ID SUBNET_A SUBNET_B ALB_SG_ID EC2_SG_ID INSTANCE EC2_PRIVATE_IP HOSTED_ZONE; do
    [[ -z "${!var_name:-}" ]] && missing+=("${var_name}")
  done
  if [[ ${#missing[@]} -gt 0 ]]; then
    echo "ERROR: Missing required variables: ${missing[*]}" >&2
    echo "       Run Phase 1 and Phase 2 scripts first." >&2
    exit 1
  fi
}

prompt_domain() {
  if [[ -n "${DOMAIN_NAME:-}" && "${DOMAIN_NAME}" != "needforfit-app.withkris.life" ]]; then
    echo "  Domain (from setup-vars): ${DOMAIN_NAME}"
    return
  fi
  if [[ -z "${DOMAIN_NAME:-}" || "${DOMAIN_NAME}" == "needforfit-app.withkris.life" ]]; then
    read -rp "Domain name for SSL & DNS [${DOMAIN_NAME:-needforfit-app.withkris.life}]: " DOMAIN_INPUT
    DOMAIN_NAME="${DOMAIN_INPUT:-${DOMAIN_NAME:-needforfit-app.withkris.life}}"
    export DOMAIN_NAME
    append_setup_var "DOMAIN_NAME" "${DOMAIN_NAME}"
  fi
  echo "  Domain: ${DOMAIN_NAME}"
}

create_acm_validation_records() {
  local cert_arn="$1"
  local validation_json change_batch

  validation_json="$(mktemp)"
  change_batch="$(mktemp)"

  echo "==> Creating Route 53 DNS validation records for ACM..."
  sleep 5

  aws acm describe-certificate \
    --certificate-arn "${cert_arn}" \
    --query 'Certificate.DomainValidationOptions' \
    --output json > "${validation_json}"

  python3 - "${validation_json}" "${change_batch}" <<'PY'
import json
import sys

validation_path, batch_path = sys.argv[1], sys.argv[2]
records = json.load(open(validation_path))
changes, seen = [], set()
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
if not changes:
    sys.exit(0)
json.dump({"Comment": "ACM DNS validation", "Changes": changes}, open(batch_path, "w"))
PY

  if [[ -s "${change_batch}" ]] && grep -q '"Changes"' "${change_batch}"; then
    aws route53 change-resource-record-sets \
      --hosted-zone-id "${HOSTED_ZONE}" \
      --change-batch "file://${change_batch}" >/dev/null
    echo "✓ ACM validation CNAME records created in Route 53"
  else
    echo "⚠  No validation records returned yet — retry shortly"
  fi

  rm -f "${validation_json}" "${change_batch}"
}

wait_for_certificate() {
  local cert_arn="$1"
  local status attempt=0 max_attempts=40

  echo "==> Waiting for ACM certificate validation (up to ~20 minutes)..."
  while (( attempt < max_attempts )); do
    status="$(aws acm describe-certificate \
      --certificate-arn "${cert_arn}" \
      --query 'Certificate.Status' \
      --output text)"

    case "${status}" in
      ISSUED)
        echo "✓ Certificate issued"
        return 0
        ;;
      FAILED|REVOKED|VALIDATION_TIMED_OUT)
        echo "ERROR: Certificate validation failed with status: ${status}" >&2
        aws acm describe-certificate \
          --certificate-arn "${cert_arn}" \
          --query 'Certificate.DomainValidationOptions' \
          --output table >&2 || true
        exit 1
        ;;
      PENDING_VALIDATION)
        if (( attempt % 6 == 0 )); then
          echo "  Still pending validation... (${attempt}/${max_attempts})"
          create_acm_validation_records "${cert_arn}" || true
        fi
        sleep 30
        (( attempt++ )) || true
        ;;
      *)
        echo "  Certificate status: ${status}"
        sleep 15
        (( attempt++ )) || true
        ;;
    esac
  done

  echo "ERROR: Timed out waiting for certificate validation." >&2
  echo "       Verify ACM CNAME records exist in hosted zone ${HOSTED_ZONE}." >&2
  exit 1
}

# =============================================================================
# STEP 3.1 — ALB & Target Group
# =============================================================================
setup_alb() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " STEP 3.1 — ALB & Target Groups"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Ensure EC2 accepts HTTP from ALB
  authorize_sg_ingress "${EC2_SG_ID}" \
    --protocol tcp --port "${TG_PORT}" --source-group "${ALB_SG_ID}"
  echo "✓ EC2 SG allows port ${TG_PORT} from ALB"

  local existing_tg
  existing_tg="$(aws elbv2 describe-target-groups \
    --names "${TG_BACKEND_NAME}" \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text 2>/dev/null || true)"

  if [[ -n "${existing_tg}" && "${existing_tg}" != "None" ]]; then
    TG_BACKEND_ARN="${existing_tg}"
    echo "✓ Target group already exists: ${TG_BACKEND_ARN}"
  else
    TG_BACKEND_ARN="$(aws elbv2 create-target-group \
      --name "${TG_BACKEND_NAME}" \
      --protocol HTTP \
      --port "${TG_PORT}" \
      --vpc-id "${VPC_ID}" \
      --target-type instance \
      --health-check-protocol HTTP \
      --health-check-path /api/health \
      --health-check-interval-seconds 30 \
      --health-check-timeout-seconds 5 \
      --healthy-threshold-count 2 \
      --unhealthy-threshold-count 2 \
      --matcher HttpCode=200 \
      --tags Key=Project,Value="${APP_NAME}",Key=Environment,Value="${ENV_NAME}",Key=Phase,Value=3-alb \
      --query 'TargetGroups[0].TargetGroupArn' \
      --output text)"
    echo "✓ Created backend target group (HTTP:${TG_PORT}, health /api/health)"
  fi

  append_setup_var "TG_BACKEND_ARN" "${TG_BACKEND_ARN}"
  append_setup_var "BACKEND_TARGET_GROUP_ARN" "${TG_BACKEND_ARN}"

  # Register EC2 instance (private IP: ${EC2_PRIVATE_IP})
  aws elbv2 register-targets \
    --target-group-arn "${TG_BACKEND_ARN}" \
    --targets "Id=${INSTANCE}" 2>/dev/null || true
  echo "✓ Registered instance ${INSTANCE} (${EC2_PRIVATE_IP})"

  local existing_alb
  existing_alb="$(aws elbv2 describe-load-balancers \
    --names "${ALB_NAME}" \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text 2>/dev/null || true)"

  if [[ -n "${existing_alb}" && "${existing_alb}" != "None" ]]; then
    ALB_ARN="${existing_alb}"
    echo "✓ ALB already exists: ${ALB_ARN}"
  else
    ALB_ARN="$(aws elbv2 create-load-balancer \
      --name "${ALB_NAME}" \
      --type application \
      --scheme internet-facing \
      --ip-address-type ipv4 \
      --subnets "${SUBNET_A}" "${SUBNET_B}" \
      --security-groups "${ALB_SG_ID}" \
      --tags Key=Project,Value="${APP_NAME}",Key=Environment,Value="${ENV_NAME}",Key=Phase,Value=3-alb \
      --query 'LoadBalancers[0].LoadBalancerArn' \
      --output text)"
    echo "✓ Created internet-facing ALB: ${ALB_NAME}"
    echo "  Waiting for ALB to become active..."
    aws elbv2 wait load-balancer-available --load-balancer-arns "${ALB_ARN}"
  fi

  ALB_DNS="$(aws elbv2 describe-load-balancers \
    --load-balancer-arns "${ALB_ARN}" \
    --query 'LoadBalancers[0].DNSName' \
    --output text)"
  ALB_HZ="$(aws elbv2 describe-load-balancers \
    --load-balancer-arns "${ALB_ARN}" \
    --query 'LoadBalancers[0].CanonicalHostedZoneId' \
    --output text)"

  append_setup_var "ALB_ARN" "${ALB_ARN}"
  append_setup_var "ALB_DNS" "${ALB_DNS}"
  append_setup_var "ALB_DNS_NAME" "${ALB_DNS}"
  append_setup_var "ALB_HZ" "${ALB_HZ}"
  append_setup_var "ALB_HOSTED_ZONE_ID" "${ALB_HZ}"

  echo "✓ ALB_DNS=${ALB_DNS}"
  echo "✓ ALB_HZ=${ALB_HZ}"
}

# =============================================================================
# STEP 3.2 — Listeners & SSL
# =============================================================================
setup_listeners() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " STEP 3.2 — Listeners & SSL (${DOMAIN_NAME})"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  local wildcard="${DOMAIN_NAME}"
  local existing_cert

  existing_cert="$(aws acm list-certificates \
    --certificate-statuses ISSUED PENDING_VALIDATION \
    --query "CertificateSummaryList[?DomainName=='${DOMAIN_NAME}'].CertificateArn | [0]" \
    --output text 2>/dev/null || true)"

  if [[ -n "${existing_cert}" && "${existing_cert}" != "None" ]]; then
    CERT_ARN="${existing_cert}"
    echo "✓ ACM certificate found: ${CERT_ARN}"
  else
    CERT_ARN="$(aws acm request-certificate \
      --domain-name "${DOMAIN_NAME}" \
      --subject-alternative-names "*.${DOMAIN_NAME}" \
      --validation-method DNS \
      --tags Key=Project,Value="${APP_NAME}",Key=Environment,Value="${ENV_NAME}" \
      --query CertificateArn \
      --output text)"
    echo "✓ Requested ACM certificate for ${DOMAIN_NAME} and *.${DOMAIN_NAME}"
    create_acm_validation_records "${CERT_ARN}"
  fi

  cert_status="$(aws acm describe-certificate \
    --certificate-arn "${CERT_ARN}" \
    --query 'Certificate.Status' \
    --output text)"

  if [[ "${cert_status}" != "ISSUED" ]]; then
    wait_for_certificate "${CERT_ARN}"
  else
    echo "✓ Certificate already issued"
  fi

  append_setup_var "CERT_ARN" "${CERT_ARN}"
  append_setup_var "ACM_CERTIFICATE_ARN" "${CERT_ARN}"

  # HTTP → HTTPS redirect
  local http_listener
  http_listener="$(aws elbv2 describe-listeners \
    --load-balancer-arn "${ALB_ARN}" \
    --query "Listeners[?Port==\`80\`].ListenerArn | [0]" \
    --output text 2>/dev/null || true)"

  if [[ -n "${http_listener}" && "${http_listener}" != "None" ]]; then
    HTTP_LISTENER_ARN="${http_listener}"
    echo "✓ HTTP listener already exists"
  else
    HTTP_LISTENER_ARN="$(aws elbv2 create-listener \
      --load-balancer-arn "${ALB_ARN}" \
      --protocol HTTP \
      --port 80 \
      --default-actions '[{"Type":"redirect","RedirectConfig":{"Protocol":"HTTPS","Port":"443","StatusCode":"HTTP_301"}}]' \
      --query 'Listeners[0].ListenerArn' \
      --output text)"
    echo "✓ Created HTTP listener (301 redirect → HTTPS)"
  fi
  append_setup_var "HTTP_LISTENER_ARN" "${HTTP_LISTENER_ARN}"

  # HTTPS listener — default forward to TG (static + SPA via Nginx)
  local https_listener
  https_listener="$(aws elbv2 describe-listeners \
    --load-balancer-arn "${ALB_ARN}" \
    --query "Listeners[?Port==\`443\`].ListenerArn | [0]" \
    --output text 2>/dev/null || true)"

  if [[ -n "${https_listener}" && "${https_listener}" != "None" ]]; then
    HTTPS_LISTENER_ARN="${https_listener}"
    echo "✓ HTTPS listener already exists"
  else
    HTTPS_LISTENER_ARN="$(aws elbv2 create-listener \
      --load-balancer-arn "${ALB_ARN}" \
      --protocol HTTPS \
      --port 443 \
      --certificates "CertificateArn=${CERT_ARN}" \
      --ssl-policy ELBSecurityPolicy-TLS13-1-2-2021-06 \
      --default-actions "Type=forward,TargetGroupArn=${TG_BACKEND_ARN}" \
      --query 'Listeners[0].ListenerArn' \
      --output text)"
    echo "✓ Created HTTPS listener (default /* → target group)"
  fi
  append_setup_var "HTTPS_LISTENER_ARN" "${HTTPS_LISTENER_ARN}"

  # Rule: /api/* → same target group (explicit path-based routing)
  local existing_rule
  existing_rule="$(aws elbv2 describe-rules \
    --listener-arn "${HTTPS_LISTENER_ARN}" \
    --query "Rules[?Priority!='default'] | [?contains(to_string(Conditions), '/api/')].RuleArn | [0]" \
    --output text 2>/dev/null || true)"

  if [[ -n "${existing_rule}" && "${existing_rule}" != "None" ]]; then
    echo "✓ Routing rule /api/* already exists"
  else
    aws elbv2 create-rule \
      --listener-arn "${HTTPS_LISTENER_ARN}" \
      --priority 100 \
      --conditions "Field=path-pattern,Values=/api/*" \
      --actions "Type=forward,TargetGroupArn=${TG_BACKEND_ARN}"
    echo "✓ Created rule: /api/* → backend target group"
  fi

  echo "✓ /* and /api/* → Nginx on EC2 (port ${TG_PORT})"
}

# =============================================================================
# STEP 3.3 — Route 53 DNS
# =============================================================================
setup_dns() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " STEP 3.3 — Route 53 DNS → ALB"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  local change_file
  change_file="$(mktemp)"

  cat > "${change_file}" <<EOF
{
  "Comment": "Needforfit A alias to ALB",
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "${DOMAIN_NAME}",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "${ALB_HZ}",
          "DNSName": "dualstack.${ALB_DNS}",
          "EvaluateTargetHealth": true
        }
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "www.${DOMAIN_NAME}",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "${ALB_HZ}",
          "DNSName": "dualstack.${ALB_DNS}",
          "EvaluateTargetHealth": true
        }
      }
    }
  ]
}
EOF

  local change_id
  change_id="$(aws route53 change-resource-record-sets \
    --hosted-zone-id "${HOSTED_ZONE}" \
    --change-batch "file://${change_file}" \
    --query 'ChangeInfo.Id' \
    --output text)"
  rm -f "${change_file}"

  append_setup_var "ROUTE53_A_RECORD_NAME" "${DOMAIN_NAME}"
  append_setup_var "ROUTE53_WWW_RECORD_NAME" "www.${DOMAIN_NAME}"

  echo "✓ A record alias ${DOMAIN_NAME} → ${ALB_DNS}"
  echo "✓ A record alias www.${DOMAIN_NAME} → ${ALB_DNS}"
  echo "  Route 53 change ID: ${change_id}"
}

# =============================================================================
# Summary
# =============================================================================
print_summary() {
  needforfit_sync_var_aliases

  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║              Phase 3 Complete — Summary                       ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  echo "Load Balancer"
  echo "  ALB_ARN         = ${ALB_ARN}"
  echo "  ALB_DNS         = ${ALB_DNS}"
  echo "  ALB_HZ          = ${ALB_HZ}"
  echo "  TG_BACKEND_ARN  = ${TG_BACKEND_ARN}"
  echo "  CERT_ARN        = ${CERT_ARN}"
  echo ""
  echo "Endpoints (after DNS propagation)"
  echo "  App (HTTPS)     https://${DOMAIN_NAME}/"
  echo "  API             https://${DOMAIN_NAME}/api/health"
  echo "  WWW             https://www.${DOMAIN_NAME}/"
  echo "  ALB direct      https://${ALB_DNS}/"
  echo ""
  echo "Target: EC2 ${INSTANCE} @ ${EC2_PRIVATE_IP}:${TG_PORT}"
  echo ""
  echo "NOTE: Configure Nginx on EC2 to:"
  echo "  - Serve static files for /*"
  echo "  - Proxy /api/* to backend (localhost:5000)"
  echo "  - Expose GET /api/health for ALB health checks"
  echo ""
  echo "Variables saved to: ${SCRIPT_DIR}/setup-vars.sh"
}

# =============================================================================
# Main
# =============================================================================
main() {
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║     Needforfit Phase 3 — ALB + SSL + DNS                         ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""

  require_aws
  require_phase_prereqs

  echo "==> Configuration"
  prompt_domain
  echo ""

  setup_alb
  setup_listeners
  setup_dns
  print_summary
}

main "$@"
