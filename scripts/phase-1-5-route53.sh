#!/usr/bin/env bash
# =============================================================================
# Phase 1.5 — Route 53 DNS
# =============================================================================
# Creates a public hosted zone for DOMAIN_NAME and exports nameservers.
#
# Usage:
#   ./scripts/phase-1-5-route53.sh
#
# After running:
#   1. Copy nameservers to your domain registrar for ${DOMAIN_NAME}
#   2. Wait for DNS propagation before ACM/ALB setup
#
# Cleanup:
#   # Delete all records first, then:
#   aws route53 delete-hosted-zone --id $ROUTE53_HOSTED_ZONE_ID
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=setup-vars.sh
source "${SCRIPT_DIR}/setup-vars.sh"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

require_aws

echo "==> Phase 1.5: Route 53 DNS (${DOMAIN_NAME})"

# Reuse existing hosted zone if domain already exists in account
EXISTING_ZONE_ID="$(aws route53 list-hosted-zones-by-name \
  --dns-name "${DOMAIN_NAME}." \
  --query "HostedZones[?Name=='${DOMAIN_NAME}.'].Id | [0]" \
  --output text 2>/dev/null || true)"

if [[ -n "${EXISTING_ZONE_ID}" && "${EXISTING_ZONE_ID}" != "None" ]]; then
  ROUTE53_HOSTED_ZONE_ID="${EXISTING_ZONE_ID#/hostedzone/}"
  echo "✓ Hosted zone already exists: ${ROUTE53_HOSTED_ZONE_ID}"
else
  ROUTE53_HOSTED_ZONE_ID="$(aws route53 create-hosted-zone \
    --name "${DOMAIN_NAME}" \
    --caller-reference "needforfit-$(date +%s)" \
    --hosted-zone-config Comment="Needforfit ${ENV_NAME} hosted zone",PrivateZone=false \
    --query HostedZone.Id \
    --output text)"
  ROUTE53_HOSTED_ZONE_ID="${ROUTE53_HOSTED_ZONE_ID#/hostedzone/}"
  echo "✓ Created hosted zone: ${ROUTE53_HOSTED_ZONE_ID}"
fi

append_setup_var "ROUTE53_HOSTED_ZONE_ID" "${ROUTE53_HOSTED_ZONE_ID}"

NAME_SERVERS="$(aws route53 get-hosted-zone \
  --id "${ROUTE53_HOSTED_ZONE_ID}" \
  --query DelegationSet.NameServers \
  --output text)"

append_setup_var "ROUTE53_NAME_SERVERS" "${NAME_SERVERS}"

NS_FILE="${SCRIPT_DIR}/route53-nameservers.txt"
{
  echo "# Route 53 nameservers for ${DOMAIN_NAME}"
  echo "# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "# Add these NS records at your domain registrar:"
  echo ""
  for ns in ${NAME_SERVERS}; do
    echo "${ns}"
  done
} > "${NS_FILE}"

echo ""
echo "Phase 1.5 complete. Variables saved to setup-vars.sh"
echo "  ROUTE53_HOSTED_ZONE_ID=${ROUTE53_HOSTED_ZONE_ID}"
echo "  Nameservers written to: ${NS_FILE}"
echo ""
echo "Nameservers for ${DOMAIN_NAME}:"
for ns in ${NAME_SERVERS}; do
  echo "  ✓ ${ns}"
done
