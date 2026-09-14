# 日历移动端 (Calendar Mobile)

基于 React Native + Expo 的日历移动应用，与 [Calendar App](https://github.com/AP96-X/Calendar) 后端 API 对接，支持事件管理、农历节气显示、节假日调休标注、Excel 导入导出。

![React Native](https://img.shields.io/badge/React_Native-0.86-61dafb)
![Expo](https://img.shields.io/badge/Expo-57-000020)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178c6)
![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20iOS-green)

## 功能概览

### 日历核心

- **月/周/日三视图** — 底部标签切换，支持前后翻页、回到今天
- **日视图 24 小时时间轴** — 事件按开始时间定位、方块高度对应时长，全天/未设置时间事件置顶，含当前时间红线与自动滚动到首个事件
- **农历 + 二十四节气** — 后端天文计算，移动端展示
- **法定节假日 & 调休** — 假期与补班自动标注
- **事件管理** — 创建、编辑、删除、标记完成、颜色标记
- **事件备注 / 时间范围 / 全天** — 支持多行备注、开始-结束时间，全天事件在日视图置顶
- **重复事件** — 每天 / 每周 / 每月 / 每年重复，支持「仅此事件 / 整个系列」增删改，重复事件以 🔄 标识
- **搜索 / 筛选** — 按关键字（标题或备注）、日期范围、颜色、完成状态组合查询，结果可一键跳转或直接勾选完成
- **事件详情** — 底部抽屉展示详情，支持编辑/删除/标记完成
- **Excel 导入导出** — 导入事件文件、按月或全部导出日历（含事件颜色与删除线）

### 用户与设置

- **登录认证** — 用户名密码登录，记住我功能
- **动态服务器配置** — 登录页/设置页可配置后端 API 地址，支持连接测试
- **个人信息** — 修改显示名称、修改密码
- **多用户隔离** — 每个用户独立管理自己的事件

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | React Native 0.86 + Expo SDK 57 |
| 语言 | TypeScript 6.0 |
| 导航 | React Navigation 7（Stack + Bottom Tab） |
| 状态管理 | Zustand 5 |
| UI 组件库 | React Native Paper 5（Material Design 3） |
| 网络请求 | Axios |
| 日期处理 | Day.js |
| 安全存储 | Expo Secure Store（Session Cookie） |
| 本地存储 | AsyncStorage（API 地址等配置） |
| 文件操作 | Expo Document Picker（导入）+ Expo Sharing（导出分享）+ expo-file-system/legacy（文件写入） |

## 项目结构

```
calendar-mobile/
├── App.tsx                        # 应用入口（PaperProvider + SafeAreaProvider）
├── index.ts                       # Expo 注册根组件
├── app.json                       # Expo 配置（应用名、图标、插件）
├── eas.json                       # EAS Build 配置（preview/production）
├── package.json                   # 依赖与脚本
├── tsconfig.json                  # TypeScript 配置
├── .gitignore                     # Git 忽略规则
├── assets/                        # 应用图标与启动图
│   ├── icon.png
│   ├── splash-icon.png
│   ├── favicon.png
│   └── android-icon-*.png         # Android 自适应图标
│
└── src/
    ├── api/                       # API 封装层
    │   ├── client.ts              # Axios 实例 + 拦截器（动态 baseURL + Cookie）
    │   ├── config.ts              # API 地址管理（存储/读取/测试连接）
    │   ├── auth.ts                # 认证 API（登录/登出/状态）
    │   ├── events.ts              # 事件 API（CRUD + 导入导出）
    │   ├── calendar.ts            # 日历元数据 API（农历/节气/节假日）
    │   ├── profile.ts             # 个人信息 API
    │   ├── users.ts               # 用户管理 API
    │   └── audit.ts               # 审计日志 API
    │
    ├── components/                # 通用组件
    │   ├── DayCell.tsx            # 月视图日期单元格
    │   ├── MonthView.tsx          # 月视图
    │   ├── WeekView.tsx           # 周视图（横向滚动）
    │   ├── DayView.tsx            # 日视图（24 小时时间轴，全天置顶）
    │   ├── EventFormSheet.tsx     # 事件新增/编辑底部表单（备注/时间范围/全天/重复）
    │   ├── EventDetailSheet.tsx   # 事件详情底部抽屉
    │   └── SearchSheet.tsx        # 搜索 / 筛选底部面板
    │
    ├── navigation/                # 导航配置
    │   ├── AppNavigator.tsx       # 根导航（登录/主界面切换）
    │   └── TabNavigator.tsx       # 底部标签（日历/设置）
    │
    ├── screens/                   # 页面组件
    │   ├── LoginScreen.tsx        # 登录页（含服务器地址配置）
    │   ├── CalendarScreen.tsx     # 日历主页（视图切换 + 事件管理）
    │   └── SettingsScreen.tsx     # 设置页（个人信息/密码/导入导出/服务器配置）
    │
    ├── stores/
    │   └── auth.ts                # Zustand 认证状态（登录/登出/刷新）
    │
    ├── theme/                     # 主题配置
    │   ├── colors.ts              # 颜色定义
    │   └── spacing.ts             # 间距/字号/圆角
    │
    ├── types/
    │   └── index.ts               # TypeScript 类型定义
    │
    └── utils/
        └── calendar.ts            # 日历工具函数（周日期/农历/徽章）
```

## 快速开始

### 环境要求

- Node.js 18+
- Expo CLI（通过 npx 调用，无需全局安装）
- Android Studio 或 Xcode（用于模拟器/真机调试）
- 后端服务已启动（[Calendar App](https://github.com/AP96-X/Calendar)）

### 安装与运行

```bash
# 1. 安装依赖
cd calendar-mobile
npm install

# 2. 启动 Expo 开发服务器
npx expo start

# 3. 在模拟器或真机上运行
#    Android: 按 a 或扫描二维码
#    iOS:     按 i（需 macOS + Xcode）
```

### 配置后端地址

首次使用需在登录页底部配置后端 API 地址：

1. 展开登录页底部的「服务器配置」面板
2. 输入后端地址（如 `192.168.1.100:5000`）
3. 点击「测试连接」验证可达性
4. 保存后即可登录

地址也可在设置页的「服务器地址」中随时修改。

### 默认管理员

```
账号: admin
密码: 见 .env 中的 ADMIN_DEFAULT_PASSWORD 或容器启动日志
```

## 功能说明

### 日历视图

| 视图 | 交互 |
|------|------|
| 月视图 | 点击日期切换日视图，点击事件打开详情，点击「更多」跳转日视图 |
| 周视图 | 横向滚动查看一周，点击日期头部切换日视图，点击事件打开详情 |
| 日视图 | 24 小时时间轴展示，事件按开始时间定位、高度对应时长，全天事件置顶，含当前时间线；点击事件打开详情，可添加/编辑/删除 |

### 事件管理

- **创建** — 点击日期或添加按钮，填写标题/日期/时间/颜色
- **编辑** — 事件详情中点击编辑，修改后保存
- **删除** — 事件详情中点击删除，确认后移除
- **标记完成** — 点击复选框或详情中的标记按钮
- **颜色标签** — 预设颜色 + 自定义十六进制颜色输入（含格式校验）

### 数据导入导出

- **导入** — 设置页 → 数据管理 → 导入事件，选择 Excel 文件上传（自动解析颜色与删除线）
- **导出** — 设置页 → 数据管理 → 导出事件（Excel），可选择「按月导出」或「导出全部」，通过系统分享保存文件

## 后端依赖

本应用需要 [Calendar App](https://github.com/AP96-X/Calendar) 后端服务运行中，API 接口包括：

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/auth/login` | POST | 登录 |
| `/api/auth/logout` | POST | 退出 |
| `/api/auth/status` | GET | 登录状态 |
| `/api/events` | GET/POST | 查询/创建事件（支持 description / end_time / all_day / recurrence 等字段） |
| `/api/events/<id>` | PUT/DELETE | 更新/删除事件（`scope=single\|series` 指定重复系列范围） |
| `/api/events/<id>/toggle` | POST | 切换完成状态 |
| `/api/events/day` | GET | 某天事件 |
| `/api/events/week` | GET | 某周事件 |
| `/api/events/search` | GET | 搜索/筛选（q / start / end / color / completed / limit） |
| `/api/events/export` | GET | 导出 Excel（支持 year/month 参数和 all=1 全部导出） |
| `/api/events/import` | POST | 从 Excel 导入 |
| `/api/calendar-meta` | GET | 日历元数据 |
| `/api/profile` | GET/PUT | 个人信息 |
| `/api/profile/password` | PUT | 修改密码 |

## 构建发布

本项目采用**纯本地打包**，不使用 EAS 云端构建。

`android/` 与 `ios/` 是 `expo prebuild` 的生成物，未纳入版本控制；**`app.json` 是全部配置与版本号的唯一真相源**。

### 版本号管理

| 字段 | 位置 | 说明 |
|------|------|------|
| `version` | `app.json` → `expo.version` | 用户可见版本，生成原生 `versionName` |
| `versionCode` | `app.json` → `expo.android.versionCode` | 商店构建号，**每次上传必须递增** |
| `buildNumber` | `app.json` → `expo.ios.buildNumber` | iOS 构建号，规则同 `versionCode` |

设置页显示的版本号直接读取 `app.json`，因此不会与原生版本漂移。

```bash
npm run bump patch                # 1.2.0 -> 1.2.1
npm run bump minor                # 1.2.0 -> 1.3.0
npm run bump major                # 1.2.0 -> 2.0.0
npm run bump 1.2.0                # version 不变，只递增构建号（同版本重发包）
npm run bump -- --dry-run patch   # 只预览，不写入
```

> **`version` 与构建号是两套独立的号。** 无论哪种场景，`versionCode` / `buildNumber` 都会 **+1**——应用商店只认 `versionCode` 是否比上次大，用户只看 `version`。

> 不要手改 `app.json` 的版本字段。`npm run bump` 会同时更新 `app.json` 与 `package.json` 的 `version`，以及 Android `versionCode` / iOS `buildNumber`。

### 打包步骤（按升级场景）

通用流程五步，**三种场景只有第 ② 步的命令不同**：

```bash
# ① 改完代码，先自测
npm run typecheck

# ② 定版本（见下方各场景）
npm run bump -- --dry-run <类型>   # 先预览
npm run bump <类型>                # 再写入

# ③ 记录更新日志：编辑 CHANGELOG.md，新增 "## [V新版本] - YYYY-MM-DD"

# ④ 出包（内部已含 android:sync，无需手动执行）
npm run android:release   # APK：自装 / 内测分发
npm run android:aab       # AAB：Google Play 上架

# ⑤ 验证版本 + 签名（见「打包后验证」）
npm run verify:signing
```

> `npm run android:release` = `android:sync`（prebuild 重建 `android/` 并写入 `local.properties`）+ `gradlew assembleRelease`。
> 只有想单独同步原生工程而不打包时，才需要手动执行 `npm run android:sync`。

#### 场景 A：V1.2.0 → V1.2.1（修订版：修 bug、无新功能）

```bash
npm run typecheck
npm run bump -- --dry-run patch    # 预览：version 1.2.0 -> 1.2.1, versionCode -> 4, buildNumber -> 2
npm run bump patch
# 编辑 CHANGELOG.md 新增 "## [V1.2.1] - YYYY-MM-DD"
npm run android:release            # 或 npm run android:aab
npm run verify:signing
```

| 字段 | 变化 |
|------|------|
| `version` | 1.2.0 → **1.2.1** |
| `versionCode` | 3 → **4** |
| `buildNumber` | 1 → **2** |

#### 场景 B：V1.2.0 → V1.3.0（次版本：新增功能、向后兼容）

```bash
npm run typecheck
npm run bump -- --dry-run minor    # 预览：version 1.2.0 -> 1.3.0, versionCode -> 4, buildNumber -> 2
npm run bump minor
# 编辑 CHANGELOG.md 新增 "## [V1.3.0] - YYYY-MM-DD"
npm run android:release            # 或 npm run android:aab
npm run verify:signing
```

| 字段 | 变化 |
|------|------|
| `version` | 1.2.0 → **1.3.0** |
| `versionCode` | 3 → **4** |
| `buildNumber` | 1 → **2** |

#### 场景 C：V1.2.0 → V2.0.0（主版本：破坏性变更）

```bash
npm run typecheck
npm run bump -- --dry-run major    # 预览：version 1.2.0 -> 2.0.0, versionCode -> 4, buildNumber -> 2
npm run bump major
# 编辑 CHANGELOG.md 新增 "## [V2.0.0] - YYYY-MM-DD"（建议写明不兼容点与升级方式）
npm run android:release            # 或 npm run android:aab
npm run verify:signing
```

| 字段 | 变化 |
|------|------|
| `version` | 1.2.0 → **2.0.0** |
| `versionCode` | 3 → **4** |
| `buildNumber` | 1 → **2** |

> 三种场景的 `versionCode` 都是 3 → 4，**差别只在 `version` 的语义**：修订=修 bug、次版本=加功能、主版本=不兼容改动。

#### 场景 D：版本不变，只重新出包

改了签名配置、调整了构建参数，或上一次的包需要重打时：

```bash
npm run bump 1.2.0        # version 保持 1.2.0，versionCode 3 -> 4
npm run android:release
npm run verify:signing
```

> ⚠️ **绝不能复用同一个 `versionCode` 重复上传商店**，否则 Google Play 会拒收。

#### 打包后验证

产物位置：

- APK：`android/app/build/outputs/apk/release/app-release.apk`
- AAB：`android/app/build/outputs/bundle/release/app-release.aab`

建议每次出包后核对**版本号**与**签名**两项：

```bash
# ① 版本：确认 APK 内嵌的版本与 app.json 一致
AAPT=$(ls -d "$HOME"/Android/Sdk/build-tools/*/aapt2 | sort -V | tail -1)
"$AAPT" dump badging android/app/build/outputs/apk/release/app-release.apk | grep '^package:'
# → package: name='com.calendar.app' versionCode='4' versionName='1.2.1' ...

# ② 签名：确认真的是正式证书，而不是静默回退到 debug
npm run verify:signing
```

### Android SDK 定位

Gradle 需要 `ANDROID_HOME` / `ANDROID_SDK_ROOT`，或 `android/local.properties` 里的 `sdk.dir`。
由于 **`expo prebuild` 会清空重建 `android/`、连带删掉 `local.properties`**，直接跑 `./gradlew` 会报：

```
SDK location not found. Define a valid SDK location with an ANDROID_HOME
environment variable or by setting the sdk.dir path in ... local.properties
```

因此 `npm run android:sync` 末尾会自动调用 `scripts/ensure-android-sdk.sh`，
按 `ANDROID_HOME` → `ANDROID_SDK_ROOT` → `~/Android/Sdk` → … 的顺序探测 SDK 并写入 `local.properties`。

也可以单独执行，或强制重写：

```bash
npm run android:sdk                 # 缺失/不一致时写入
bash scripts/ensure-android-sdk.sh --force   # 总是重写
```

> **本机已配置**：`ANDROID_HOME` 与 `ANDROID_SDK_ROOT` 已写入 `~/.bashrc` 和 `~/.profile`，并把 `platform-tools`（adb）、`emulator` 加入了 `PATH`。
> 换机器时可照抄：
> ```bash
> export ANDROID_HOME="$HOME/Android/Sdk"
> export ANDROID_SDK_ROOT="$ANDROID_HOME"
> ```

### ✅ 正式签名（已配置）

release 包使用正式 keystore 签名。由于 `expo prebuild` 每次都会清空重建 `android/`，签名配置**不能手改 `build.gradle`**，而是通过 config plugin 注入，因此重建后依然有效。

| 文件 | 作用 |
|------|------|
| `plugins/withAndroidReleaseSigning.js` | config plugin：在 `build.gradle` 末尾追加 release `signingConfig`，从 Gradle 全局属性读凭据 |
| `~/keystores/calendar/calendar-release.keystore` | 正式签名密钥（仓库外，`chmod 600`） |
| `~/.gradle/gradle.properties` | 签名凭据 `CALENDAR_UPLOAD_*`（仓库外，`chmod 600`） |

**生成 / 轮换密钥：**

```bash
# 生成 keystore 并写入 ~/.gradle/gradle.properties（随机强密码，不回显）
scripts/create-release-keystore.sh

# 自定义路径 / 别名 / 自己的密码
scripts/create-release-keystore.sh --keystore ~/keystores/foo.keystore --alias foo --password 'YourPass'

# 覆盖已有 keystore（危险：旧签名永久失效，无法更新已上架 App）
scripts/create-release-keystore.sh --force
```

**验证签名是否生效：**

```bash
# 1) 构建配置层面：确认 release variant 指向 SigningConfig "release"
cd android && ./gradlew :app:signingReport

# 2) 产物层面（推荐，防止静默回退）：校验打出来的 APK / AAB 到底用的哪个证书
npm run verify:signing                                    # 自动查找 release 产物
npm run verify:signing -- path/to/app-release.apk         # 或指定产物
```

`verify:signing` 会把产物证书指纹与 keystore 指纹、debug 证书指纹逐一比对：

- ✅ 与正式 keystore 一致 → 退出码 0
- ❌ 命中 debug 证书指纹 → 判定「静默回退」，退出码 1
- ❌ 与 keystore 不匹配 / 未签名 / 签名损坏 → 退出码 1

建议**每次出包后都跑一次**，避免"以为签好了、其实回退了"。

**安全须知：**

- ⚠️ **keystore 与密码必须备份到仓库之外的安全位置**。丢失后无法更新已上架的应用（除非启用 Play App Signing 托管）。
- 凭据只存在于 `~/.gradle/gradle.properties`，不会进入 git；`.gitignore` 已忽略 `*.jks` / `*.keystore`。
- 换机器或凭据缺失时，plugin 会回退到 debug 签名，并在构建 release 时打印警告，不会让构建直接失败。

### iOS

需 macOS + Xcode，且当前仓库尚未生成 `ios/` 工程：

```bash
npx expo prebuild --platform ios
cd ios && pod install
# 用 Xcode 打开 .xcworkspace 构建归档
```

## 系统要求

Android 8.0+ / iOS 13.0+

## 许可证

MIT
