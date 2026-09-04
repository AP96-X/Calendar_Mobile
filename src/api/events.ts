import client from './client';
import type { CalendarEvent, EventInput, EventsByDate, ApiResponse } from '../types';
import { fetchWithCache } from '../utils/cache';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Convert a flat event array to a date-keyed map */
function toEventsByDate(events: CalendarEvent[]): EventsByDate {
  const map: EventsByDate = {};
  for (const e of events) {
    if (!map[e.date]) map[e.date] = [];
    map[e.date].push(e);
  }
  return map;
}

/** 事件缓存 TTL：30 分钟（事件数据较动态，用户可能随时增删改） */
const EVENTS_TTL = 30 * 60 * 1000;

/** 清除所有事件相关缓存（保留日历元数据缓存）。
 *  缓存策略是“缓存优先”，若增删改后不清缓存，下次读取会命中旧数据，
 *  因此所有变更操作统一清空事件缓存。 */
async function clearAllEventCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const eventKeys = keys.filter((k) =>
      k.startsWith('calendar_cache_events_')
    );
    if (eventKeys.length > 0) {
      await AsyncStorage.multiRemove(eventKeys);
    }
  } catch {
    // ignore
  }
}

export const eventsApi = {
  /** 获取月视图事件（带缓存） */
  getMonthEvents(year: number, month: number): Promise<{ data: EventsByDate; fromCache: boolean }> {
    const key = `events_month_${year}-${String(month).padStart(2, '0')}`;
    return fetchWithCache(
      key,
      () => client
        .get<CalendarEvent[]>('/api/events', { params: { year, month } })
        .then((r) => toEventsByDate(r.data)),
      EVENTS_TTL,
    );
  },

  /** 获取周视图事件（带缓存） */
  getWeekEvents(date: string): Promise<{ data: EventsByDate; fromCache: boolean }> {
    const key = `events_week_${date}`;
    return fetchWithCache(
      key,
      () => client
        .get<CalendarEvent[]>('/api/events/week', { params: { date } })
        .then((r) => toEventsByDate(r.data)),
      EVENTS_TTL,
    );
  },

  /** 获取日视图事件（带缓存） */
  getDayEvents(date: string): Promise<{ data: CalendarEvent[]; fromCache: boolean }> {
    const key = `events_day_${date}`;
    return fetchWithCache(
      key,
      () => client.get('/api/events/day', { params: { date } }).then((r) => r.data as CalendarEvent[]),
      EVENTS_TTL,
    );
  },

  create(data: EventInput): Promise<CalendarEvent & ApiResponse> {
    // 先清空事件缓存再请求，保证缓存优先策略下之后读取到最新数据
    return clearAllEventCache().then(() =>
      client.post('/api/events', data).then((r) => r.data)
    );
  },

  update(id: number, data: Partial<EventInput>): Promise<ApiResponse> {
    // 日期可能变更，无法确定旧日期对应的缓存 key，统一清空事件缓存
    return clearAllEventCache().then(() =>
      client.put(`/api/events/${id}`, data).then((r) => r.data)
    );
  },

  toggle(id: number): Promise<{ completed: boolean }> {
    // 这里拿不到事件日期，统一清空事件缓存
    return clearAllEventCache().then(() =>
      client.post(`/api/events/${id}/toggle`).then((r) => r.data)
    );
  },

  delete(id: number): Promise<ApiResponse> {
    // 不确定事件属于哪天，统一清空事件缓存
    return clearAllEventCache().then(() =>
      client.delete(`/api/events/${id}`).then((r) => r.data)
    );
  },

  /** Import events from an Excel file (uses expo-document-picker result) */
  importExcel(uri: string, fileName: string): Promise<ApiResponse> {
    // 导入会批量新增/覆盖事件，先清空事件缓存
    const formData = new FormData();
    formData.append('file', {
      uri,
      name: fileName,
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    } as unknown as File);
    return clearAllEventCache().then(() =>
      client
        .post('/api/events/import', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data)
    );
  },

  /** 获取当前用户有事件数据的年份列表 */
  getAvailableYears(): Promise<{ years: number[] }> {
    return client.get('/api/events/years').then((r) => r.data);
  },
};
