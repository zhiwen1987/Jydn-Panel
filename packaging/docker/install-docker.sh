#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="jydn-panel"
IMAGE="${JYDN_IMAGE:-ghcr.io/zhiwen1987/jydn-panel:latest}"
PORT="${JYDN_PORT:-8008}"
DATA_DIR="${JYDN_DATA_DIR:-/opt/jydn-panel-data}"
MOUNT_SOCKET="${JYDN_DOCKER_SOCKET:-yes}"

command -v docker >/dev/null 2>&1 || { echo "缺少 Docker" >&2; exit 1; }
[[ "$PORT" =~ ^[0-9]+$ ]] && (( PORT >= 1 && PORT <= 65535 )) || { echo "端口无效：$PORT" >&2; exit 2; }
mkdir -p "$DATA_DIR"/{conf,database,uploads,runtime}

docker pull "$IMAGE"
docker rm -f "$APP_NAME" >/dev/null 2>&1 || true
ARGS=(
  run -d
  --name "$APP_NAME"
  --restart unless-stopped
  -p "$PORT:8008"
  -v "$DATA_DIR:/data"
)
if [[ "$MOUNT_SOCKET" == "yes" || "$MOUNT_SOCKET" == "true" || "$MOUNT_SOCKET" == "1" ]]; then
  if [[ ! -S /var/run/docker.sock ]]; then
    echo "未找到 /var/run/docker.sock，请先启动宿主机 Docker 服务，或设置 JYDN_DOCKER_SOCKET=no 禁用 Docker 管理" >&2
    exit 1
  fi
  ARGS+=(-v /var/run/docker.sock:/var/run/docker.sock)
fi
ARGS+=("$IMAGE")
docker "${ARGS[@]}"

echo "安装完成：http://127.0.0.1:$PORT/"
echo "数据目录：$DATA_DIR"
echo "查看日志：docker logs -f $APP_NAME"
