import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  type LayoutChangeEvent,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import type { CalendarEvent, DayMeta, EventUpdateScope } from '../types';
import {
  getDayLabel,
  getLunarDisplay,
  getDayBadges,
  getBadgePalette,
  isToday,
} from '../utils/calendar';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import type { Palette } from '../theme/palette';
import { spacing, fontSize, radius } from '../theme/spacing';

interface DayViewProps {
  selectedDate: string;
  events: CalendarEvent[];
  meta?: DayMeta;
  onEventPress: (event: CalendarEvent) => void;
  onEventToggle: (eventId: number) => void;
  onAddEvent: (date: string) => void;
  onDeleteEvent: (eventId: number, scope?: EventUpdateScope) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}

const HOUR_HEIGHT = 56; // 每小时对应的像素高度
const MIN_EVENT_HEIGHT = 26; // 事件方块最小高度
const MIN_EVENT_HEIGHT_WITH_NOTE = 46; // 有备注时的最小高度：容纳标题 + 一行备注
// 事件方块内部布局参数（用于按方块高度推算备注可显示的行数）
const EVENT_HEADER_HEIGHT = 16; // 复选 / 时间 / 标题所在行的高度
const EVENT_BLOCK_VPADDING = 6; // eventBlock 上下 padding 之和
const DESC_LINE_HEIGHT = 15; // 备注每行高度
const DESC_MARGIN_TOP = 2; // 备注与标题行的间距
const MIN_DURATION = 30; // 最短显示时长（分钟）
const DEFAULT_DURATION = 60; // 未填结束时间时的默认时长（分钟）
const HOURS = Array.from({ length: 24 }, (_, i) => i);
// 全天 / 未设置时间的事件在时间轴上占用的时段（08:30 ~ 17:30）
const ALL_DAY_START = 8 * 60 + 30;
const ALL_DAY_END = 17 * 60 + 30;

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function hhmm(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function DayViewInner({
  selectedDate,
  events,
  meta,
  onEventPress,
  onEventToggle,
  onAddEvent,
  onDeleteEvent,
  refreshing,
  onRefresh,
}: DayViewProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const lunarInfo = useMemo(() => getLunarDisplay(meta), [meta]);
  const badges = useMemo(() => getDayBadges(meta), [meta]);

  const scrollRef = useRef<ScrollView>(null);
  const [areaWidth, setAreaWidth] = useState(0);

  // 全天 / 未设置时间的事件统一按 08:30~17:30 落到时间轴上；其余按实际时间定位
  const { laidOut, laneCount } = useMemo(() => {
    const items = events
      .map((e) => {
        const allDay = !!e.all_day || !e.time;
        if (allDay) {
          return { ev: e, start: ALL_DAY_START, end: ALL_DAY_END, allDay };
        }
        const start = toMinutes(e.time as string);
        const rawEnd = e.end_time ? toMinutes(e.end_time) : start + DEFAULT_DURATION;
        const end = Math.max(rawEnd, start + MIN_DURATION);
        return { ev: e, start, end, allDay };
      })
      .sort((a, b) => a.start - b.start || a.end - b.end);

    // 正常情况下同一天不会有时间重叠，这里做泳道兜底（数据异常时并排显示而不是叠在一起）
    const laneEnds: number[] = [];
    const laid = items.map((it) => {
      let lane = laneEnds.findIndex((end) => end <= it.start);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(it.end);
      } else {
        laneEnds[lane] = it.end;
      }
      return { ...it, lane };
    });

    return { laidOut: laid, laneCount: Math.max(1, laneEnds.length) };
  }, [events]);

  const firstStart = laidOut.length > 0 ? laidOut[0].start : null;

  // 打开某天时自动滚动到第一个事件（无事件则滚到 08:00 附近）
  useEffect(() => {
    const target = firstStart != null
      ? (firstStart / 60) * HOUR_HEIGHT - 40
      : 8 * HOUR_HEIGHT;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, target), animated: false });
    }, 50);
    return () => clearTimeout(timer);
  }, [selectedDate, firstStart]);

  const onAreaLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setAreaWidth((prev) => (Math.abs(prev - w) > 0.5 ? w : prev));
  }, []);

  const showNowLine = isToday(selectedDate);
  const [now, setNow] = useState(() => dayjs());

  // 当前时间红线每分钟刷新（仅当天显示，否则定时器无意义）
  useEffect(() => {
    if (!showNowLine) return;
    setNow(dayjs());
    const timer = setInterval(() => setNow(dayjs()), 60 * 1000);
    return () => clearInterval(timer);
  }, [showNowLine, selectedDate]);

  const nowTop = ((now.hour() * 60 + now.minute()) / 60) * HOUR_HEIGHT;

  const handleDelete = (ev: CalendarEvent) => {
    if (ev.recurrence_group) {
      Alert.alert(
        '删除重复事件',
        `「${ev.title}」属于重复系列，请选择删除范围`,
        [
          { text: '取消', style: 'cancel' },
          { text: '仅此事件', onPress: () => onDeleteEvent(ev.id, 'single') },
          { text: '整个系列', style: 'destructive', onPress: () => onDeleteEvent(ev.id, 'series') },
        ]
      );
      return;
    }
    Alert.alert(
      '确认删除',
      `确定要删除事件"${ev.title}"吗？`,
      [
        { text: '取消', style: 'cancel' },
        { text: '删除', style: 'destructive', onPress: () => onDeleteEvent(ev.id, 'single') },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.dateLabel}>{getDayLabel(selectedDate)}</Text>
          <View style={styles.metaRow}>
            {lunarInfo.text ? (
              <Text style={styles.lunarText}>{lunarInfo.text}</Text>
            ) : null}
            {badges.map((b, i) => {
              const style = getBadgePalette(b.type, colors);
              return (
                <View key={i} style={[styles.badge, { backgroundColor: style.bg }]}>
                  <Text style={[styles.badgeText, { color: style.color }]}>{b.text}</Text>
                </View>
              );
            })}
          </View>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => onAddEvent(selectedDate)}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="plus" size={16} color={colors.textInverse} />
          <Text style={styles.addBtnText}>添加</Text>
        </TouchableOpacity>
      </View>

      {events.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyState}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} />
            ) : undefined
          }
        >
          <MaterialCommunityIcons name="calendar-blank" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>今日暂无事件</Text>
          <TouchableOpacity
            style={styles.emptyAddBtn}
            onPress={() => onAddEvent(selectedDate)}
          >
            <MaterialCommunityIcons name="plus" size={18} color={colors.textInverse} />
            <Text style={styles.emptyAddText}>添加事件</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <>
          {/* 时间刻度轴 */}
          <ScrollView
            ref={scrollRef}
            style={styles.timeline}
            contentContainerStyle={styles.timelineContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            refreshControl={
              onRefresh ? (
                <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} />
              ) : undefined
            }
          >
            <View style={styles.timelineRow}>
              {/* 刻度列 */}
              <View style={styles.hourColumn}>
                {HOURS.map((h) => (
                  <View key={h} style={styles.hourCell}>
                    <Text style={styles.hourLabel}>{`${String(h).padStart(2, '0')}:00`}</Text>
                  </View>
                ))}
              </View>

              {/* 事件区 */}
              <View style={styles.eventArea} onLayout={onAreaLayout}>
                {HOURS.map((h) => (
                  <View
                    key={h}
                    style={[
                      styles.hourLine,
                      h > 0 && styles.hourLineBorder,
                      h % 2 === 1 && styles.hourLineAlt,
                    ]}
                  />
                ))}

                {/* 当前时间指示线 */}
                {showNowLine ? (
                  <View style={[styles.nowLine, { top: nowTop }]}>
                    <View style={styles.nowDot} />
                  </View>
                ) : null}

                {/* 事件方块 */}
                {laidOut.map(({ ev, start, end, lane, allDay }) => {
                  const laneWidth = areaWidth > 0 ? areaWidth / laneCount : 0;
                  const top = (start / 60) * HOUR_HEIGHT;
                  const height = Math.max(
                    ((end - start) / 60) * HOUR_HEIGHT,
                    ev.description ? MIN_EVENT_HEIGHT_WITH_NOTE : MIN_EVENT_HEIGHT,
                  );
                  const timeLabel = `${hhmm(start)}${allDay || ev.end_time ? `-${hhmm(end)}` : ''}`;
                  // 备注行数随方块高度自适应：方块越高显示越多，超出部分以省略号截断
                  const descLines = Math.max(
                    1,
                    Math.floor(
                      (height - EVENT_HEADER_HEIGHT - EVENT_BLOCK_VPADDING - DESC_MARGIN_TOP)
                        / DESC_LINE_HEIGHT,
                    ),
                  );
                  return (
                    <View
                      key={ev.id}
                      style={[
                        styles.eventSlot,
                        {
                          top,
                          left: lane * laneWidth + 2,
                          width: Math.max(laneWidth - 6, 0),
                          height,
                        },
                      ]}
                    >
                      <TouchableOpacity
                        style={[
                          styles.eventBlock,
                          { backgroundColor: ev.color },
                          ev.completed && styles.eventBlockCompleted,
                        ]}
                        activeOpacity={0.8}
                        onPress={() => onEventPress(ev)}
                      >
                        <View style={styles.eventHeaderRow}>
                          <TouchableOpacity
                            onPress={() => onEventToggle(ev.id)}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <MaterialCommunityIcons
                              name={ev.completed ? 'checkbox-marked' : 'checkbox-blank-outline'}
                              size={15}
                              color="rgba(255,255,255,0.95)"
                            />
                          </TouchableOpacity>
                          <Text style={styles.eventTime} numberOfLines={1}>{timeLabel}</Text>
                          {ev.recurrence ? (
                            <MaterialCommunityIcons name="sync" size={11} color="rgba(255,255,255,0.9)" />
                          ) : null}
                          <Text style={styles.eventTitle} numberOfLines={1}>{ev.title}</Text>
                          <TouchableOpacity
                            onPress={() => handleDelete(ev)}
                            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                          >
                            <MaterialCommunityIcons
                              name="delete-outline"
                              size={14}
                              color="rgba(255,255,255,0.9)"
                            />
                          </TouchableOpacity>
                        </View>
                        {ev.description ? (
                          <Text style={styles.eventDesc} numberOfLines={descLines}>
                            {ev.description}
                          </Text>
                        ) : null}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </>
      )}
    </View>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    backgroundColor: colors.bg,
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  dateLabel: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  lunarText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: radius.sm,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  addBtnText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textInverse,
  },
  // ===== 时间刻度轴 =====
  timeline: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  timelineContent: {
    paddingBottom: spacing.xl,
  },
  timelineRow: {
    flexDirection: 'row',
    paddingTop: 8,
  },
  hourColumn: {
    width: 54,
    backgroundColor: colors.bgSecondary,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  hourCell: {
    height: HOUR_HEIGHT,
  },
  hourLabel: {
    position: 'absolute',
    top: -6,
    right: 6,
    fontSize: 11,
    color: colors.textMuted,
  },
  eventArea: {
    flex: 1,
    position: 'relative',
  },
  hourLine: {
    height: HOUR_HEIGHT,
  },
  hourLineBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  hourLineAlt: {
    backgroundColor: colors.bgSecondary,
  },
  nowLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.danger,
    zIndex: 3,
  },
  nowDot: {
    position: 'absolute',
    left: -1,
    top: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  eventSlot: {
    position: 'absolute',
    zIndex: 2,
  },
  eventBlock: {
    flex: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 5,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  eventBlockCompleted: {
    opacity: 0.6,
  },
  eventHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventTime: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
  },
  eventTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  eventDesc: {
    fontSize: 11,
    lineHeight: DESC_LINE_HEIGHT,
    color: 'rgba(255,255,255,0.85)',
    marginTop: DESC_MARGIN_TOP,
  },
  // ===== 空状态 =====
  emptyState: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  emptyAddText: {
    fontSize: fontSize.md,
    color: colors.textInverse,
    fontWeight: '500',
  },
});

export const DayView = memo(DayViewInner);
export default DayView;
