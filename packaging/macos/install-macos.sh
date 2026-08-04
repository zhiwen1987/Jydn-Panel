#!/bin/bash
set -Eeuo pipefail

APP_NAME="jydn-panel"
PACKAGE_DIR="$(cd "$(dirname "$0")" && pwd)"
INSTALL_DIR="${JYDN_INSTALL_DIR:-/usr/local/jydn-panel}"
PORT="${JYDN_PORT:-8008}"
PLIST="/Library/LaunchDaemons/com.jydn.panel.plist"

case "$INSTALL_DIR" in
  /opt/*|/usr/local/*) ;;
  *) echo "安装目录必须位于 /opt 或 /usr/local 下：$INSTALL_DIR" >&2; exit 2 ;;
esac

if [[ $EUID -ne 0 ]]; then
  echo "请使用 sudo bash install-macos.sh" >&2
  exit 1
fi
[[ -x "$PACKAGE_DIR/$APP_NAME" ]] || { echo "安装包缺少 $APP_NAME" >&2; exit 1; }
[[ -f "$PACKAGE_DIR/web/index.html" ]] || { echo "安装包缺少 web/index.html" >&2; exit 1; }

launchctl bootout system "$PLIST" >/dev/null 2>&1 || true
pkill -x "$APP_NAME" >/dev/null 2>&1 || true
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$INSTALL_DIR/backups/$STAMP"
if [[ -f "$INSTALL_DIR/$APP_NAME" || -d "$INSTALL_DIR/web" ]]; then
  mkdir -p "$BACKUP_DIR"
  [[ ! -f "$INSTALL_DIR/$APP_NAME" ]] || cp -p "$INSTALL_DIR/$APP_NAME" "$BACKUP_DIR/"
  [[ ! -d "$INSTALL_DIR/web" ]] || cp -R "$INSTALL_DIR/web" "$BACKUP_DIR/"
fi

mkdir -p "$INSTALL_DIR" "$INSTALL_DIR"/{conf,database,uploads,runtime,backups}
install -m 0755 "$PACKAGE_DIR/$APP_NAME" "$INSTALL_DIR/$APP_NAME"
xattr -dr com.apple.quarantine "$INSTALL_DIR/$APP_NAME" >/dev/null 2>&1 || true
for tree in web seed lang assets; do
  [[ ! -d "$PACKAGE_DIR/$tree" ]] || { rm -rf "$INSTALL_DIR/$tree"; cp -R "$PACKAGE_DIR/$tree" "$INSTALL_DIR/$tree"; }
done
if [[ ! -f "$INSTALL_DIR/conf/conf.ini" && -f "$PACKAGE_DIR/conf/conf.example.ini" ]]; then
  cp "$PACKAGE_DIR/conf/conf.example.ini" "$INSTALL_DIR/conf/conf.ini"
fi
if [[ -f "$INSTALL_DIR/conf/conf.ini" ]]; then
  sed -i '' -E "s/^[[:space:]]*http_port[[:space:]]*=.*$/http_port=$PORT/" "$INSTALL_DIR/conf/conf.ini"
fi

cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.jydn.panel</string>
  <key>ProgramArguments</key><array><string>$INSTALL_DIR/$APP_NAME</string></array>
  <key>WorkingDirectory</key><string>$INSTALL_DIR</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$INSTALL_DIR/runtime/launchd.out.log</string>
  <key>StandardErrorPath</key><string>$INSTALL_DIR/runtime/launchd.err.log</string>
</dict></plist>
PLIST
chmod 0644 "$PLIST"
launchctl bootstrap system "$PLIST"
launchctl enable system/com.jydn.panel
launchctl kickstart -k system/com.jydn.panel

echo "安装完成：http://127.0.0.1:$PORT/"
echo "状态：sudo launchctl print system/com.jydn.panel"
