import React, { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import MonthView from '../components/MonthView';
import WeekView from '../components/WeekView';
import DayView from '../components/DayView';
import EventDetailSheet from '../components/EventDetailSheet';
import EventFormSheet from '../components/EventFormSheet';
import { eventsApi } from '../api/events';
import { calendarApi } from '../api/calendar';
import { getTodayStr, getMonthLabel, getWeekLabel, getDayLabel, getWeekDates, getISOWeekNumber } from '../utils/calendar';
import type { EventsByDate, CalendarMeta, CalendarEvent } from '../types';
import { colors } from '../theme/colors';
import { spacing, fontSize, radius } from '../theme/spacing';

type ViewMode = 'month' | 'week' | 'day';

/** 单页参数：月视图用 year/month，周/日视图用 date */
interface PageParam {
  year?: number;
  month?: number;
  date?: string;
}

export default function CalendarScreen() {
  const now = useMemo(() => dayjs(), []);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentYear, setCurrentYear] = useState(now.year());
  const [currentMonth, setCurrentMonth] = useState(now.month() + 1);
  const [selectedDate, setSelectedDate] = useState(getTodayStr());

  const [eventsData, setEventsData] = useState<EventsByDate>({});
  const [calendarMeta, setCalendarMeta] = useState<CalendarMeta>({});
  const [usingCache, setUsingCache] = useState(false);

  // Event form/detail sheet state
  const [formVisible, setFormVisible] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [formDefaultDate, setFormDefaultDate] = useState(getTodayStr());

  // Event detail sheet state
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null);

  // ===== 三页分页 ScrollView =====
  const [pageWidth, setPageWidth] = useState(Dimensions.get('window').width);
  const scrollRef = useRef<ScrollView>(null);
  const isProgrammaticScroll = useRef(false);
  const isNavigatingRef = useRef(false);
  /** 递增 key，强制 ScrollView 重挂载以同步重置滚动位置（消除闪烁） */
  const [scrollKey, setScrollKey] = useState(0);

  // ===== 当前显示页索引（0=上一页, 1=当前页, 2=下一页）— 用于滑动中实时更新头部 =====
  const displayedPageRef = useRef(1);
  const [displayedPageIndex, setDisplayedPageIndex] = useState(1);

  // ===== 切换提示 toast =====
  const [toastText, setToastText] = useState('');
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const toastScale = useRef(new Animated.Value(0.8)).current;

  /** 显示切换提示，1 秒后自动消失 */
  const showToast = useCallback((text: string) => {
    setToastText(text);
    toastScale.setValue(0.8);
    Animated.parallel([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(toastScale, {
        toValue: 1,
        friction: 6,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();

    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 1000);
  }, [toastOpacity, toastScale]);

  // ===== 三页周期参数（prev / current / next）=====
  const pageParams = useMemo((): PageParam[] => {
    if (viewMode === 'month') {
      const base = dayjs(`${currentYear}-${String(currentMonth).padStart(2, '0')}-01`);
      const prev = base.subtract(1, 'month');
      const next = base.add(1, 'month');
      return [
        { year: prev.year(), month: prev.month() + 1 },
        { year: currentYear, month: currentMonth },
        { year: next.year(), month: next.month() + 1 },
      ];
    }
    if (viewMode === 'week') {
      const base = dayjs(selectedDate);
      return [
        { date: base.subtract(7, 'day').format('YYYY-MM-DD') },
        { date: selectedDate },
        { date: base.add(7, 'day').format('YYYY-MM-DD') },
      ];
    }
    // day
    const base = dayjs(selectedDate);
    return [
      { date: base.subtract(1, 'day').format('YYYY-MM-DD') },
      { date: selectedDate },
      { date: base.add(1, 'day').format('YYYY-MM-DD') },
    ];
  }, [viewMode, currentYear, currentMonth, selectedDate]);

  // ===== 数据获取（覆盖三页）=====
  const neededMonths = useMemo(() => {
    const months = new Set<string>();
    if (viewMode === 'month') {
      // 三个月的 grid 可能跨越五个月（首尾行包含相邻月日期）
      const base = dayjs(`${currentYear}-${String(currentMonth).padStart(2, '0')}-01`);
      for (let i = -2; i <= 2; i++) {
        const m = base.add(i, 'month');
        months.add(`${m.year()}-${String(m.month() + 1).padStart(2, '0')}`);
      }
    } else if (viewMode === 'week') {
      pageParams.forEach((p) => {
        getWeekDates(p.date!).forEach((d) => {
          const dj = dayjs(d);
          months.add(`${dj.year()}-${String(dj.month() + 1).padStart(2, '0')}`);
        });
      });
    } else {
      pageParams.forEach((p) => {
        const dj = dayjs(p.date!);
        months.add(`${dj.year()}-${String(dj.month() + 1).padStart(2, '0')}`);
      });
    }
    return months;
  }, [viewMode, currentYear, currentMonth, pageParams]);

  const fetchMeta = useCallback(async () => {
    // 并行获取所有需要的月份元数据
    const entries = Array.from(neededMonths);
    const results = await Promise.all(
      entries.map(async (ym) => {
        const [y, m] = ym.split('-').map(Number);
        try {
          return await calendarApi.getMeta(y, m);
        } catch {
          return null;
        }
      })
    );
    const newMeta: CalendarMeta = {};
    for (const r of results) {
      if (r) Object.assign(newMeta, r.data);
    }
    // 增量合并：保留已有元数据，只更新/新增当前需要的月份
    setCalendarMeta((prev) => ({ ...prev, ...newMeta }));
  }, [neededMonths]);

  const fetchEvents = useCallback(async () => {
    try {
      // 并行获取三页事件数据（prev / current / next）
      const results = await Promise.all(
        pageParams.map((p) => {
          if (viewMode === 'month') {
            return eventsApi.getMonthEvents(p.year!, p.month!);
          }
          if (viewMode === 'week') {
            return eventsApi.getWeekEvents(p.date!);
          }
          // day — 转换为 EventsByDate 格式
          return eventsApi.getDayEvents(p.date!).then((res) => ({
            data: res.data.length > 0 ? { [p.date!]: res.data } : {},
            fromCache: res.fromCache,
          }));
        })
      );

      // 增量合并：保留已有数据，只更新当前三页
      const newData: EventsByDate = {};
      let anyFromCache = false;
      for (const r of results) {
        Object.assign(newData, r.data);
        if (r.fromCache) anyFromCache = true;
      }

      setEventsData((prev) => ({ ...prev, ...newData }));
      setUsingCache(anyFromCache);
    } catch {
      // handled by interceptor
    }
  }, [viewMode, pageParams]);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // ===== 计算切换提示文本 =====
  const getNavigateToast = useCallback((delta: number): string => {
    if (viewMode === 'month') {
      const d = dayjs(`${currentYear}-${String(currentMonth).padStart(2, '0')}-01`).add(delta, 'month');
      return `${d.year()}年${d.month() + 1}月`;
    } else if (viewMode === 'week') {
      const newDate = dayjs(selectedDate).add(delta * 7, 'day');
      const weekNum = getISOWeekNumber(newDate.toDate());
      return `第${weekNum}周`;
    } else {
      const newDate = dayjs(selectedDate).add(delta, 'day');
      const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
      return `${newDate.month() + 1}月${newDate.date()}日 星期${weekdays[newDate.day()]}`;
    }
  }, [viewMode, currentYear, currentMonth, selectedDate]);

  // ===== 核心导航：更新日期 + 重挂载 ScrollView =====
  const updatePeriodAndReset = useCallback((delta: number) => {
    setUsingCache(false);
    setDisplayedPageIndex(1);
    displayedPageRef.current = 1;

    if (viewMode === 'month') {
      const d = dayjs(`${currentYear}-${String(currentMonth).padStart(2, '0')}-01`).add(delta, 'month');
      setCurrentYear(d.year());
      setCurrentMonth(d.month() + 1);
    } else if (viewMode === 'week') {
      setSelectedDate((prev) => dayjs(prev).add(delta * 7, 'day').format('YYYY-MM-DD'));
    } else {
      setSelectedDate((prev) => dayjs(prev).add(delta, 'day').format('YYYY-MM-DD'));
    }
    // 递增 key 触发 ScrollView 重挂载，新实例通过 contentOffset 直接从中间页开始
    setScrollKey((k) => k + 1);
  }, [viewMode, currentYear, currentMonth]);

  // ===== 滑动中实时更新头部日期 + 提示（不等动画结束）=====
  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isProgrammaticScroll.current || isNavigatingRef.current) return;

    const offsetX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(offsetX / pageWidth);

    if (pageIndex !== displayedPageRef.current) {
      displayedPageRef.current = pageIndex;
      setDisplayedPageIndex(pageIndex);
      // 越过中点时立即显示提示
      if (pageIndex !== 1 && pageIndex >= 0 && pageIndex <= 2) {
        showToast(getNavigateToast(pageIndex - 1));
      }
    }
  }, [pageWidth, showToast, getNavigateToast]);

  // ===== 用户滑动结束 → 检测页面变化 =====
  const onMomentumScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isProgrammaticScroll.current || isNavigatingRef.current) return;

    const offsetX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(offsetX / pageWidth);

    if (pageIndex === 1) return; // 仍在当前页，无需切换

    isNavigatingRef.current = true;
    updatePeriodAndReset(pageIndex - 1);
  }, [pageWidth, updatePeriodAndReset]);

  // ===== 头部按钮导航（带滑动动画）=====
  const navigate = useCallback((delta: number) => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;

    // 立即更新头部日期 + 显示提示（不等动画结束）
    displayedPageRef.current = 1 + delta;
    setDisplayedPageIndex(1 + delta);
    showToast(getNavigateToast(delta));

    // 动画滑动到相邻页
    isProgrammaticScroll.current = true;
    scrollRef.current?.scrollTo({ x: (1 + delta) * pageWidth, animated: true });

    // 动画结束后更新状态并重置到中间页
    setTimeout(() => {
      isProgrammaticScroll.current = false;
      updatePeriodAndReset(delta);
    }, 350);
  }, [pageWidth, updatePeriodAndReset, showToast, getNavigateToast]);

  // ===== 回到今天 =====
  const goToday = useCallback(() => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;

    const today = dayjs();
    setUsingCache(false);
    setDisplayedPageIndex(1);
    displayedPageRef.current = 1;
    setCurrentYear(today.year());
    setCurrentMonth(today.month() + 1);
    setSelectedDate(today.format('YYYY-MM-DD'));

    showToast('今天');
    setScrollKey((k) => k + 1);
  }, [showToast]);

  // ===== 视图模式切换 / 页面宽度变化时重置显示页 =====
  useLayoutEffect(() => {
    displayedPageRef.current = 1;
    setDisplayedPageIndex(1);
  }, [viewMode]);

  // ===== ScrollView 重挂载后释放导航锁 =====
  useLayoutEffect(() => {
    isNavigatingRef.current = false;
    isProgrammaticScroll.current = false;
  }, [scrollKey, viewMode]);

  // View switching
  const switchToWeekView = useCallback((date: string) => {
    setSelectedDate(date);
    setViewMode('week');
  }, []);

  const switchToDayView = useCallback((date: string) => {
    setSelectedDate(date);
    setViewMode('day');
  }, []);

  // Event handlers
  const handleDayPress = useCallback((date: string) => {
    setFormMode('add');
    setEditingEvent(null);
    setFormDefaultDate(date);
    setFormVisible(true);
  }, []);

  const handleEventPress = useCallback((event: CalendarEvent) => {
    setDetailEvent(event);
    setDetailVisible(true);
  }, []);

  const handleEditFromDetail = useCallback((event: CalendarEvent) => {
    setFormMode('edit');
    setEditingEvent(event);
    setFormDefaultDate(event.date);
    setFormVisible(true);
  }, []);

  const handleEventToggle = useCallback(async (eventId: number) => {
    try {
      await eventsApi.toggle(eventId);
      await fetchEvents();
    } catch {
      // handled by interceptor
    }
  }, [fetchEvents]);

  const handleEventDelete = useCallback(async (eventId: number) => {
    try {
      await eventsApi.delete(eventId);
      await fetchEvents();
    } catch {
      // handled by interceptor
    }
  }, [fetchEvents]);

  const handleAddEvent = useCallback(() => {
    // 月视图没有“选中某天”的概念：若正在浏览当月则默认添加到今天；
    // 浏览其它月份时加到该月 1 号，避免用“今天”的日号拼出非法日期（如 02-31）。
    const date = viewMode === 'month'
      ? (now.year() === currentYear && now.month() + 1 === currentMonth
          ? getTodayStr()
          : `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`)
      : selectedDate;
    handleDayPress(date);
  }, [viewMode, currentYear, currentMonth, selectedDate, now, handleDayPress]);

  // Date label — 基于当前显示页（滑动中实时更新，无滞后）
  const dateLabel = useMemo(() => {
    const params = pageParams[displayedPageIndex] || pageParams[1];
    if (viewMode === 'month') return getMonthLabel(params.year!, params.month!);
    if (viewMode === 'week') return getWeekLabel(params.date!);
    return getDayLabel(params.date!);
  }, [displayedPageIndex, pageParams, viewMode]);

  // ===== 渲染单页 =====
  const renderPage = (pageIndex: number) => {
    const params = pageParams[pageIndex];

    if (viewMode === 'month') {
      return (
        <View style={{ width: pageWidth }} key={`page-${pageIndex}`}>
          <MonthView
            year={params.year!}
            month={params.month!}
            eventsData={eventsData}
            calendarMeta={calendarMeta}
            onDayPress={handleDayPress}
            onDayNumberPress={switchToDayView}
            onEventPress={handleEventPress}
            onMorePress={switchToDayView}
            onWeekNumPress={switchToWeekView}
          />
        </View>
      );
    }

    if (viewMode === 'week') {
      return (
        <View style={{ width: pageWidth }} key={`page-${pageIndex}`}>
          <WeekView
            selectedDate={params.date!}
            eventsData={eventsData}
            calendarMeta={calendarMeta}
            onDayPress={handleDayPress}
            onEventPress={handleEventPress}
            onDayHeaderPress={switchToDayView}
          />
        </View>
      );
    }

    // day
    const dayEvents = eventsData[params.date!] || [];
    return (
      <View style={{ width: pageWidth }} key={`page-${pageIndex}`}>
        <DayView
          selectedDate={params.date!}
          events={dayEvents}
          meta={calendarMeta[params.date!]}
          onEventPress={handleEventPress}
          onEventToggle={handleEventToggle}
          onAddEvent={handleDayPress}
          onDeleteEvent={handleEventDelete}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigate(-1)} style={styles.navButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.dateLabel} numberOfLines={1}>{dateLabel}</Text>
          <TouchableOpacity onPress={goToday} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <View style={styles.todayBadge}>
              <Text style={styles.todayBadgeText}>今天</Text>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigate(1)} style={styles.navButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialCommunityIcons name="chevron-right" size={28} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* View mode switcher */}
      <View style={styles.switcherRow}>
        {(['month', 'week', 'day'] as ViewMode[]).map((mode) => (
          <TouchableOpacity
            key={mode}
            onPress={() => setViewMode(mode)}
            style={[styles.switcherBtn, viewMode === mode && styles.switcherBtnActive]}
          >
            <Text style={[styles.switcherText, viewMode === mode && styles.switcherTextActive]}>
              {mode === 'month' ? '月视图' : mode === 'week' ? '周视图' : '日视图'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Offline cache indicator */}
      {usingCache && (
        <View style={styles.cacheBar}>
          <MaterialCommunityIcons name="cloud-off-outline" size={14} color={colors.warning} />
          <Text style={styles.cacheText}>离线模式 · 显示缓存数据</Text>
        </View>
      )}

      {/* 三页分页 ScrollView — 内容跟随手指，类似手机桌面左右滑动 */}
      <ScrollView
        key={`${viewMode}-${scrollKey}`}
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
        contentOffset={{ x: pageWidth, y: 0 }}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w !== pageWidth) setPageWidth(w);
        }}
        style={styles.contentContainer}
      >
        {renderPage(0)}
        {renderPage(1)}
        {renderPage(2)}
      </ScrollView>

      {/* 切换提示 toast */}
      <View style={styles.toastContainer} pointerEvents="none">
        <Animated.View
          style={[
            styles.toast,
            {
              opacity: toastOpacity,
              transform: [{ scale: toastScale }],
            },
          ]}
        >
          <Text style={styles.toastText}>{toastText}</Text>
        </Animated.View>
      </View>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={handleAddEvent} activeOpacity={0.8}>
        <MaterialCommunityIcons name="plus" size={28} color={colors.textInverse} />
      </TouchableOpacity>

      {/* Event Detail Sheet */}
      <EventDetailSheet
        visible={detailVisible}
        event={detailEvent}
        onClose={() => setDetailVisible(false)}
        onEdit={handleEditFromDetail}
        onDelete={handleEventDelete}
        onToggleComplete={handleEventToggle}
      />

      {/* Event Form Sheet */}
      <EventFormSheet
        visible={formVisible}
        mode={formMode}
        event={editingEvent}
        defaultDate={formDefaultDate}
        onClose={() => setFormVisible(false)}
        onSaved={fetchEvents}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  navButton: {
    padding: spacing.xs,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    justifyContent: 'center',
  },
  dateLabel: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    maxWidth: 220,
  },
  todayBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.round,
    backgroundColor: colors.primary,
  },
  todayBadgeText: {
    fontSize: fontSize.sm,
    color: colors.textInverse,
    fontWeight: '500',
  },
  switcherRow: {
    flexDirection: 'row',
    backgroundColor: colors.bgSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  switcherBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  switcherBtnActive: {
    backgroundColor: colors.primary,
  },
  switcherText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  switcherTextActive: {
    color: colors.textInverse,
    fontWeight: '600',
  },
  cacheBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    backgroundColor: '#FEF3C7',
    gap: spacing.xs,
  },
  cacheText: {
    fontSize: fontSize.sm,
    color: '#D97706',
    fontWeight: '500',
  },
  contentContainer: {
    flex: 1,
  },
  // ===== Toast =====
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  toast: {
    backgroundColor: 'rgba(26, 26, 46, 0.85)',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
