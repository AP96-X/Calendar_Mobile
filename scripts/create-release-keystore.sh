#!/usr/bin/env bash
#
# 生成 / 轮换 Android 正式签名 keystore，并把凭据写入全局 ~/.gradle/gradle.properties。
#
# 用法：
#   scripts/create-release-keystore.sh
#   scripts/create-release-keystore.sh --keystore ~/keystores/foo.keystore --alias foo
#   scripts/create-release-keystore.sh --password 'YourOwnPassw0rd!'
#   scripts/create-release-keystore.sh --force          # 覆盖已存在的 keystore（危险）
#
# 不传 --password 时会随机生成一个强密码并打印一次，请立即保存。
#
# ⚠️ keystore 一旦丢失，就永远无法更新已上架的 App（除非使用 Play App Signing 托管）。
#    生成后请把 keystore 文件与 ~/.gradle/gradle.properties 一起备份到仓库之外的安全位置。

set -euo pipefail

KEYSTORE_PATH="${HOME}/keystores/calendar/calendar-release.keystore"
KEY_ALIAS="calendar"
PASSWORD=""
FORCE="0"
DNAME="CN=Calendar Mobile, OU=Mobile, O=Calendar, L=Unknown, ST=Unknown, C=CN"
GRADLE_PROPS="${HOME}/.gradle/gradle.properties"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --keystore) KEYSTORE_PATH="$2"; shift 2 ;;
    --alias)    KEY_ALIAS="$2"; shift 2 ;;
    --password) PASSWORD="$2"; shift 2 ;;
    --force)    FORCE="1"; shift ;;
    -h|--help)  sed -n '2,16p' "$0"; exit 0 ;;
    *) echo "未知参数: $1" >&2; exit 1 ;;
  esac
done

if ! command -v keytool >/dev/null 2>&1; then
  echo "❌ 找不到 keytool，请先安装 JDK。" >&2
  exit 1
fi

if [[ -f "$KEYSTORE_PATH" && "$FORCE" != "1" ]]; then
  echo "❌ keystore 已存在: $KEYSTORE_PATH" >&2
  echo "   覆盖会导致旧签名永久失效（已上架 App 无法更新）。确需覆盖请加 --force。" >&2
  exit 1
fi

GENERATED="0"
if [[ -z "$PASSWORD" ]]; then
  # 24 字节随机 → base64，去掉易混淆/需转义的字符
  PASSWORD="$(head -c 24 /dev/urandom | base64 | tr -d '/+=' | cut -c1-24)"
  GENERATED="1"
fi

mkdir -p "$(dirname "$KEYSTORE_PATH")"

keytool -genkeypair -v \
  -keystore "$KEYSTORE_PATH" \
  -alias "$KEY_ALIAS" \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storetype PKCS12 \
  -storepass "$PASSWORD" \
  -keypass "$PASSWORD" \
  -dname "$DNAME"

chmod 600 "$KEYSTORE_PATH"

# ---- 写入 ~/.gradle/gradle.properties（保留其它已有配置）----
mkdir -p "$(dirname "$GRADLE_PROPS")"
touch "$GRADLE_PROPS"
chmod 600 "$GRADLE_PROPS"

if grep -q '^CALENDAR_UPLOAD_' "$GRADLE_PROPS"; then
  grep -v '^CALENDAR_UPLOAD_' "$GRADLE_PROPS" > "${GRADLE_PROPS}.tmp"
  mv "${GRADLE_PROPS}.tmp" "$GRADLE_PROPS"
fi

cat >> "$GRADLE_PROPS" <<EOF

# --- Calendar Mobile 正式签名（由 scripts/create-release-keystore.sh 生成）---
CALENDAR_UPLOAD_STORE_FILE=${KEYSTORE_PATH}
CALENDAR_UPLOAD_STORE_PASSWORD=${PASSWORD}
CALENDAR_UPLOAD_KEY_ALIAS=${KEY_ALIAS}
CALENDAR_UPLOAD_KEY_PASSWORD=${PASSWORD}
EOF

chmod 600 "$GRADLE_PROPS"

echo
echo "✅ keystore: ${KEYSTORE_PATH}"
echo "✅ 凭据已写入: ${GRADLE_PROPS}  (chmod 600)"
if [[ "$GENERATED" == "1" ]]; then
  echo "🔑 已随机生成强密码，内容见 ${GRADLE_PROPS}（此处不回显，避免进入日志/会话记录）"
fi
echo
echo "⚠️  请立刻把 keystore 文件与 gradle.properties 备份到仓库之外的安全位置。"
