#!/bin/sh
set -eu

APP_NAME="jydn-panel"
PACKAGE_DIR="$(CDPATH= cd "$(dirname "$0")" && pwd)"
INSTALL_DIR="${JYDN_INSTALL_DIR:-/opt/jydn-panel}"
PORT="${JYDN_PORT:-8008}"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --dir) INSTALL_DIR="$2"; shift 2 ;;
    --port) PORT="$2"; shift 2 ;;
    *) echo "未知参数：$1" >&2; exit 2 ;;
  esac
done

case "$INSTALL_DIR" in
  /|/opt|/usr|/usr/local|/mnt|/mnt/data|/root) echo "安装目录范围过大：$INSTALL_DIR" >&2; exit 2 ;;
esac

[ "$(id -u)" = "0" ] || { echo "请使用 root 运行 install-openwrt.sh" >&2; exit 1; }
[ -f "$PACKAGE_DIR/$APP_NAME" ] || { echo "安装包缺少 $APP_NAME" >&2; exit 1; }
[ -f "$PACKAGE_DIR/web/index.html" ] || { echo "安装包缺少 web/index.html" >&2; exit 1; }

test -x /etc/init.d/$APP_NAME && /etc/init.d/$APP_NAME stop || true
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$INSTALL_DIR/backups/$STAMP"
if [ -f "$INSTALL_DIR/$APP_NAME" ] || [ -d "$INSTALL_DIR/web" ]; then
  mkdir -p "$BACKUP_DIR"
  [ ! -f "$INSTALL_DIR/$APP_NAME" ] || cp "$INSTALL_DIR/$APP_NAME" "$BACKUP_DIR/"
  [ ! -d "$INSTALL_DIR/web" ] || cp -R "$INSTALL_DIR/web" "$BACKUP_DIR/"
fi

mkdir -p "$INSTALL_DIR" "$INSTALL_DIR/conf" "$INSTALL_DIR/database" "$INSTALL_DIR/uploads" "$INSTALL_DIR/runtime" "$INSTALL_DIR/backups"
cp "$PACKAGE_DIR/$APP_NAME" "$INSTALL_DIR/$APP_NAME"
chmod 0755 "$INSTALL_DIR/$APP_NAME"
for tree in web seed lang assets; do
  if [ -d "$PACKAGE_DIR/$tree" ]; then
    rm -rf "$INSTALL_DIR/$tree"
    cp -R "$PACKAGE_DIR/$tree" "$INSTALL_DIR/$tree"
  fi
done
if [ ! -f "$INSTALL_DIR/conf/conf.ini" ] && [ -f "$PACKAGE_DIR/conf/conf.example.ini" ]; then
  cp "$PACKAGE_DIR/conf/conf.example.ini" "$INSTALL_DIR/conf/conf.ini"
fi
if [ -f "$INSTALL_DIR/conf/conf.ini" ]; then
  sed -i "s/^[[:space:]]*http_port[[:space:]]*=.*$/http_port=$PORT/" "$INSTALL_DIR/conf/conf.ini"
fi

sed "s|__INSTALL_DIR__|$INSTALL_DIR|g" "$PACKAGE_DIR/jydn-panel.init" > "/etc/init.d/$APP_NAME"
chmod 0755 "/etc/init.d/$APP_NAME"
/etc/init.d/$APP_NAME enable
/etc/init.d/$APP_NAME start

echo "安装完成：http://$(uci -q get network.lan.ipaddr || echo 127.0.0.1):$PORT/"
echo "日志：logread -e jydn-panel"
