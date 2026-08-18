#!/usr/bin/env bash
# Shared helpers for Needforfit AWS deployment scripts.

SETUP_VARS_MARKERS_START="# NEEDFORFIT_DEPLOY_VARS_START"
SETUP_VARS_MARKERS_END="# NEEDFORFIT_DEPLOY_VARS_END"

# Map primary key → alias keys (all persisted together)
_var_alias_for() {
  case "$1" in
    PUBLIC_SUBNET_1_ID|SUBNET_1A) echo "SUBNET_1A PUBLIC_SUBNET_1_ID" ;;
    PUBLIC_SUBNET_2_ID|SUBNET_1B) echo "SUBNET_1B PUBLIC_SUBNET_2_ID" ;;
    ALB_SECURITY_GROUP_ID|ALB_SG) echo "ALB_SG ALB_SECURITY_GROUP_ID" ;;
    EC2_SECURITY_GROUP_ID|EC2_SG) echo "EC2_SG EC2_SECURITY_GROUP_ID" ;;
    EC2_INSTANCE_ID|INSTANCE_ID) echo "INSTANCE_ID EC2_INSTANCE_ID" ;;
    ALB_DNS_NAME|ALB_DNS) echo "ALB_DNS ALB_DNS_NAME" ;;
    ALB_HOSTED_ZONE_ID|ALB_HZ) echo "ALB_HZ ALB_HOSTED_ZONE_ID" ;;
    ACM_CERTIFICATE_ARN|CERT_ARN) echo "CERT_ARN ACM_CERTIFICATE_ARN" ;;
    BACKEND_TARGET_GROUP_ARN|TG_BACKEND_ARN) echo "TG_BACKEND_ARN BACKEND_TARGET_GROUP_ARN" ;;
    ROUTE_TABLE_ID|PUBLIC_ROUTE_TABLE_ID) echo "ROUTE_TABLE_ID PUBLIC_ROUTE_TABLE_ID" ;;
    HOSTED_ZONE_ID|ROUTE53_HOSTED_ZONE_ID) echo "HOSTED_ZONE_ID ROUTE53_HOSTED_ZONE_ID" ;;
    S3_BACKUP_BUCKET|S3_LOGS_BUCKET) echo "S3_BACKUP_BUCKET S3_LOGS_BUCKET" ;;
    *) echo "$1" ;;
  esac
}

# Append or update exports inside setup-vars.sh (between markers)
append_setup_var() {
  local key="$1"
  local value="$2"
  local file
  local keys k line skip
  local out

  file="${SCRIPT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}/setup-vars.sh"

  if [[ ! -f "${file}" ]]; then
    echo "ERROR: ${file} not found." >&2
    return 1
  fi

  keys="$(_var_alias_for "${key}")"
  out="$(mktemp)"

  while IFS= read -r line || [[ -n "${line}" ]]; do
    if [[ "${line}" == "${SETUP_VARS_MARKERS_END}" ]]; then
      for k in ${keys}; do
        echo "export ${k}=\"${value}\"" >> "${out}"
      done
    fi

    skip=false
    for k in ${keys}; do
      [[ "${line}" == export\ ${k}=* ]] && skip=true
    done
    [[ "${skip}" == false ]] && echo "${line}" >> "${out}"
  done < "${file}"

  mv "${out}" "${file}"
  sync_setup_aliases
}

require_aws() {
  if ! command -v aws >/dev/null 2>&1; then
    echo "ERROR: AWS CLI is required." >&2
    exit 1
  fi
  aws sts get-caller-identity >/dev/null
}

get_account_id() {
  aws sts get-caller-identity --query Account --output text
}

tag_spec() {
  local phase="$1"
  echo "{Key=Project,Value=${APP_NAME:-${PROJECT_NAME}}},{Key=Environment,Value=${ENV_NAME}},{Key=Phase,Value=${phase}},{Key=ManagedBy,Value=needforfit-aws-scripts}"
}

authorize_sg_ingress() {
  local group_id="$1"
  shift
  aws ec2 authorize-security-group-ingress --group-id "${group_id}" "$@" 2>/dev/null || true
}

sync_setup_aliases() {
  if declare -F needforfit_sync_var_aliases >/dev/null 2>&1; then
    needforfit_sync_var_aliases
  fi
}
