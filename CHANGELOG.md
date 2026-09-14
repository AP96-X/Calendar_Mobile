# 更新日志

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/) 规范，版本号以 Git Tag 形式发布（`V主版本.次版本.修订号`）。

## [V1.2.0] - 2026-09-14

移动端体验与健壮性版本。

> 注意：这是**移动端自身的版本号**，与后端 V1.2.0 新增的「AI 报告 / 管理员系统设置」无关，移动端暂未接入这些能力。

### 新增

- **日期 / 时间选择器** — 事件表单的日期、重复结束日期改为月历选择器；开始/结束时间改为时/分滚轮选择器，替代原来只能 ±1 天调整与手动输入 `HH:MM`
- **重复规则可编辑** — 编辑已有事件时可修改重复规则与结束日期；因后端 PUT 不重新生成实例，采用「删除 + 重建」实现（会提示完成状态将丢失）
- **搜索结果分页** — 结果上限从固定 200 条改为 200 起、可「加载更多」至 1000 条；搜索日期范围同样改用日期选择器
- **下拉刷新** — 月 / 周 / 日三视图均支持下拉刷新
- **首次加载骨架屏** — 数据返回前以脉冲骨架占位，不再白屏

### 改进

- **乐观更新** — 切换完成状态、删除事件立即在本地生效，失败自动回滚，不再每次操作都重新拉取三页
- **日视图当前时间红线** — 每分钟自动刷新（原为进入页面时固定不动）
- **跨午夜自动刷新「今天」** — 每分钟校验，并在 App 回到前台时同步
- **三页渲染优化** — 分页内容与月视图 memo 化，避免 toast / FAB 等无关状态变化时重建 126 个日期单元格
- **请求竞态处理** — 快速翻页时丢弃过期响应，避免旧数据覆盖新数据
- **自定义颜色校验** — 非法 `#RRGGBB` 直接内联报错，不再静默回退为默认色

### 修复

- **缓存按用户隔离** — 缓存 key 加入 `user_id` 命名空间；401 自动登出时同步清空缓存，避免切换账号后读到上一用户的数据

### 工程

- **版本号单一来源** — `app.json` 为唯一真相源：设置页直接读取它，原生 `versionName` / `versionCode` 由 `expo prebuild` 从同一处生成
- 新增 `npm run bump`：一条命令同时递增 `version` 与构建号（Android `versionCode`、iOS `buildNumber`）
- `app.json` 补充此前缺失的 `android.versionCode` 与 `ios.buildNumber`
- 新增 `npm run typecheck` / `android:sync` / `android:release` / `android:aab`
- **Android 正式签名** — 新增 config plugin `plugins/withAndroidReleaseSigning.js`，在 prebuild 时向 `build.gradle` 注入 release `signingConfig`；新增 `scripts/create-release-keystore.sh` 生成 keystore 并写入 `~/.gradle/gradle.properties`；凭据缺失时回退 debug 签名并告警
- **发布包签名校验** — 新增 `scripts/verify-release-signing.sh`（`npm run verify:signing`），比对产物证书与 keystore / debug 证书指纹，能识别「静默回退到 debug 签名」
- **Android SDK 自动定位** — 新增 `scripts/ensure-android-sdk.sh`（`npm run android:sdk`）并在 `android:sync` 中自动执行，解决 `expo prebuild` 清空 `android/` 后 `local.properties` 丢失导致的 `SDK location not found`
- README「构建发布」按升级场景重写：补充 V1.2.0→V1.2.1 / V1.3.0 / V2.0.0 及「版本不变重发包」的完整步骤与逐字段变化对照
- `npm run bump` 同时同步 `app.json` 与 `package.json` 的 `version`，杜绝第三处版本号漂移
- `.gitignore` 增加 `*.keystore`

### 升级说明

- 本项目改为**纯本地打包**，不再依赖 EAS 云端构建；`eas.json` 与 `app.json` 中的 EAS 占位配置暂未使用
- 改版本号一律走 `npm run bump <patch|minor|major|x.y.z>`，不要手改 `app.json`
- release 包已改用正式 keystore 签名（详见 README「构建发布 → 正式签名」）
- ⚠️ **务必备份 `~/keystores/calendar/` 与 `~/.gradle/gradle.properties`**：keystore 丢失将无法更新已上架的应用

## [V1.1.0] - 2026-09-11

事件能力的大版本更新：补齐时间表达、重复事件、检索与时间轴视图。

### 新增

- **事件备注** — 事件支持多行备注（`description`），表单可填写，详情弹窗展示
- **时间范围** — 事件支持开始/结束时间（`end_time`），表单校验「结束时间不能早于开始时间」
- **全天事件** — 新增 `all_day`，开启后自动清空时间，日视图置顶展示
- **重复事件**
  - 支持「每天 / 每周 / 每月 / 每年」重复，可指定重复结束日期
  - 编辑/删除支持「仅此事件 / 整个系列」两种范围（`scope=single|series`）
  - 视图上以 🔄 图标标识重复事件
- **搜索 / 筛选** — 新增搜索弹窗 `SearchSheet`，支持关键字（标题或备注）、日期范围、颜色、完成状态组合查询；结果可一键跳转到对应日期并打开详情，也可直接勾选完成
- **日视图时间刻度轴** — 日视图改为 24 小时刻度轴布局：事件按开始时间定位，方块高度对应时间范围；全天或未设置时间的事件置顶显示；含当前时间红线、自动滚动到首个事件；时间重叠时以泳道并排兜底

### 改进

- **月/周视图事件条不再显示时间**，仅保留标题与重复标记，版面更清爽
- 新增时间 / 重复相关工具函数（`formatEventTime`、`getRecurrenceLabel`、`RECURRENCE_OPTIONS`、`isValidTime`）
- README 功能概览与项目结构说明同步更新

### 升级说明

- 需配合后端 **V1.1.0**：依赖 `/api/events/search` 接口，以及事件新增字段 `description / end_time / all_day / recurrence / recurrence_end / recurrence_group`
- 重复规则暂不支持编辑时变更，如需调整请删除后重建
- 搜索接口不参与本地缓存，每次查询均请求服务端

## [V1.0.2] - 2026-09-11

### 新增

- **手动刷新** — 顶部工具栏新增刷新按钮，绕过本地缓存直连服务端拉取当前视图事件；刷新中图标持续旋转，成功后提示「刷新成功」，失败则回退缓存数据并提示「刷新失败，显示缓存数据」

### 改进

- 缓存新增 `forceRefresh` 参数：`getMonthEvents` / `getWeekEvents` / `getDayEvents` 可按需跳过缓存直连服务端
- 周视图事件标题完整换行显示（移除行数限制，超长标题不再被截断）

## [V1.0.1] - 2026-09-08

### 修复

- **周 / 日视图事件卡片配色统一** — 事件卡片改为整块背景填充事件颜色（原为左侧色条），文字与图标改为白色，深色标签下更清晰
- **周视图日期列布局** — 调整日期列最小高度，避免当天内容较少时列高塌陷

## [V1.0.0] - 2026-09-05

首个发布版本。

### 功能

- 月 / 周 / 日三视图，底部标签切换，支持前后翻页、回到今天
- 农历、二十四节气、法定节假日与调休标注
- 事件管理：创建、编辑、删除、标记完成、颜色标记
- 事件详情底部抽屉，支持编辑 / 删除 / 标记完成
- Excel 导入导出（保留事件颜色与删除线）
- 登录认证与「记住我」，Session Cookie 安全存储
- 动态服务器地址配置与连接测试
- 个人信息：修改显示名称、修改密码
- 多用户隔离
- 离线缓存：缓存优先，请求失败自动降级到本地缓存并在界面提示
