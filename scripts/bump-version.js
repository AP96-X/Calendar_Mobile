#!/usr/bin/env node
/**
 * 版本号统一入口（本地打包用，替代 EAS 的 autoIncrement）。
 *
 * 用法：
 *   node scripts/bump-version.js patch      # 1.2.0 -> 1.2.1，同时 versionCode/buildNumber +1
 *   node scripts/bump-version.js minor      # 1.2.0 -> 1.3.0，同时 versionCode/buildNumber +1
 *   node scripts/bump-version.js major      # 1.2.0 -> 2.0.0，同时 versionCode/buildNumber +1
 *   node scripts/bump-version.js 1.2.0      # 指定版本，同时 versionCode/buildNumber +1
 *   node scripts/bump-version.js --dry-run patch   # 只预览，不写文件
 *
 * 设计：
 * - `app.json` 是唯一真相源，原生 versionName/versionCode 由 `expo prebuild` 从它生成；
 *   设置页也直接读 `app.json`，因此三处不会再各写各的。
 * - 每次调用 versionCode（Android）与 buildNumber（iOS）都 +1：
 *   Android 每次上传商店的构建号必须严格递增，不能复用。
 * - version（用户可见）只在 patch/minor/major/显式指定时变化。
 * - `--dry-run` 不写入文件，安全预览结果。
 */
const fs = require('fs');
const path = require('path');

const APP_JSON = path.join(__dirname, '..', 'app.json');
const PKG_JSON = path.join(__dirname, '..', 'package.json');
const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)$/;
const BUMPS = ['major', 'minor', 'patch'];

function fail(message) {
  console.error(`[bump-version] ${message}`);
  process.exit(1);
}

function bumpSemver(version, type) {
  const m = SEMVER_RE.exec(version);
  if (!m) fail(`app.json 中的 version 不是合法 semver: "${version}"`);
  let [major, minor, patch] = m.slice(1).map(Number);
  if (type === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (type === 'minor') {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }
  return `${major}.${minor}.${patch}`;
}

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const [input] = argv.filter((a) => a !== '--dry-run');

if (!input) {
  fail('缺少参数。用法: node scripts/bump-version.js <patch|minor|major|x.y.z> [--dry-run]');
}

const appJson = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));
const expo = appJson.expo;
if (!expo) fail('app.json 缺少 expo 字段');

const currentVersion = expo.version;
const nextVersion = BUMPS.includes(input) ? bumpSemver(currentVersion, input) : input;
if (!SEMVER_RE.test(nextVersion)) {
  fail(`目标版本不是合法 semver: "${nextVersion}"`);
}

// 构建号永远递增；缺失时从 0 起算（即首次生成 1）
const nextVersionCode = Number(expo.android?.versionCode ?? 0) + 1;
const nextBuildNumber = String(Number(expo.ios?.buildNumber ?? 0) + 1);

expo.version = nextVersion;
expo.android = { ...expo.android, versionCode: nextVersionCode };
expo.ios = { ...expo.ios, buildNumber: nextBuildNumber };

if (dryRun) {
  console.log(
    `[bump-version] (dry-run) version ${currentVersion} -> ${nextVersion}, ` +
      `versionCode -> ${nextVersionCode}, buildNumber -> ${nextBuildNumber}`
  );
  process.exit(0);
}

fs.writeFileSync(APP_JSON, `${JSON.stringify(appJson, null, 2)}\n`, 'utf8');

// 同步 package.json 的 version，避免它成为第三处会漂移的版本号
// （package.json 的 version 不参与打包，但 `npm run` 会显示它，不一致会误导）
const pkgJson = JSON.parse(fs.readFileSync(PKG_JSON, 'utf8'));
if (pkgJson.version !== nextVersion) {
  pkgJson.version = nextVersion;
  fs.writeFileSync(PKG_JSON, `${JSON.stringify(pkgJson, null, 2)}\n`, 'utf8');
}

console.log(`[bump-version] version ${currentVersion} -> ${nextVersion}`);
console.log(`[bump-version] android.versionCode -> ${nextVersionCode}`);
console.log(`[bump-version] ios.buildNumber -> ${nextBuildNumber}`);
console.log('[bump-version] 已同步 app.json 与 package.json 的 version。');
console.log('[bump-version] 别忘了同步 CHANGELOG.md，然后再 prebuild / 打包。');
