#!/usr/bin/env bash
# =============================================================================
# Phase 3.3 — Route 53 A Record → ALB
# =============================================================================
# Creates alias A records for apex domain and www → ALB.
#
# Prerequisites: Phase 1.5 (hosted zone), Phase 3.1 (ALB DNS + hosted zone ID)
#
# Usage:
#   ./scripts/phase-3-3-route53.sh
#
# Cleanup:
#   Remove A/AAAA alias records for ${DOMAIN_NAME} and www.${DOMAIN_NAME}
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=setup-vars.sh
source "${SCRIPT_DIR}/setup-vars.sh"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

require_aws

for var in ROUTE53_HOSTED_ZONE_ID ALB_DNS_NAME ALB_HOSTED_ZONE_ID; do
  if [[ -z "${!var:-}" ]]; then
    echo "ERROR: ${var} not set. Run Phase 1.5 and Phase 3.1 first." >&2
    exit 1
  fi
done

CHANGE_BATCH_FILE="$(mktemp)"
cleanup() { rm -f "${CHANGE_BATCH_FILE}"; }
trap cleanup EXIT

echo "==> Phase 3.3: Route 53 → ALB (${DOMAIN_NAME})"

cat > "${CHANGE_BATCH_FILE}" <<EOF
{
  "Comment": "Needforfit alias records to ALB",
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "${DOMAIN_NAME}",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "${ALB_HOSTED_ZONE_ID}",
          "DNSName": "dualstack.${ALB_DNS_NAME}",
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
          "HostedZoneId": "${ALB_HOSTED_ZONE_ID}",
          "DNSName": "dualstack.${ALB_DNS_NAME}",
          "EvaluateTargetHealth": true
        }
      }
    }
  ]
}
EOF

CHANGE_ID="$(aws route53 change-resource-record-sets \
  --hosted-zone-id "${ROUTE53_HOSTED_ZONE_ID}" \
  --change-batch "file://${CHANGE_BATCH_FILE}" \
  --query 'ChangeInfo.Id' \
  --output text)"

echo "✓ Created/updated A records for ${DOMAIN_NAME} and www.${DOMAIN_NAME}"
echo "  Change ID: ${CHANGE_ID}"

append_setup_var "ROUTE53_A_RECORD_NAME" "${DOMAIN_NAME}"
append_setup_var "ROUTE53_WWW_RECORD_NAME" "www.${DOMAIN_NAME}"

echo ""
echo "Phase 3.3 complete. Variables saved to setup-vars.sh"
echo "  https://${DOMAIN_NAME}/       → ALB (static)"
echo "  https://${DOMAIN_NAME}/api/*  → ALB (backend)"
echo "  https://www.${DOMAIN_NAME}/   → ALB (static)"
echo ""
echo "DNS propagation may take a few minutes."
