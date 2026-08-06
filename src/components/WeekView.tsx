import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import type { EventsByDate, CalendarMeta, CalendarEvent } from '../types';
import { getWeekDates, isToday, getLunarDisplay, getDayBadges, type DayBadge } from '../utils/calendar';
import { colors } from '../theme/colors';
import { spacing, fontSize, radius } from '../theme/spacing';

interface WeekViewProps {
  selectedDate: string;
  eventsData: EventsByDate;
  calendarMeta: CalendarMeta;
  onDayPress: (date: string) => void;
  onEventPress: (event: CalendarEvent) => void;
  onDayHeaderPress: (date: string) => void;
}

const WEEKDAY_NAMES = ['一', '二', '三', '四', '五', '六', '日'];

function getBadgeStyle(type: DayBadge['type']): { bg: string; color: string } {
  switch (type) {
    case 'work': return { bg: '#FEF3C7', color: '#D97706' };
    case 'rest': return { bg: '#D1FAE5', color: '#059669' };
    case 'term': return { bg: '#F3E8FF', color: '#7C3AED' };
    case 'festival': return { bg: '#FFEDD5', color: '#EA580C' };
    default: return { bg: colors.border, color: colors.textSecondary };
  }
}

function WeekViewInner({
  selectedDate,
  eventsData,
  calendarMeta,
  onDayPress,
  onEventPress,
  onDayHeaderPress,
}: WeekViewProps) {
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

  return (
    <View style={styles.container}>
      {/* 固定表头行：7 列等分屏幕宽度 */}
      <View style={styles.headerRow}>
        {weekDates.map((dateStr, i) => {
          const meta = calendarMeta[dateStr];
          const lunarInfo = getLunarDisplay(meta);
          const badges = getDayBadges(meta);
          const today = isToday(dateStr);
          const dayNum = parseInt(dateStr.split('-')[2], 10);
          const isWeekend = i >= 5;
          const isSel = selectedDate === dateStr;

          return (
            <TouchableOpacity
              key={dateStr}
              style={[styles.headerCell, today && styles.headerCellToday, isSel && styles.headerCellSelected]}
              onPress={() => onDayHeaderPress(dateStr)}
              activeOpacity={0.7}
            >
              <Text style={[styles.weekdayLabel, isWeekend && styles.weekendLabel]}>
                {WEEKDAY_NAMES[i]}
              </Text>
              <View style={[styles.dayNumWrap, today && styles.todayCircle]}>
                <Text style={[styles.dayNum, isWeekend && styles.weekendNum, today && styles.todayNum]}>
                  {dayNum}
                </Text>
              </View>
              <Text style={styles.lunarText} numberOfLines={1}>{lunarInfo.text}</Text>
              {badges.length > 0 ? (
                <View style={styles.badgeRow}>
                  {badges.slice(0, 2).map((b, bi) => {
                    const style = getBadgeStyle(b.type);
                    return (
                      <View key={bi} style={[styles.badge, { backgroundColor: style.bg }]}>
                        <Text style={[styles.badgeText, { color: style.color }]} numberOfLines={1}>
                          {b.text}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 事件区域：7 列等分 + 共享垂直滚动 */}
      <ScrollView style={styles.eventsScroll} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
        <View style={styles.eventsRow}>
          {weekDates.map((dateStr) => {
            const events = eventsData[dateStr] || [];
            const today = isToday(dateStr);

            return (
              <View key={dateStr} style={[styles.dayColumn, today && styles.dayColumnToday]}>
                {events.length === 0 ? (
                  <TouchableOpacity
                    style={styles.emptyCell}
                    onPress={() => onDayPress(dateStr)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.addHint}>+</Text>
                  </TouchableOpacity>
                ) : (
                  events.map((ev) => (
                    <TouchableOpacity
                      key={ev.id}
                      style={[styles.eventCard, { borderLeftColor: ev.color }]}
                      onPress={() => onEventPress(ev)}
                      activeOpacity={0.6}
                    >
                      {ev.time ? (
                        <Text style={styles.eventTime} numberOfLines={1}>
                          {ev.time}
                        </Text>
                      ) : null}
                      <Text
                        style={[styles.eventTitle, ev.completed && styles.eventCompleted]}
                        numberOfLines={4}
                      >
                        {ev.title}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  // ===== 表头行 =====
  headerRow: {
    flexDirection: 'row',
    backgroundColor: colors.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerCell: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  headerCellToday: {
    backgroundColor: '#EBF5FF',
  },
  headerCellSelected: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  weekdayLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  weekendLabel: {
    color: colors.weekend,
  },
  dayNumWrap: {
    marginTop: 2,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  todayCircle: {
    backgroundColor: colors.primary,
  },
  dayNum: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    color: colors.text,
  },
  weekendNum: {
    color: colors.weekend,
  },
  todayNum: {
    color: colors.textInverse,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 2,
    justifyContent: 'center',
    minHeight: 14,
  },
  badge: {
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderRadius: radius.sm,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '500',
  },
  lunarText: {
    fontSize: 8,
    color: colors.textSecondary,
    marginTop: 1,
  },
  // ===== 事件区域 =====
  eventsScroll: {
    flex: 1,
  },
  eventsRow: {
    flexDirection: 'row',
  },
  dayColumn: {
    flex: 1,
    borderRightWidth: 0.5,
    borderColor: colors.border,
    minHeight: 200,
    padding: 1,
  },
  dayColumnToday: {
    backgroundColor: 'rgba(74, 144, 217, 0.04)',
  },
  emptyCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  addHint: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  eventCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.sm,
    borderLeftWidth: 2,
    paddingVertical: 3,
    paddingHorizontal: 2,
    marginBottom: 3,
    minHeight: 20,
  },
  eventTime: {
    fontSize: 8,
    color: colors.textSecondary,
    marginBottom: 1,
  },
  eventTitle: {
    fontSize: 9,
    lineHeight: 12,
    color: colors.text,
    fontWeight: '500',
  },
  eventCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
});

export const WeekView = memo(WeekViewInner);
export default WeekView;
