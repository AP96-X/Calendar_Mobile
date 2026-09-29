/**
 * 深浅两套调色板。
 *
 * 键名与旧的 `theme/colors.ts` 保持一一对应，便于机械替换；深色取值对齐
 * 后端 Web 端 V1.4.0 的 `--cal-*` CSS 变量（frontend-react/src/styles/global.css），
 * 保证两端观感一致。
 *
 * 约定：
 * - `bg` / `bgSecondary` / `bgTertiary` 是三层「面」：
 *   bg = 卡片 / 网格等抬升面，bgSecondary = 页面底 / 凹陷面，bgTertiary = 更轻的填充。
 * - 事件颜色是用户数据，**不参与主题化**；事件色块上的前景恒为白色（见各组件里的
 *   `#FFFFFF` 字面量），深浅色下都不要改。
 */

export interface Palette {
  // Primary
  primary: string;
  primaryDark: string;
  primaryLight: string;

  // Status
  success: string;
  warning: string;
  danger: string;
  info: string;

  // Background（三层「面」）
  bg: string;
  bgSecondary: string;
  bgTertiary: string;

  // Text
  text: string;
  textSecondary: string;
  textMuted: string;
  /** 主色/事件色之上的前景色，深浅色下都是白色 */
  textInverse: string;

  // Borders
  border: string;
  borderDark: string;

  // Calendar specific
  today: string;
  weekend: string;
  holiday: string;
  workday: string;
  festival: string;
  solarTerm: string;

  // ===== 语义扩展 token（原先散落在各组件里的硬编码浅色）=====
  /** 选中项 / 今天 / 普通角色徽章的高亮底色 */
  highlight: string;
  /** 危险操作（删除等）的浅底色 */
  dangerSoft: string;
  /** 成功状态的浅底色 */
  successSoft: string;
  /** 极淡的主色叠加（如「今天」整列底色） */
  primaryFaint: string;
  /** 警告 / 提示条（如离线缓存提示）的浅底色与文字色 */
  warningSoft: string;
  warningText: string;

  /** 日历徽章：工作 / 休 / 节气 / 节日 */
  badgeWorkBg: string;
  badgeWorkText: string;
  badgeRestBg: string;
  badgeRestText: string;
  badgeTermBg: string;
  badgeTermText: string;
  badgeFestivalBg: string;
  badgeFestivalText: string;

  /** 角色徽章：管理员 */
  roleAdminBg: string;
  roleAdminText: string;

  /** 卡片阴影色（深色下阴影几乎不可见，靠边框区分层次） */
  shadow: string;
}

/** 浅色：与改造前的 colors.ts 完全一致，保证观感不回退 */
export const lightColors: Palette = {
  primary: '#4A90D9',
  primaryDark: '#357ABD',
  primaryLight: '#6BA3E0',

  success: '#27AE60',
  warning: '#F39C12',
  danger: '#E74C3C',
  info: '#00BCD4',

  bg: '#FFFFFF',
  bgSecondary: '#F8FAFC',
  bgTertiary: '#F1F5F9',

  text: '#1A1A2E',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',

  border: '#E5E7EB',
  borderDark: '#D1D5DB',

  today: '#4A90D9',
  weekend: '#E74C3C',
  holiday: '#27AE60',
  workday: '#F39C12',
  festival: '#E67E22',
  solarTerm: '#8E44AD',

  highlight: '#EBF5FF',
  dangerSoft: '#FEF2F2',
  successSoft: '#D1FAE5',
  primaryFaint: 'rgba(74, 144, 217, 0.04)',
  warningSoft: '#FEF3C7',
  warningText: '#D97706',

  badgeWorkBg: '#FEF3C7',
  badgeWorkText: '#D97706',
  badgeRestBg: '#D1FAE5',
  badgeRestText: '#059669',
  badgeTermBg: '#F3E8FF',
  badgeTermText: '#7C3AED',
  badgeFestivalBg: '#FFEDD5',
  badgeFestivalText: '#EA580C',

  roleAdminBg: '#FEF3C7',
  roleAdminText: '#D97706',

  shadow: '#000000',
};

/** 深色：对齐 Web V1.4.0 的 --cal-* 深色取值 */
export const darkColors: Palette = {
  primary: '#5AA0E6',
  primaryDark: '#4A90D9',
  primaryLight: '#7FB4EA',

  success: '#3EC27A',
  warning: '#F08A3C',
  danger: '#FF6B5E',
  info: '#4DD0E1',

  bg: '#171A21',
  bgSecondary: '#0F1115',
  bgTertiary: '#1F242D',

  text: '#E6E8EB',
  textSecondary: '#A1A7B3',
  textMuted: '#6B7280',
  textInverse: '#FFFFFF',

  border: '#2A2F3A',
  borderDark: '#3A4150',

  today: '#5AA0E6',
  weekend: '#FF7B7B',
  holiday: '#3EC27A',
  workday: '#F08A3C',
  festival: '#FFA733',
  solarTerm: '#A78BFA',

  highlight: 'rgba(90, 160, 230, 0.18)',
  dangerSoft: 'rgba(255, 107, 94, 0.16)',
  successSoft: 'rgba(62, 194, 122, 0.18)',
  primaryFaint: 'rgba(90, 160, 230, 0.10)',
  warningSoft: 'rgba(240, 138, 60, 0.18)',
  warningText: '#F0A44A',

  badgeWorkBg: 'rgba(240, 138, 60, 0.18)',
  badgeWorkText: '#F0A44A',
  badgeRestBg: 'rgba(62, 194, 122, 0.18)',
  badgeRestText: '#3EC27A',
  badgeTermBg: 'rgba(167, 139, 250, 0.18)',
  badgeTermText: '#A78BFA',
  badgeFestivalBg: 'rgba(255, 167, 51, 0.18)',
  badgeFestivalText: '#FFA733',

  roleAdminBg: 'rgba(240, 138, 60, 0.18)',
  roleAdminText: '#F0A44A',

  shadow: 'rgba(0, 0, 0, 0.5)',
};
