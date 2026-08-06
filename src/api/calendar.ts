import client from './client';
import type { CalendarMeta, MetaStatus, ApiResponse } from '../types';
import { fetchWithCache } from '../utils/cache';

/** 日历元数据缓存 TTL：7 天（农历/节假日数据极少变化） */
const META_TTL = 7 * 24 * 60 * 60 * 1000;

export const calendarApi = {
  /** 获取日历元数据（带缓存，TTL 7 天） */
  getMeta(year: number, month: number): Promise<{ data: CalendarMeta; fromCache: boolean }> {
    const key = `meta_${year}-${String(month).padStart(2, '0')}`;
    return fetchWithCache(
      key,
      () => client.get('/api/calendar-meta', { params: { year, month } }).then((r) => r.data as CalendarMeta),
      META_TTL,
    );
  },

  refresh(year: number, month: number): Promise<ApiResponse> {
    return client.post('/api/calendar-meta/refresh', { year, month }).then((r) => r.data);
  },

  getStatus(year: number, month: number): Promise<MetaStatus> {
    return client.get('/api/calendar-meta/status', { params: { year, month } }).then((r) => r.data);
  },
};
