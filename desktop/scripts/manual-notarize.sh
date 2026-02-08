#!/usr/bin/env bash
#
# manual-notarize.sh - Manual notarization for MetricFrame desktop app
#
# Usage:
#   ./scripts/manual-notarize.sh submit    # Submit .app for notarization
#   ./scripts/manual-notarize.sh status    # Check submission status
#   ./scripts/manual-notarize.sh wait      # Poll until accepted/rejected
#   ./scripts/manual-notarize.sh staple    # Staple ticket to .app
#   ./scripts/manual-notarize.sh dmg       # Rebuild DMG from stapled .app
#   ./scripts/manual-notarize.sh history   # Show notarization history
#   ./scripts/manual-notarize.sh all       # Full pipeline
#
# Required env vars: APPLE_ID, APPLE_ID_PASSWORD, APPLE_TEAM_ID
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DESKTOP_DIR="$(dirname "$SCRIPT_DIR")"
RELEASE_DIR="$DESKTOP_DIR/release"
APP_PATH="$RELEASE_DIR/mac/MetricFrame.app"
ZIP_PATH="/tmp/MetricFrame-notarize.zip"
SUBMISSION_ID_FILE="/tmp/metricframe-notarize-id.txt"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[notarize]${NC} $*"; }
warn() { echo -e "${YELLOW}[notarize]${NC} $*"; }
err()  { echo -e "${RED}[notarize]${NC} $*" >&2; }

check_credentials() {
  if [[ -z "${APPLE_ID:-}" || -z "${APPLE_ID_PASSWORD:-}" || -z "${APPLE_TEAM_ID:-}" ]]; then
    err "Missing required environment variables."
    err "Set: APPLE_ID, APPLE_ID_PASSWORD, APPLE_TEAM_ID"
    exit 1
  fi
}

check_app_exists() {
  if [[ ! -d "$APP_PATH" ]]; then
    err "App not found at: $APP_PATH"
    err "Run the signed build first."
    exit 1
  fi
}

cmd_submit() {
  check_credentials
  check_app_exists

  log "Verifying code signature..."
  codesign --verify --verbose=2 "$APP_PATH" 2>&1 || {
    err "Code signature verification failed!"
    exit 1
  }

  log "Creating zip for submission..."
  rm -f "$ZIP_PATH"
  pushd "$(dirname "$APP_PATH")" > /dev/null
  ditto -c -k --sequesterRsrc --keepParent "MetricFrame.app" "$ZIP_PATH"
  popd > /dev/null

  local zip_size
  zip_size=$(du -sh "$ZIP_PATH" | cut -f1)
  log "Zip created: $ZIP_PATH ($zip_size)"

  log "Submitting to Apple notarization service..."
  local result
  result=$(xcrun notarytool submit "$ZIP_PATH" \
    --apple-id "$APPLE_ID" \
    --password "$APPLE_ID_PASSWORD" \
    --team-id "$APPLE_TEAM_ID" \
    --output-format json 2>&1)

  local sub_id
  sub_id=$(echo "$result" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null || echo "")

  if [[ -z "$sub_id" ]]; then
    err "Failed to submit. Response:"
    echo "$result"
    exit 1
  fi

  echo "$sub_id" > "$SUBMISSION_ID_FILE"
  log "Submitted! ID: $sub_id"
  log "Saved ID to: $SUBMISSION_ID_FILE"

  rm -f "$ZIP_PATH"
  log "Cleaned up zip."
  log ""
  log "Next: $0 wait  (or $0 status to check)"
}

cmd_status() {
  check_credentials

  local sub_id="${1:-}"
  if [[ -z "$sub_id" && -f "$SUBMISSION_ID_FILE" ]]; then
    sub_id=$(cat "$SUBMISSION_ID_FILE")
  fi

  if [[ -z "$sub_id" ]]; then
    warn "No submission ID. Showing history..."
    cmd_history
    return
  fi

  log "Checking submission: $sub_id"
  xcrun notarytool info "$sub_id" \
    --apple-id "$APPLE_ID" \
    --password "$APPLE_ID_PASSWORD" \
    --team-id "$APPLE_TEAM_ID"
}

cmd_wait() {
  check_credentials

  local sub_id="${1:-}"
  if [[ -z "$sub_id" && -f "$SUBMISSION_ID_FILE" ]]; then
    sub_id=$(cat "$SUBMISSION_ID_FILE")
  fi

  if [[ -z "$sub_id" ]]; then
    err "No submission ID. Run '$0 submit' first."
    exit 1
  fi

  log "Waiting for submission: $sub_id"
  log "(Polling every 30s, max 60 minutes)"

  local max_attempts=120
  local attempt=0

  while (( attempt < max_attempts )); do
    ((attempt++))
    local elapsed=$((attempt * 30))
    local status
    status=$(xcrun notarytool info "$sub_id" \
      --apple-id "$APPLE_ID" \
      --password "$APPLE_ID_PASSWORD" \
      --team-id "$APPLE_TEAM_ID" \
      --output-format json 2>/dev/null \
      | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','unknown'))" 2>/dev/null || echo "unknown")

    if [[ "$status" == "Accepted" ]]; then
      echo ""
      log "ACCEPTED! (${elapsed}s)"
      return 0
    elif [[ "$status" == "Invalid" || "$status" == "Rejected" ]]; then
      echo ""
      err "Notarization $status after ${elapsed}s"
      log "Fetching log..."
      xcrun notarytool log "$sub_id" \
        --apple-id "$APPLE_ID" \
        --password "$APPLE_ID_PASSWORD" \
        --team-id "$APPLE_TEAM_ID" 2>&1 || true
      exit 1
    fi

    printf "\r[notarize] Waiting... %ds (status: %s, attempt %d/%d)" "$elapsed" "$status" "$attempt" "$max_attempts"
    sleep 30
  done

  echo ""
  err "Timed out after $((max_attempts * 30))s. Try again later with: $0 wait $sub_id"
  exit 1
}

cmd_staple() {
  check_app_exists

  log "Stapling ticket to: $APP_PATH"
  xcrun stapler staple "$APP_PATH"

  log "Verifying staple..."
  xcrun stapler validate "$APP_PATH" || {
    err "Staple validation failed!"
    exit 1
  }

  log "Staple complete!"
}

cmd_dmg() {
  check_app_exists

  local dmg_path="$RELEASE_DIR/MetricFrame-1.0.0-mac-x64.dmg"

  if [[ -f "$dmg_path" ]]; then
    log "Backing up existing DMG..."
    mv "$dmg_path" "${dmg_path}.bak"
  fi

  log "Creating DMG from .app..."
  hdiutil create -volname "MetricFrame" \
    -srcfolder "$APP_PATH" \
    -ov -format UDZO \
    "$dmg_path"

  log "DMG created: $dmg_path"
  log "Size: $(du -sh "$dmg_path" | cut -f1)"
}

cmd_history() {
  check_credentials

  log "Recent submissions:"
  xcrun notarytool history \
    --apple-id "$APPLE_ID" \
    --password "$APPLE_ID_PASSWORD" \
    --team-id "$APPLE_TEAM_ID" 2>&1
}

cmd_all() {
  log "=== Full notarization pipeline ==="
  echo ""
  cmd_submit
  echo ""
  cmd_wait
  echo ""
  cmd_staple
  echo ""
  cmd_dmg
  echo ""
  log "=== DONE — Notarized DMG ready! ==="
}

case "${1:-help}" in
  submit)  cmd_submit ;;
  status)  cmd_status "${2:-}" ;;
  wait)    cmd_wait "${2:-}" ;;
  staple)  cmd_staple ;;
  dmg)     cmd_dmg ;;
  history) cmd_history ;;
  all)     cmd_all ;;
  *)
    echo "Usage: $0 {submit|status|wait|staple|dmg|history|all}"
    echo ""
    echo "  submit   Submit .app for notarization"
    echo "  status   Check submission status"
    echo "  wait     Poll until accepted/rejected (60 min)"
    echo "  staple   Staple ticket to .app"
    echo "  dmg      Rebuild DMG from stapled .app"
    echo "  history  Show notarization history"
    echo "  all      Full pipeline: submit -> wait -> staple -> dmg"
    ;;
esac
