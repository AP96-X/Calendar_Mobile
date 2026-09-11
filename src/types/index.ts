// ========== Auth Types ==========
export interface UserInfo {
  logged_in: boolean;
  user_id: number;
  username: string;
  display_name: string;
  role: 'admin' | 'user';
}

export interface LoginParams {
  username: string;
  password: string;
  remember?: boolean;
}

// ========== Event Types ==========
/** 重复规则：'' = 不重复 */
export type RecurrenceRule = '' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface CalendarEvent {
  id: number;
  title: string;
  date: string; // YYYY-MM-DD
  time: string | null; // HH:MM or null
  end_time?: string | null; // HH:MM，可选结束时间
  all_day?: boolean; // 全天事件
  description?: string; // 备注
  color: string;
  completed: boolean; // backend returns bool
  recurrence?: RecurrenceRule; // 重复规则
  recurrence_end?: string | null; // 重复结束日期 YYYY-MM-DD
  recurrence_group?: string | null; // 同一重复系列的共享 id
  created_at?: string;
  updated_at?: string;
}

export interface EventInput {
  title: string;
  date: string;
  time?: string | null;
  end_time?: string | null;
  all_day?: boolean;
  description?: string;
  color?: string;
  completed?: boolean;
  recurrence?: RecurrenceRule;
  recurrence_end?: string | null;
}

/** 重复事件的修改/删除范围：single = 仅此事件，series = 整个系列 */
export type EventUpdateScope = 'single' | 'series';

/** 事件搜索/筛选参数（对应后端 GET /api/events/search） */
export interface EventSearchParams {
  q?: string;
  start?: string;
  end?: string;
  color?: string;
  completed?: '0' | '1';
  limit?: number;
}

// Events returned as a map: { 'YYYY-MM-DD': CalendarEvent[] }
export type EventsByDate = Record<string, CalendarEvent[]>;

// ========== Calendar Meta Types ==========
export interface DayMeta {
  lunar: string;
  holiday: string | null;
  solar_term: string;
  is_holiday: boolean;
  is_workday: boolean;
  is_weekend: boolean;
  is_adjust_work: boolean;
  adjust_for: string | null;
}

export type CalendarMeta = Record<string, DayMeta>;

export interface MetaStatus {
  year: number;
  month: number;
  cached: boolean;
  days_cached: number;
  updated_at: string;
}

// ========== User Management Types ==========
export interface User {
  id: number;
  username: string;
  display_name: string;
  role: 'admin' | 'user';
  enabled: boolean; // backend returns bool
  created_at: string;
  updated_at?: string;
}

// ========== Profile Types ==========
export interface Profile {
  username: string;
  display_name: string;
  role: 'admin' | 'user';
  created_at: string;
}

// ========== Audit Types ==========
export interface AuditLog {
  id: number;
  admin: string;
  action: string;
  target: string;
  details: string;
  created_at: string;
}

export interface LoginLog {
  id: number;
  username: string;
  ip_address: string;
  attempted_at: string;
  success: boolean; // backend returns bool
}

// ========== API Response ==========
export interface ApiResponse<T = unknown> {
  success?: boolean;
  error?: string;
  code?: string;
  message?: string;
  [key: string]: unknown;
}
