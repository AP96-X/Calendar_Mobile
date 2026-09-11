import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { CalendarEvent, DayMeta } from '../types';
import { isToday, getLunarDisplay, getDayBadges, type DayBadge } from '../utils/calendar';
import { colors } from '../theme/colors';
import { spacing, fontSize, radius } from '../theme/spacing';

interface DayCellProps {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  meta?: DayMeta;
  events: CalendarEvent[];
  onDayPress: (date: string) => void;
  onDayNumberPress: (date: string) => void;
  onEventPress: (event: CalendarEvent) => void;
  onMorePress: (date: string) => void;
}

const MAX_EVENTS_SHOW = 2;

function getBadgeStyle(type: DayBadge['type']): { bg: string; color: string } {
  switch (type) {
    case 'work':
      return { bg: '#FEF3C7', color: '#D97706' };
    case 'rest':
      return { bg: '#D1FAE5', color: '#059669' };
    case 'term':
      return { bg: '#F3E8FF', color: '#7C3AED' };
    case 'festival':
      return { bg: '#FFEDD5', color: '#EA580C' };
    default:
      return { bg: colors.border, color: colors.textSecondary };
  }
}

function DayCellInner({
  date,
  dayNumber,
  isCurrentMonth,
  meta,
  events,
  onDayPress,
  onDayNumberPress,
  onEventPress,
  onMorePress,
}: DayCellProps) {
  const today = isToday(date);
  const lunarInfo = getLunarDisplay(meta);
  const badges = getDayBadges(meta);
  const isWeekend = meta?.is_weekend ?? false;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        !isCurrentMonth && styles.otherMonth,
        today && styles.todayCell,
      ]}
      onPress={() => onDayPress(date)}
      activeOpacity={0.7}
    >
      {/* Top row: day number + badges in top-right */}
      <View style={styles.topRow}>
        <TouchableOpacity
          onPress={() => onDayNumberPress(date)}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <View style={[styles.dayNumberWrap, today && styles.todayCircle]}>
            <Text
              style={[
                styles.dayNumber,
                !isCurrentMonth && styles.otherMonthText,
                isWeekend && isCurrentMonth && styles.weekendText,
                today && styles.todayText,
              ]}
            >
              {dayNumber}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Badges in top-right */}
        {badges.length > 0 && (
          <View style={styles.badgeRow}>
            {badges.slice(0, 2).map((badge, i) => {
              const style = getBadgeStyle(badge.type);
              return (
                <View key={i} style={[styles.badge, { backgroundColor: style.bg }]}>
                  <Text style={[styles.badgeText, { color: style.color }]} numberOfLines={1}>
                    {badge.text}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Lunar text */}
      <Text
        style={[
          styles.lunar,
          !isCurrentMonth && styles.otherMonthText,
        ]}
        numberOfLines={1}
      >
        {lunarInfo.text}
      </Text>

      {/* Events */}
      <View style={styles.eventsContainer}>
        {events.slice(0, MAX_EVENTS_SHOW).map((ev) => (
          <TouchableOpacity
            key={ev.id}
            style={[styles.eventBar, { backgroundColor: ev.color }]}
            onPress={() => onEventPress(ev)}
            activeOpacity={0.6}
          >
            {ev.recurrence ? (
              <MaterialCommunityIcons
                name="sync"
                size={9}
                color="rgba(255,255,255,0.95)"
                style={styles.eventRecurrence}
              />
            ) : (
              <View style={[styles.eventDot, ev.completed && styles.eventDotCompleted]} />
            )}
            <Text style={[styles.eventText, ev.completed && styles.eventTextCompleted]}>
              {ev.title}
            </Text>
          </TouchableOpacity>
        ))}
        {events.length > MAX_EVENTS_SHOW && (
          <TouchableOpacity
            onPress={() => onMorePress(date)}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <Text style={styles.moreText}>
              +{events.length - MAX_EVENTS_SHOW} 更多
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 3,
    borderWidth: 0.5,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  otherMonth: {
    backgroundColor: colors.bgSecondary,
  },
  todayCell: {
    backgroundColor: '#EBF5FF',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 1,
  },
  dayNumberWrap: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  todayCircle: {
    backgroundColor: colors.primary,
  },
  dayNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  otherMonthText: {
    color: colors.textMuted,
  },
  weekendText: {
    color: colors.weekend,
  },
  todayText: {
    color: colors.textInverse,
    fontWeight: 'bold',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 1,
    flex: 1,
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 2,
    paddingVertical: 0,
    borderRadius: radius.sm,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '500',
  },
  lunar: {
    fontSize: 9,
    color: colors.textSecondary,
    marginBottom: 1,
  },
  eventsContainer: {
    gap: 1,
  },
  eventBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: radius.sm,
    minHeight: 14,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.9)',
    marginRight: 2,
    marginTop: 2,
  },
  eventRecurrence: {
    marginRight: 2,
    marginTop: 1,
  },
  eventDotCompleted: {
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  eventText: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '500',
    flex: 1,
    lineHeight: 12,
  },
  eventTextCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  moreText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: '500',
    paddingLeft: 2,
  },
});

export const DayCell = memo(DayCellInner);
export default DayCell;
