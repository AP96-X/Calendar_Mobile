import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  type LayoutChangeEvent,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import type { CalendarEvent, DayMeta, EventUpdateScope } from '../types';
import {
  getDayLabel,
  getLunarDisplay,
  getDayBadges,
  isToday,
  type DayBadge,
} from '../utils/calendar';
import { colors } from '../theme/colors';
import { spacing, fontSize, radius } from '../theme/spacing';

interface DayViewProps {
  selectedDate: string;
  events: CalendarEvent[];
  meta?: DayMeta;
  onEventPress: (event: CalendarEvent) => void;
  onEventToggle: (eventId: number) => void;
  onAddEvent: (date: string) => void;
  onDeleteEvent: (eventId: number, scope?: EventUpdateScope) => void;
}

const HOUR_HEIGHT = 56; // 每小时对应的像素高度
const MIN_EVENT_HEIGHT = 26; // 事件方块最小高度
const MIN_DURATION = 30; // 最短显示时长（分钟）
const DEFAULT_DURATION = 60; // 未填结束时间时的默认时长（分钟）
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function hhmm(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getBadgeStyle(type: DayBadge['type']): { bg: string; color: string } {
  switch (type) {
    case 'work': return { bg: '#FEF3C7', color: '#D97706' };
    case 'rest': return { bg: '#D1FAE5', color: '#059669' };
    case 'term': return { bg: '#F3E8FF', color: '#7C3AED' };
    case 'festival': return { bg: '#FFEDD5', color: '#EA580C' };
    default: return { bg: colors.border, color: colors.textSecondary };
  }
}

function DayViewInner({
  selectedDate,
  events,
  meta,
  onEventPress,
  onEventToggle,
  onAddEvent,
  onDeleteEvent,
}: DayViewProps) {
  const lunarInfo = useMemo(() => getLunarDisplay(meta), [meta]);
  const badges = useMemo(() => getDayBadges(meta), [meta]);

  const scrollRef = useRef<ScrollView>(null);
  const [areaWidth, setAreaWidth] = useState(0);

  // 全天 / 未设置时间的事件置顶；其余按时间落到刻度轴上
  const { allDayEvents, laidOut, laneCount } = useMemo(() => {
    const allDay = events.filter((e) => e.all_day || !e.time);
    const timed = events
      .filter((e) => !e.all_day && !!e.time)
      .map((e) => {
        const start = toMinutes(e.time as string);
        const rawEnd = e.end_time ? toMinutes(e.end_time) : start + DEFAULT_DURATION;
        const end = Math.max(rawEnd, start + MIN_DURATION);
        return { ev: e, start, end };
      })
      .sort((a, b) => a.start - b.start || a.end - b.end);

    // 正常情况下同一天不会有时间重叠，这里做泳道兜底（数据异常时并排显示而不是叠在一起）
    const laneEnds: number[] = [];
    const laid = timed.map((it) => {
      let lane = laneEnds.findIndex((end) => end <= it.start);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(it.end);
      } else {
        laneEnds[lane] = it.end;
      }
      return { ...it, lane };
    });

    return { allDayEvents: allDay, laidOut: laid, laneCount: Math.max(1, laneEnds.length) };
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
  const now = dayjs();
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
              const style = getBadgeStyle(b.type);
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
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="calendar-blank" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>今日暂无事件</Text>
          <TouchableOpacity
            style={styles.emptyAddBtn}
            onPress={() => onAddEvent(selectedDate)}
          >
            <MaterialCommunityIcons name="plus" size={18} color={colors.textInverse} />
            <Text style={styles.emptyAddText}>添加事件</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* 全天 / 未设置时间事件 */}
          {allDayEvents.length > 0 ? (
            <View style={styles.allDaySection}>
              <Text style={styles.allDayLabel}>全天</Text>
              <ScrollView
                style={styles.allDayScroll}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.allDayList}>
                  {allDayEvents.map((ev) => (
                    <TouchableOpacity
                      key={ev.id}
                      style={[styles.allDayItem, { backgroundColor: ev.color }]}
                      onPress={() => onEventPress(ev)}
                      activeOpacity={0.7}
                    >
                      <TouchableOpacity
                        onPress={() => onEventToggle(ev.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <MaterialCommunityIcons
                          name={ev.completed ? 'checkbox-marked' : 'checkbox-blank-outline'}
                          size={18}
                          color="rgba(255,255,255,0.95)"
                        />
                      </TouchableOpacity>
                      {ev.recurrence ? (
                        <MaterialCommunityIcons name="sync" size={12} color="rgba(255,255,255,0.9)" />
                      ) : null}
                      <Text
                        style={[styles.allDayTitle, ev.completed && styles.eventCompleted]}
                        numberOfLines={1}
                      >
                        {ev.title}
                      </Text>
                      {ev.time && ev.end_time ? (
                        <Text style={styles.allDayTime}>{ev.time}-{ev.end_time}</Text>
                      ) : null}
                      <TouchableOpacity
                        onPress={() => handleDelete(ev)}
                        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                      >
                        <MaterialCommunityIcons
                          name="delete-outline"
                          size={16}
                          color="rgba(255,255,255,0.9)"
                        />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          ) : null}

          {/* 时间刻度轴 */}
          <ScrollView
            ref={scrollRef}
            style={styles.timeline}
            contentContainerStyle={styles.timelineContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
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
                {laidOut.map(({ ev, start, end, lane }) => {
                  const laneWidth = areaWidth > 0 ? areaWidth / laneCount : 0;
                  const top = (start / 60) * HOUR_HEIGHT;
                  const height = Math.max(((end - start) / 60) * HOUR_HEIGHT, MIN_EVENT_HEIGHT);
                  const timeLabel = `${hhmm(start)}${ev.end_time ? `-${hhmm(end)}` : ''}`;
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
                        {ev.description && height >= 46 ? (
                          <Text style={styles.eventDesc} numberOfLines={2}>
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

const styles = StyleSheet.create({
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
  // ===== 全天事件 =====
  allDaySection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  allDayLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: 4,
  },
  allDayScroll: {
    maxHeight: 120,
    marginBottom: spacing.sm,
  },
  allDayList: {
    gap: 4,
  },
  allDayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  allDayTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: fontSize.md,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  allDayTime: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.85)',
  },
  eventCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
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
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  // ===== 空状态 =====
  emptyState: {
    flex: 1,
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
