#!/usr/bin/env sh
set -eu

APP_DIR="/app"
DATA_DIR="${ANGE_DATA_DIR:-/data}"
DEFAULT_CONF_DIR="${APP_DIR}/defaults/conf"
CONF_FILE="${DATA_DIR}/conf/conf.ini"

# Create persistent dirs
mkdir -p "${DATA_DIR}/conf" "${DATA_DIR}/database" "${DATA_DIR}/uploads" "${DATA_DIR}/runtime/temp"

# If this is a fresh volume, initialize config/db from image defaults/seed
# 1) conf
if [ -z "$(ls -A "${DATA_DIR}/conf" 2>/dev/null || true)" ]; then
  if [ -d "${DEFAULT_CONF_DIR}" ]; then
    cp -a "${DEFAULT_CONF_DIR}/." "${DATA_DIR}/conf/" || true
  elif [ -d "${APP_DIR}/conf" ]; then
    cp -a "${APP_DIR}/conf/." "${DATA_DIR}/conf/" || true
  fi
fi

# Existing Docker volumes keep their old conf.ini across image upgrades. Migrate
# only the legacy 3005 default so custom ports remain untouched.
if [ -f "${CONF_FILE}" ]; then
  if grep -Eq '^[[:space:]]*http_port[[:space:]]*=[[:space:]]*3005[[:space:]]*$' "${CONF_FILE}"; then
    sed -i -E 's/^[[:space:]]*http_port[[:space:]]*=.*$/http_port=8008/' "${CONF_FILE}"
    echo "Migrated Docker internal HTTP port from 3005 to 8008"
  elif ! grep -Eq '^[[:space:]]*http_port[[:space:]]*=' "${CONF_FILE}"; then
    printf '\nhttp_port=8008\n' >> "${CONF_FILE}"
  fi
fi
# 2) database
if [ ! -f "${DATA_DIR}/database/database.db" ]; then
  if [ -f "${APP_DIR}/seed/database/database.db" ]; then
    cp -a "${APP_DIR}/seed/database/database.db" "${DATA_DIR}/database/database.db" || true
  fi
fi

# 3) uploads (only if empty)
if [ -z "$(ls -A "${DATA_DIR}/uploads" 2>/dev/null || true)" ] || { [ "$(ls -A "${DATA_DIR}/uploads" | wc -l | tr -d ' ')" = "1" ] && [ -f "${DATA_DIR}/uploads/.gitkeep" ]; }; then
  if [ -d "${APP_DIR}/seed/uploads" ]; then
    cp -a "${APP_DIR}/seed/uploads/." "${DATA_DIR}/uploads/" || true
  fi
fi

# Link runtime paths expected by the app (relative ./conf ./database ./uploads ./runtime)
link_dir() {
  src="$1"; dst="$2"
  if [ -L "${src}" ]; then
    rm -f "${src}" 2>/dev/null || true
    ln -s "${dst}" "${src}"
    return
  fi
  if [ -e "${src}" ]; then
    # Do not delete a real directory: it may be a legacy user bind mount.
    return
  fi
  ln -s "${dst}" "${src}"
}

link_dir "${APP_DIR}/conf" "${DATA_DIR}/conf"
link_dir "${APP_DIR}/database" "${DATA_DIR}/database"
link_dir "${APP_DIR}/uploads" "${DATA_DIR}/uploads"
link_dir "${APP_DIR}/runtime" "${DATA_DIR}/runtime"

exec "$@"
