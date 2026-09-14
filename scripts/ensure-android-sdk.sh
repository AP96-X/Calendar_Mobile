#!/usr/bin/env bash
#
# 确保 android/local.properties 存在，且 sdk.dir 指向有效的 Android SDK。
#
# 背景：
#   Gradle 需要 ANDROID_HOME / ANDROID_SDK_ROOT，或 android/local.properties 里的
#   sdk.dir 才能定位 Android SDK。而 `expo prebuild` 会清空重建整个 android/，
#   local.properties 会随之丢失，于是出现：
#     "SDK location not found. Define a valid SDK location with an ANDROID_HOME
#      environment variable or by setting the sdk.dir path ... local.properties"
#   因此每次 prebuild 之后都要重新生成它（本脚本已挂在 npm run android:sync 里）。
#
# 用法：
#   scripts/ensure-android-sdk.sh          # 缺失或不一致时写入
#   scripts/ensure-android-sdk.sh --force  # 总是重写

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="${ROOT_DIR}/android"
PROPS="${ANDROID_DIR}/local.properties"
FORCE="0"
[[ "${1:-}" == "--force" ]] && FORCE="1"

die() { echo "❌ $*" >&2; exit 1; }

find_sdk() {
  local candidates=(
    "${ANDROID_HOME:-}"
    "${ANDROID_SDK_ROOT:-}"
    "${HOME}/Android/Sdk"
    "${HOME}/Library/Android/sdk"
    "/usr/lib/android-sdk"
    "/opt/android-sdk"
    "/opt/android/sdk"
  )
  local c
  for c in "${candidates[@]}"; do
    if [[ -n "$c" && -d "$c" ]]; then
      printf '%s\n' "$c"
      return 0
    fi
  done
  return 1
}

[[ -d "$ANDROID_DIR" ]] \
  || die "android/ 不存在。请先执行 npm run android:sync（= expo prebuild），或用 npm run android 让 Expo 生成它。"

SDK="$(find_sdk || true)"
[[ -n "$SDK" ]] \
  || die "找不到 Android SDK。请设置 ANDROID_HOME 环境变量，或把 SDK 安装到 ~/Android/Sdk。"

# 目录得像一个真正的 SDK，避免误把别的路径写进去
if [[ ! -d "${SDK}/platforms" && ! -d "${SDK}/build-tools" ]]; then
  die "目录 ${SDK} 不像 Android SDK（既没有 platforms/ 也没有 build-tools/）。请修正 ANDROID_HOME。"
fi

# 已存在且指向同一个 SDK 就跳过
if [[ -f "$PROPS" && "$FORCE" != "1" ]]; then
  EXISTING="$(grep -E '^sdk\.dir=' "$PROPS" | head -1 | cut -d= -f2- || true)"
  if [[ "$EXISTING" == "$SDK" ]]; then
    echo "✅ Android SDK 已配置：${SDK}"
    exit 0
  fi
fi

printf 'sdk.dir=%s\n' "$SDK" > "$PROPS"
echo "✅ 已写入 ${PROPS}"
echo "   sdk.dir=${SDK}"
