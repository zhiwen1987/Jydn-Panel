#!/usr/bin/env bash
set -euo pipefail

APP_NAME="ange-panel"
REPO="liandu2024/AnGe-Panel"
INSTALL_DIR="/opt/${APP_NAME}"
BIN_NAME="${APP_NAME}"
PORT=""
VERSION=""  # v0.1.7 etc; empty => latest
CHANNEL="release"  # reserved

usage() {
  cat <<'USAGE'
AnGe-Panel one-line installer (systemd)

Usage:
  curl -fsSL https://raw.githubusercontent.com/liandu2024/AnGe-Panel/main/scripts/install.sh | sudo bash -s -- [options]

Options:
  --version vX.Y.Z   Install specific version (default: latest release)
  --port 3003        Set http port in conf/conf.ini (default: keep package default)
  --dir /opt/ange-panel  Install directory (default: /opt/ange-panel)
  --help             Show this help

Notes:
- This script installs to /opt and creates a systemd service: ange-panel.service
- If you re-run it, it will overwrite files in the install dir.
USAGE
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || { echo "Missing dependency: $1" >&2; exit 1; }
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --version)
        VERSION="$2"; shift 2 ;;
      --port)
        PORT="$2"; shift 2 ;;
      --dir)
        INSTALL_DIR="$2"; shift 2 ;;
      --help|-h)
        usage; exit 0 ;;
      *)
        echo "Unknown arg: $1" >&2
        usage
        exit 1
        ;;
    esac
  done
}

arch_to_go() {
  local m
  m="$(uname -m)"
  case "$m" in
    x86_64|amd64) echo "amd64" ;;
    aarch64|arm64) echo "arm64" ;;
    *)
      echo "Unsupported architecture: $m" >&2
      exit 1
      ;;
  esac
}

fetch_latest_version() {
  # Prefer GitHub API. Fallback: follow /releases/latest redirect.
  if command -v curl >/dev/null 2>&1; then
    # API (no auth):
    local tag
    tag="$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" | sed -n 's/.*"tag_name"[[:space:]]*:[[:space:]]*"\([^"]\+\)".*/\1/p' | head -n1)" || true
    if [[ -n "${tag:-}" ]]; then
      echo "$tag"
      return
    fi
  fi

  # Redirect method
  local url
  url="$(curl -fsSLI "https://github.com/${REPO}/releases/latest" | tr -d '\r' | awk -F': ' 'tolower($1)=="location"{print $2}' | tail -n1)" || true
  if [[ "$url" =~ /tag/([^[:space:]]+) ]]; then
    echo "${BASH_REMATCH[1]}"
    return
  fi

  echo "Failed to detect latest version" >&2
  exit 1
}

main() {
  parse_args "$@"
  need_cmd curl
  need_cmd tar
  need_cmd systemctl

  local arch
  arch="$(arch_to_go)"

  if [[ -z "${VERSION}" ]]; then
    VERSION="$(fetch_latest_version)"
  fi

  if [[ ! "${VERSION}" =~ ^v ]]; then
    VERSION="v${VERSION}"
  fi

  local ver_no_v
  ver_no_v="${VERSION#v}"

  local asset
  asset="${APP_NAME}_${ver_no_v}_linux_${arch}.tar.gz"
  local dl
  dl="https://github.com/${REPO}/releases/download/${VERSION}/${asset}"

  echo "Installing ${APP_NAME} ${VERSION} (${arch})"
  echo "Download: ${dl}"
  echo "Install dir: ${INSTALL_DIR}"

  local tmp
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT

  curl -fL "${dl}" -o "${tmp}/${asset}"

  mkdir -p "${INSTALL_DIR}"
  tar -xzf "${tmp}/${asset}" -C "${tmp}"

  local extracted
  extracted="${tmp}/${APP_NAME}_${ver_no_v}_linux_${arch}"
  if [[ ! -d "${extracted}" ]]; then
    # Some packagers don't include a top folder; fallback to first dir.
    extracted="$(find "${tmp}" -maxdepth 1 -type d -name "${APP_NAME}_*" | head -n1 || true)"
  fi
  if [[ -z "${extracted}" || ! -d "${extracted}" ]]; then
    echo "Could not find extracted directory" >&2
    exit 1
  fi

  # Copy files
  cp -f "${extracted}/${BIN_NAME}" "${INSTALL_DIR}/${BIN_NAME}"
  chmod +x "${INSTALL_DIR}/${BIN_NAME}"

  rm -rf "${INSTALL_DIR}/conf" "${INSTALL_DIR}/web" || true
  cp -R "${extracted}/conf" "${INSTALL_DIR}/conf"
  cp -R "${extracted}/web" "${INSTALL_DIR}/web"

  mkdir -p "${INSTALL_DIR}/uploads" "${INSTALL_DIR}/runtime/temp" "${INSTALL_DIR}/database"

  if [[ -n "${PORT}" ]]; then
    if [[ -f "${INSTALL_DIR}/conf/conf.ini" ]]; then
      sed -i "s/^http_port=.*/http_port=${PORT}/" "${INSTALL_DIR}/conf/conf.ini" || true
    fi
  fi

  # systemd service
  cat > "/etc/systemd/system/${APP_NAME}.service" <<SERVICE
[Unit]
Description=AnGe-Panel
After=network.target

[Service]
Type=simple
WorkingDirectory=${INSTALL_DIR}
ExecStart=${INSTALL_DIR}/${BIN_NAME}
Restart=on-failure
RestartSec=2

[Install]
WantedBy=multi-user.target
SERVICE

  systemctl daemon-reload
  systemctl enable --now "${APP_NAME}.service"

  echo
  echo "Done. Check status: systemctl status ${APP_NAME} --no-pager"
  if [[ -n "${PORT}" ]]; then
    echo "Open: http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo "<host>"):${PORT}/"
  else
    echo "Open: http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo "<host>"):3002/ (default)"
  fi
}

main "$@"
