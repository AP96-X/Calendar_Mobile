import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { CalendarEvent, DayMeta } from '../types';
import { getDayLabel, getLunarDisplay, getDayBadges, type DayBadge } from '../utils/calendar';
import { colors } from '../theme/colors';
import { spacing, fontSize, radius } from '../theme/spacing';

interface DayViewProps {
  selectedDate: string;
  events: CalendarEvent[];
  meta?: DayMeta;
  onEventPress: (event: CalendarEvent) => void;
  onEventToggle: (eventId: number) => void;
  onAddEvent: (date: string) => void;
  onDeleteEvent: (eventId: number) => void;
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

  const handleDelete = (ev: CalendarEvent) => {
    Alert.alert(
      '确认删除',
      `确定要删除事件"${ev.title}"吗？`,
      [
        { text: '取消', style: 'cancel' },
        { text: '删除', style: 'destructive', onPress: () => onDeleteEvent(ev.id) },
      ]
    );
  };

  const renderEvent = ({ item: ev }: { item: CalendarEvent }) => (
    <TouchableOpacity
      style={[styles.eventCard, { backgroundColor: ev.color }]}
      onPress={() => onEventPress(ev)}
      activeOpacity={0.7}
    >
      <TouchableOpacity
        onPress={() => onEventToggle(ev.id)}
        style={styles.checkboxWrap}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialCommunityIcons
          name={ev.completed ? 'checkbox-marked' : 'checkbox-blank-outline'}
          size={22}
          color="rgba(255,255,255,0.9)"
        />
      </TouchableOpacity>

      <View style={styles.eventInfo}>
        <Text
          style={[styles.eventTitle, ev.completed && styles.eventCompleted]}
          numberOfLines={2}
        >
          {ev.title}
        </Text>
        {ev.time ? (
          <View style={styles.timeRow}>
            <MaterialCommunityIcons name="clock-outline" size={13} color="rgba(255,255,255,0.85)" />
            <Text style={styles.eventTime}>{ev.time}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.eventActions}>
        <TouchableOpacity
          onPress={() => onEventPress(ev)}
          style={styles.iconBtn}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <MaterialCommunityIcons name="pencil" size={18} color="rgba(255,255,255,0.9)" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDelete(ev)}
          style={styles.iconBtn}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <MaterialCommunityIcons name="delete-outline" size={18} color="rgba(255,255,255,0.9)" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
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

      {/* Events list */}
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
        <FlatList
          style={styles.listStyle}
          data={events}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderEvent}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    backgroundColor: colors.bg,
  },
  dateLabel: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  lunarText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  badgeText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  listStyle: {
    flex: 1,
  },
  list: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    minHeight: 56,
  },
  checkboxWrap: {
    padding: spacing.xs,
  },
  eventInfo: {
    flex: 1,
    minWidth: 0,
  },
  eventTitle: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  eventCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  eventTime: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.85)',
  },
  eventActions: {
    flexDirection: 'row',
    gap: 4,
  },
  iconBtn: {
    padding: spacing.xs,
  },
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
