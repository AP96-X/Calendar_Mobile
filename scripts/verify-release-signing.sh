#!/usr/bin/env bash
#
# 校验发布包（APK / AAB）是否真的用正式 keystore 签名，
# 而不是在凭据缺失时静默回退到 debug 证书。
#
# 用法：
#   scripts/verify-release-signing.sh                  # 自动查找 release 产物
#   scripts/verify-release-signing.sh path/to/app.apk
#   scripts/verify-release-signing.sh path/to/app.aab
#
# 退出码：
#   0 = 签名正确（正式证书）
#   1 = 未签名 / 签名损坏 / 回退到 debug 证书 / 与 keystore 不匹配
#
# 依赖：apksigner（Android SDK build-tools，校验 APK）、jarsigner + keytool（JDK，校验 AAB）。
# 说明：不打印任何密码。

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GRADLE_PROPS="${HOME}/.gradle/gradle.properties"
DEBUG_KEYSTORE="${ROOT_DIR}/android/app/debug.keystore"

# RN / Expo 模板 debug.keystore 的固定 SHA-256 指纹（读不到本地 debug.keystore 时的兜底）
DEBUG_FP_FALLBACK="FAC61745DC0903786FB9EDE62A962B399F7348F0BB6F899B8332667591033B9C"

die() { echo "❌ $*" >&2; exit 1; }

# 归一化指纹：去掉冒号与空白并转大写，便于比对
norm_fp() { tr -d ':[:space:]' | tr '[:lower:]' '[:upper:]'; }

# 加冒号便于阅读：AABBCC -> AA:BB:CC
fmt_fp() { sed 's/\(..\)/\1:/g; s/:$//' <<< "$1"; }

# 读取 ~/.gradle/gradle.properties 中的属性（不存在则返回空）
prop() {
  [[ -f "$GRADLE_PROPS" ]] || return 0
  grep -E "^$1=" "$GRADLE_PROPS" | head -1 | cut -d= -f2-
}

# 从 keystore / jar 的 keytool 输出中抽取 SHA-256 指纹
fp_from_keytool() {
  grep -iE 'sha-?256' | head -1 | sed 's/^[^:]*: *//' | norm_fp
}

# ---- 1. 定位产物 ----
ARTIFACT="${1:-}"
if [[ -z "$ARTIFACT" ]]; then
  for candidate in \
    "${ROOT_DIR}/android/app/build/outputs/apk/release/app-release.apk" \
    "${ROOT_DIR}/android/app/build/outputs/bundle/release/app-release.aab"; do
    if [[ -f "$candidate" ]]; then ARTIFACT="$candidate"; break; fi
  done
fi

if [[ -z "$ARTIFACT" || ! -f "$ARTIFACT" ]]; then
  die "找不到构建产物。请先执行 npm run android:release（APK）或 npm run android:aab，或把产物路径作为参数传入。"
fi

echo "产物          : ${ARTIFACT}"
echo "大小          : $(du -h "$ARTIFACT" | cut -f1)"
echo

# ---- 2. 读取产物实际签名指纹（写入全局 ACTUAL_FP，便于 die 正常终止脚本）----
ACTUAL_FP=""

read_apk_fp() {
  local apk="$1" sdk apksigner out rc fp
  sdk="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Android/Sdk}}"
  apksigner="$(ls -d "$sdk"/build-tools/*/apksigner 2>/dev/null | sort -V | tail -1)"

  if [[ -n "$apksigner" && -x "$apksigner" ]]; then
    out="$("$apksigner" verify --print-certs -v "$apk" 2>&1)"
    rc=$?
    if [[ $rc -ne 0 ]]; then
      echo "$out" >&2
      die "apksigner 校验失败：产物未签名或签名已损坏。"
    fi
    # 显示实际使用的签名方案（v1 / v2 / v3）
    grep -iE 'Verified using' <<< "$out" | sed 's/^/  /' >&2 || true
    ACTUAL_FP="$(grep -iE 'SHA-256 digest' <<< "$out" | head -1 | sed 's/^[^:]*: *//' | norm_fp)"
  else
    echo "  ⚠️ 未找到 apksigner（推断的 SDK 路径: ${sdk}），回退 keytool，仅能读取 v1(JAR) 签名。" >&2
    fp="$(keytool -printcert -jarfile "$apk" 2>/dev/null | fp_from_keytool)"
    if [[ -z "$fp" ]]; then
      die "无法读取 APK 签名：该 APK 可能仅使用 v2/v3 签名，而 keytool 只能读 v1。请设置 ANDROID_HOME 指向 Android SDK 后重试。"
    fi
    ACTUAL_FP="$fp"
  fi
}

read_aab_fp() {
  local aab="$1"
  jarsigner -verify "$aab" >/dev/null 2>&1 \
    || die "jarsigner 校验失败：AAB 未签名或签名已损坏。"
  ACTUAL_FP="$(keytool -printcert -jarfile "$aab" 2>/dev/null | fp_from_keytool)"
}

case "$ARTIFACT" in
  *.apk) read_apk_fp "$ARTIFACT" ;;
  *.aab) read_aab_fp "$ARTIFACT" ;;
  *)     die "只支持 .apk 或 .aab 产物。" ;;
esac

[[ -n "$ACTUAL_FP" ]] || die "无法从产物中读取签名指纹。"

# ---- 3. 期望指纹（来自正式 keystore）与 debug 指纹 ----
KEYSTORE="$(prop CALENDAR_UPLOAD_STORE_FILE)"
ALIAS="$(prop CALENDAR_UPLOAD_KEY_ALIAS)"
STOREPASS="$(prop CALENDAR_UPLOAD_STORE_PASSWORD)"

EXPECTED_FP=""
if [[ -n "$KEYSTORE" && -n "$ALIAS" && -n "$STOREPASS" && -f "$KEYSTORE" ]]; then
  EXPECTED_FP="$(keytool -list -v -keystore "$KEYSTORE" -alias "$ALIAS" -storepass "$STOREPASS" 2>/dev/null | fp_from_keytool)"
fi

DEBUG_FP=""
if [[ -f "$DEBUG_KEYSTORE" ]]; then
  DEBUG_FP="$(keytool -list -v -keystore "$DEBUG_KEYSTORE" -alias androiddebugkey -storepass android 2>/dev/null | fp_from_keytool)"
fi
[[ -n "$DEBUG_FP" ]] || DEBUG_FP="$DEBUG_FP_FALLBACK"

echo "产物证书 SHA-256 : $(fmt_fp "$ACTUAL_FP")"
[[ -n "$EXPECTED_FP" ]] && echo "期望证书 SHA-256 : $(fmt_fp "$EXPECTED_FP")"
echo "debug 证书 SHA-256: $(fmt_fp "$DEBUG_FP")"
echo

# ---- 4. 结论 ----
if [[ -n "$EXPECTED_FP" && "$ACTUAL_FP" == "$EXPECTED_FP" ]]; then
  echo "✅ 签名正确：使用正式 keystore 证书，可以上架。"
  exit 0
fi

if [[ "$ACTUAL_FP" == "$DEBUG_FP" ]]; then
  echo "❌ 该产物使用了 DEBUG 证书签名 —— 正式签名未生效（静默回退）。" >&2
  echo "   请检查 ${GRADLE_PROPS} 中的 CALENDAR_UPLOAD_* 配置后重新打包。" >&2
  exit 1
fi

if [[ -z "$EXPECTED_FP" ]]; then
  echo "⚠️  未找到正式 keystore 凭据（${GRADLE_PROPS}），无法比对期望指纹。" >&2
  echo "   好消息是：产物并非 debug 证书，可能已用正式证书签名，但无法确认。" >&2
  exit 1
fi

echo "❌ 产物证书与 keystore 中的 alias「${ALIAS}」不匹配！" >&2
echo "   可能使用了另一个 keystore，或 keystore 已被轮换。" >&2
exit 1
