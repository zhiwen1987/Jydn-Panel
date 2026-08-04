#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="jydn-panel"
REPO="${JYDN_REPO:-zhiwen1987/Jydn-Panel}"
INSTALL_DIR="${JYDN_INSTALL_DIR:-/opt/jydn-panel}"
SERVICE_NAME="${JYDN_SERVICE_NAME:-jydn-panel}"
PORT="${JYDN_PORT:-8008}"
ENABLE_DOCKER="${JYDN_ENABLE_DOCKER:-auto}"
VERSION="${JYDN_VERSION:-latest}"
LOCAL_SOURCE=""
PACKAGE_FILE=""
PORT_EXPLICIT=0
[[ -z "${JYDN_PORT+x}" ]] || PORT_EXPLICIT=1

usage() {
  cat <<'EOF'
Jydn-Panel native Linux installer (systemd, no Docker required)

Usage:
  sudo bash install.sh --local /path/to/Jydn-Panel
  sudo bash install.sh --package /path/to/jydn-panel_VERSION_linux_ARCH.tar.gz
  sudo -E bash install.sh [--version v1.00]

Options:
  --local DIR          Install the binary and dist/ from a local project directory.
  --package FILE       Install from a local release archive.
  --version TAG        GitHub release tag; default: latest.
  --install-dir DIR    Install directory; default: /opt/jydn-panel.
  --service-name NAME  systemd service name; default: jydn-panel.
  --port PORT          HTTP port for a fresh config; default: 8008.
  --docker MODE        auto, yes, or no; default: auto.
  -h, --help           Show this help.

Private GitHub repositories:
  Export GITHUB_TOKEN before running with sudo -E, or set
  JYDN_GITHUB_TOKEN_FILE to a root-readable token file.

Existing conf/conf.ini, database/, uploads/, and runtime/ are always preserved.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --local) LOCAL_SOURCE="${2:-}"; shift 2 ;;
    --package) PACKAGE_FILE="${2:-}"; shift 2 ;;
    --version) VERSION="${2:-}"; shift 2 ;;
    --install-dir) INSTALL_DIR="${2:-}"; shift 2 ;;
    --service-name) SERVICE_NAME="${2:-}"; shift 2 ;;
    --port) PORT="${2:-}"; PORT_EXPLICIT=1; shift 2 ;;
    --docker) ENABLE_DOCKER="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

[[ "$INSTALL_DIR" == /opt/* || "$INSTALL_DIR" == /usr/local/* ]] || {
  echo "Install directory must be below /opt or /usr/local: $INSTALL_DIR" >&2
  exit 2
}
[[ "$SERVICE_NAME" =~ ^[a-zA-Z0-9_.@-]+$ ]] || { echo "Invalid service name" >&2; exit 2; }
[[ "$PORT" =~ ^[0-9]+$ ]] && (( PORT >= 1 && PORT <= 65535 )) || { echo "Invalid port: $PORT" >&2; exit 2; }
[[ -z "$LOCAL_SOURCE" || -z "$PACKAGE_FILE" ]] || { echo "Use only one of --local or --package" >&2; exit 2; }

if [[ $EUID -eq 0 ]]; then
  SUDO=()
else
  command -v sudo >/dev/null 2>&1 || { echo "sudo is required" >&2; exit 1; }
  SUDO=(sudo)
fi

for command_name in systemctl install cp mv mkdir; do
  command -v "$command_name" >/dev/null 2>&1 || { echo "Missing command: $command_name" >&2; exit 1; }
done

ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|amd64) ASSET_ARCH="amd64" ;;
  aarch64|arm64) ASSET_ARCH="arm64" ;;
  *) echo "Unsupported architecture: $ARCH" >&2; exit 1 ;;
esac

TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIR"' EXIT
PAYLOAD_ROOT=""

if [[ -n "$LOCAL_SOURCE" ]]; then
  PAYLOAD_ROOT="$(readlink -f "$LOCAL_SOURCE")"
elif [[ -n "$PACKAGE_FILE" ]]; then
  command -v tar >/dev/null 2>&1 || { echo "tar is required" >&2; exit 1; }
  mkdir -p "$TEMP_DIR/payload"
  tar -xzf "$PACKAGE_FILE" -C "$TEMP_DIR/payload"
  PAYLOAD_ROOT="$TEMP_DIR/payload"
else
  command -v curl >/dev/null 2>&1 || { echo "curl is required" >&2; exit 1; }
  TOKEN="${GITHUB_TOKEN:-}"
  if [[ -z "$TOKEN" && -n "${JYDN_GITHUB_TOKEN_FILE:-}" ]]; then
    TOKEN="$(<"$JYDN_GITHUB_TOKEN_FILE")"
  fi
  CURL_HEADERS=(-H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28")
  [[ -z "$TOKEN" ]] || CURL_HEADERS+=(-H "Authorization: Bearer $TOKEN")
  if [[ "$VERSION" == "latest" ]]; then
    RELEASE_API="https://api.github.com/repos/$REPO/releases/latest"
  else
    RELEASE_API="https://api.github.com/repos/$REPO/releases/tags/$VERSION"
  fi
  echo "[1/7] Reading release metadata for $REPO..."
  RELEASE_JSON="$(curl -fsSL "${CURL_HEADERS[@]}" "$RELEASE_API")"
  TAG="$(printf '%s' "$RELEASE_JSON" | sed -n 's/.*"tag_name"[[:space:]]*:[[:space:]]*"\([^"]\+\)".*/\1/p' | head -n1)"
  [[ -n "$TAG" ]] || { echo "Unable to determine release tag" >&2; exit 1; }
  ASSET_NAME="${APP_NAME}_${TAG#v}_linux_${ASSET_ARCH}.tar.gz"
  DOWNLOAD_URL="$(printf '%s' "$RELEASE_JSON" | grep -F '"browser_download_url"' | grep -F "$ASSET_NAME" | head -n1 | sed -n 's/.*"browser_download_url"[[:space:]]*:[[:space:]]*"\([^"]\+\)".*/\1/p')"
  [[ -n "$DOWNLOAD_URL" ]] || { echo "Release asset not found: $ASSET_NAME" >&2; exit 1; }
  echo "[2/7] Downloading $ASSET_NAME..."
  curl -fsSL "${CURL_HEADERS[@]}" "$DOWNLOAD_URL" -o "$TEMP_DIR/$ASSET_NAME"
  mkdir -p "$TEMP_DIR/payload"
  tar -xzf "$TEMP_DIR/$ASSET_NAME" -C "$TEMP_DIR/payload"
  PAYLOAD_ROOT="$TEMP_DIR/payload"
  unset TOKEN RELEASE_JSON
fi

BINARY_PATH="$(find "$PAYLOAD_ROOT" -maxdepth 3 -type f -name "$APP_NAME" | head -n1)"
[[ -n "$BINARY_PATH" ]] || { echo "Package does not contain $APP_NAME" >&2; exit 1; }
SOURCE_ROOT="$(dirname "$BINARY_PATH")"
if [[ -f "$SOURCE_ROOT/dist/index.html" ]]; then
  WEB_SOURCE="$SOURCE_ROOT/dist"
elif [[ -f "$SOURCE_ROOT/web/index.html" ]]; then
  WEB_SOURCE="$SOURCE_ROOT/web"
else
  echo "Package does not contain web/index.html or dist/index.html" >&2
  exit 1
fi

SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
SERVICE_USER="$APP_NAME"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$INSTALL_DIR/backups/$STAMP"

echo "[3/7] Stopping existing service if present..."
if systemctl cat "$SERVICE_NAME.service" >/dev/null 2>&1; then
  "${SUDO[@]}" systemctl stop "$SERVICE_NAME.service"
fi

echo "[4/7] Installing application files..."
if ! id -u "$SERVICE_USER" >/dev/null 2>&1; then
  "${SUDO[@]}" useradd --system --home-dir "$INSTALL_DIR" --shell /usr/sbin/nologin "$SERVICE_USER"
fi
"${SUDO[@]}" mkdir -p "$INSTALL_DIR" "$INSTALL_DIR"/{conf,database,uploads,runtime,backups}
if [[ -f "$INSTALL_DIR/$APP_NAME" || -d "$INSTALL_DIR/web" ]]; then
  "${SUDO[@]}" mkdir -p "$BACKUP_DIR"
  [[ ! -f "$INSTALL_DIR/$APP_NAME" ]] || "${SUDO[@]}" cp -a "$INSTALL_DIR/$APP_NAME" "$BACKUP_DIR/"
  [[ ! -d "$INSTALL_DIR/web" ]] || "${SUDO[@]}" cp -a "$INSTALL_DIR/web" "$BACKUP_DIR/"
fi

"${SUDO[@]}" install -m 0755 "$BINARY_PATH" "$INSTALL_DIR/.$APP_NAME.new"
"${SUDO[@]}" mv "$INSTALL_DIR/.$APP_NAME.new" "$INSTALL_DIR/$APP_NAME"
"${SUDO[@]}" rm -rf "$INSTALL_DIR/.web.new"
"${SUDO[@]}" mkdir -p "$INSTALL_DIR/.web.new"
"${SUDO[@]}" cp -a "$WEB_SOURCE/." "$INSTALL_DIR/.web.new/"
"${SUDO[@]}" rm -rf "$INSTALL_DIR/web"
"${SUDO[@]}" mv "$INSTALL_DIR/.web.new" "$INSTALL_DIR/web"

for tree in seed lang assets; do
  if [[ -d "$SOURCE_ROOT/$tree" ]]; then
    "${SUDO[@]}" rm -rf "$INSTALL_DIR/.$tree.new"
    "${SUDO[@]}" cp -a "$SOURCE_ROOT/$tree" "$INSTALL_DIR/.$tree.new"
    "${SUDO[@]}" rm -rf "$INSTALL_DIR/$tree"
    "${SUDO[@]}" mv "$INSTALL_DIR/.$tree.new" "$INSTALL_DIR/$tree"
  fi
done

if [[ -f "$SOURCE_ROOT/conf/conf.example.ini" ]]; then
  "${SUDO[@]}" cp -a "$SOURCE_ROOT/conf/conf.example.ini" "$INSTALL_DIR/conf/conf.example.ini"
fi
FRESH_CONFIG=0
if [[ ! -f "$INSTALL_DIR/conf/conf.ini" ]]; then
  FRESH_CONFIG=1
  if [[ -f "$INSTALL_DIR/conf/conf.example.ini" ]]; then
    "${SUDO[@]}" cp "$INSTALL_DIR/conf/conf.example.ini" "$INSTALL_DIR/conf/conf.ini"
  fi
fi
if [[ -f "$INSTALL_DIR/conf/conf.ini" && ( $FRESH_CONFIG -eq 1 || $PORT_EXPLICIT -eq 1 ) ]]; then
  "${SUDO[@]}" sed -i -E "s/^[[:space:]]*http_port=.*/http_port=$PORT/" "$INSTALL_DIR/conf/conf.ini"
fi

DOCKER_ENABLED=0
case "$ENABLE_DOCKER" in
  yes|true|1) DOCKER_ENABLED=1 ;;
  no|false|0) DOCKER_ENABLED=0 ;;
  auto) command -v docker >/dev/null 2>&1 && DOCKER_ENABLED=1 || true ;;
  *) echo "Invalid --docker value: $ENABLE_DOCKER" >&2; exit 2 ;;
esac
if (( DOCKER_ENABLED )) && getent group docker >/dev/null 2>&1; then
  "${SUDO[@]}" usermod -aG docker "$SERVICE_USER"
  SYSTEMCTL_PATH="$(command -v systemctl)"
  SUDOERS_FILE="/etc/sudoers.d/${SERVICE_NAME}-docker"
  printf '%s ALL=(root) NOPASSWD: %s start docker, %s stop docker, %s restart docker\n' "$SERVICE_USER" "$SYSTEMCTL_PATH" "$SYSTEMCTL_PATH" "$SYSTEMCTL_PATH" | "${SUDO[@]}" tee "$SUDOERS_FILE" >/dev/null
  "${SUDO[@]}" chmod 0440 "$SUDOERS_FILE"
fi

"${SUDO[@]}" chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR/conf" "$INSTALL_DIR/database" "$INSTALL_DIR/uploads" "$INSTALL_DIR/runtime"
"${SUDO[@]}" chown -R root:root "$INSTALL_DIR/$APP_NAME" "$INSTALL_DIR/web"
"${SUDO[@]}" chmod 0755 "$INSTALL_DIR" "$INSTALL_DIR/$APP_NAME"

echo "[5/7] Installing systemd service..."
UNIT_TEMP="$TEMP_DIR/$SERVICE_NAME.service"
{
  printf '%s\n' '[Unit]' 'Description=Jydn-Panel' 'After=network-online.target' 'Wants=network-online.target' ''
  printf '%s\n' '[Service]' 'Type=simple' "User=$SERVICE_USER" "Group=$SERVICE_USER" "WorkingDirectory=$INSTALL_DIR" "ExecStart=$INSTALL_DIR/$APP_NAME" "EnvironmentFile=-$INSTALL_DIR/conf/github.env" 'Restart=on-failure' 'RestartSec=3' 'LimitNOFILE=1048576' 'PrivateTmp=true'
  printf 'ReadWritePaths=%s/conf %s/database %s/uploads %s/runtime\n' "$INSTALL_DIR" "$INSTALL_DIR" "$INSTALL_DIR" "$INSTALL_DIR"
  printf '%s\n' '' '[Install]' 'WantedBy=multi-user.target'
} > "$UNIT_TEMP"
"${SUDO[@]}" install -m 0644 "$UNIT_TEMP" "$SERVICE_FILE"
"${SUDO[@]}" systemctl daemon-reload
"${SUDO[@]}" systemctl enable "$SERVICE_NAME.service"

echo "[6/7] Starting $SERVICE_NAME..."
"${SUDO[@]}" systemctl restart "$SERVICE_NAME.service"
sleep 2
if ! systemctl is-active --quiet "$SERVICE_NAME.service"; then
  systemctl --no-pager --full status "$SERVICE_NAME.service" || true
  echo "Service failed to start. Existing data was not modified." >&2
  exit 1
fi

echo "[7/7] Installation complete."
systemctl --no-pager --full status "$SERVICE_NAME.service" | sed -n '1,12p' || true
HOST_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
echo "Open: http://${HOST_IP:-127.0.0.1}:$PORT"
echo "Data preserved in: $INSTALL_DIR/{conf,database,uploads,runtime}"
