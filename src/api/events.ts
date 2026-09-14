import client from './client';
import type {
  CalendarEvent,
  EventInput,
  EventUpdateScope,
  EventSearchParams,
  EventsByDate,
  ApiResponse,
} from '../types';
import { fetchWithCache, invalidateCache } from '../utils/cache';
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
  // 先让进行中的请求结果失效，再删除已写入的缓存
  invalidateCache();
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
  /** 获取月视图事件（带缓存；forceRefresh=true 时绕过缓存直接请求服务端） */
  getMonthEvents(
    year: number,
    month: number,
    forceRefresh = false,
  ): Promise<{ data: EventsByDate; fromCache: boolean }> {
    const key = `events_month_${year}-${String(month).padStart(2, '0')}`;
    return fetchWithCache(
      key,
      () => client
        .get<CalendarEvent[]>('/api/events', { params: { year, month } })
        .then((r) => toEventsByDate(r.data)),
      EVENTS_TTL,
      forceRefresh,
    );
  },

  /** 获取周视图事件（带缓存；forceRefresh=true 时绕过缓存直接请求服务端） */
  getWeekEvents(
    date: string,
    forceRefresh = false,
  ): Promise<{ data: EventsByDate; fromCache: boolean }> {
    const key = `events_week_${date}`;
    return fetchWithCache(
      key,
      () => client
        .get<CalendarEvent[]>('/api/events/week', { params: { date } })
        .then((r) => toEventsByDate(r.data)),
      EVENTS_TTL,
      forceRefresh,
    );
  },

  /** 获取日视图事件（带缓存；forceRefresh=true 时绕过缓存直接请求服务端） */
  getDayEvents(
    date: string,
    forceRefresh = false,
  ): Promise<{ data: CalendarEvent[]; fromCache: boolean }> {
    const key = `events_day_${date}`;
    return fetchWithCache(
      key,
      () => client.get('/api/events/day', { params: { date } }).then((r) => r.data as CalendarEvent[]),
      EVENTS_TTL,
      forceRefresh,
    );
  },

  async create(data: EventInput): Promise<CalendarEvent & ApiResponse> {
    // 请求成功后再清空事件缓存：既保证之后读到最新数据，
    // 又避免「缓存已清、请求还在途中」时被并发的 GET 把旧数据写回
    const r = await client.post('/api/events', data);
    await clearAllEventCache();
    return r.data;
  },

  async update(id: number, data: Partial<EventInput>, scope: EventUpdateScope = 'single'): Promise<ApiResponse> {
    // 日期可能变更，无法确定旧日期对应的缓存 key，统一清空事件缓存
    const r = await client.put(`/api/events/${id}`, { ...data, scope });
    await clearAllEventCache();
    return r.data;
  },

  async toggle(id: number): Promise<{ completed: boolean }> {
    // 这里拿不到事件日期，统一清空事件缓存
    const r = await client.post(`/api/events/${id}/toggle`);
    await clearAllEventCache();
    return r.data;
  },

  async delete(id: number, scope: EventUpdateScope = 'single'): Promise<ApiResponse> {
    // 不确定事件属于哪天，统一清空事件缓存。
    // 放在请求成功之后：避免请求在途时并发的 GET 把「删除前」的数据写回已清空的缓存
    const r = await client.delete(`/api/events/${id}`, { params: { scope } });
    await clearAllEventCache();
    return r.data;
  },

  /** 搜索 / 筛选事件（不走缓存，始终查询服务端最新数据） */
  search(params: EventSearchParams): Promise<CalendarEvent[]> {
    return client.get<CalendarEvent[]>('/api/events/search', { params }).then((r) => r.data);
  },

  /** Import events from an Excel file (uses expo-document-picker result) */
  async importExcel(uri: string, fileName: string): Promise<ApiResponse> {
    // 导入会批量新增/覆盖事件，请求成功后再清空事件缓存
    const formData = new FormData();
    formData.append('file', {
      uri,
      name: fileName,
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    } as unknown as File);
    const r = await client.post('/api/events/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    await clearAllEventCache();
    return r.data;
  },

  /** 获取当前用户有事件数据的年份列表 */
  getAvailableYears(): Promise<{ years: number[] }> {
    return client.get('/api/events/years').then((r) => r.data);
  },
};
