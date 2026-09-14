import client from './client';
import type {
  CalendarEvent,
  EventInput,
  EventUpdateScope,
  EventSearchParams,
  EventsByDate,
  ApiResponse,
  RecurrenceRule,
} from '../types';
import { fetchWithCache, clearEventCache } from '../utils/cache';

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
const clearAllEventCache = clearEventCache;

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

  /** 找到重复系列的最早实例日期（用于重建系列时锚定起始日）。
   *  后端没有「按 recurrence_group 查询」的接口，这里用标题搜索再按 group 过滤兜底。 */
  async findSeriesStartDate(event: CalendarEvent): Promise<string> {
    if (!event.recurrence_group) return event.date;
    try {
      const list = await eventsApi.search({ q: event.title, limit: 1000 });
      const dates = list
        .filter((e) => e.recurrence_group === event.recurrence_group)
        .map((e) => e.date)
        .sort();
      return dates[0] || event.date;
    } catch {
      return event.date;
    }
  },

  /** 重建重复系列：删除原系列/事件后按新规则重新创建。
   *
   *  后端 PUT 只更新字段、不会重新生成实例，因此「修改重复规则」无法就地完成；
   *  这里用「删除 + 重建」实现。注意：原实例的完成状态与 id 会丢失。
   *  scope='series' 时以系列最早实例日期为锚点，否则以传入日期为锚点。 */
  async rebuildSeries(
    event: CalendarEvent,
    base: EventInput,
    recurrence: RecurrenceRule,
    recurrenceEnd: string | null,
    scope: EventUpdateScope = 'single',
  ): Promise<CalendarEvent & ApiResponse> {
    const isSeries = !!event.recurrence_group;
    const anchor = isSeries && scope === 'series'
      ? await eventsApi.findSeriesStartDate(event)
      : (base.date || event.date);
    await eventsApi.delete(event.id, isSeries ? scope : 'single');
    const payload: EventInput = {
      ...base,
      date: anchor,
      recurrence,
      recurrence_end: recurrenceEnd || '',
    };
    return eventsApi.create(payload);
  },
};
