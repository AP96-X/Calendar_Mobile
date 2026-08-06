# 日历移动端 (Calendar Mobile)

基于 React Native + Expo 的日历移动应用，与 [Calendar App](https://github.com/AP96-X/Calendar) 后端 API 对接，支持事件管理、农历节气显示、节假日调休标注、Excel 导入导出。

![React Native](https://img.shields.io/badge/React_Native-0.86-61dafb)
![Expo](https://img.shields.io/badge/Expo-57-000020)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178c6)
![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20iOS-green)

## 功能概览

### 日历核心

- **月/周/日三视图** — 底部标签切换，支持前后翻页、回到今天
- **农历 + 二十四节气** — 后端天文计算，移动端展示
- **法定节假日 & 调休** — 假期与补班自动标注
- **事件管理** — 创建、编辑、删除、标记完成、颜色标记
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
    │   ├── DayView.tsx            # 日视图（事件列表）
    │   ├── EventFormSheet.tsx     # 事件新增/编辑底部表单
    │   └── EventDetailSheet.tsx   # 事件详情底部抽屉
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
| 日视图 | 事件列表展示，点击事件编辑/删除，底部添加按钮创建事件 |

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
| `/api/events` | GET/POST | 查询/创建事件 |
| `/api/events/<id>` | PUT/DELETE | 更新/删除事件 |
| `/api/events/<id>/toggle` | POST | 切换完成状态 |
| `/api/events/day` | GET | 某天事件 |
| `/api/events/week` | GET | 某周事件 |
| `/api/events/export` | GET | 导出 Excel（支持 year/month 参数和 all=1 全部导出） |
| `/api/events/import` | POST | 从 Excel 导入 |
| `/api/calendar-meta` | GET | 日历元数据 |
| `/api/profile` | GET/PUT | 个人信息 |
| `/api/profile/password` | PUT | 修改密码 |

## 构建发布

### Android

```bash
# 使用 EAS Build
npm install -g eas-cli
eas build --platform android

# 或本地构建
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
```

### iOS

```bash
# 使用 EAS Build
eas build --platform ios

# 或本地构建（需 macOS）
npx expo prebuild --platform ios
cd ios
pod install
# 使用 Xcode 打开 .xcworkspace 构建归档
```

## 系统要求

Android 8.0+ / iOS 13.0+

## 许可证

MIT
