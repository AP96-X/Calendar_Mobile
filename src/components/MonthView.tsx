import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import dayjs from 'dayjs';
import type { EventsByDate, CalendarMeta, CalendarEvent } from '../types';
import {
  getMonthGridDates,
  getISOWeekNumber,
} from '../utils/calendar';
import { colors } from '../theme/colors';
import { fontSize, spacing } from '../theme/spacing';
import DayCell from './DayCell';

interface MonthViewProps {
  year: number;
  month: number;
  eventsData: EventsByDate;
  calendarMeta: CalendarMeta;
  onDayPress: (date: string) => void;
  onDayNumberPress: (date: string) => void;
  onEventPress: (event: CalendarEvent) => void;
  onMorePress: (date: string) => void;
  onWeekNumPress: (date: string) => void;
}

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

export default function MonthView({
  year,
  month,
  eventsData,
  calendarMeta,
  onDayPress,
  onDayNumberPress,
  onEventPress,
  onMorePress,
  onWeekNumPress,
}: MonthViewProps) {
  const gridDates = useMemo(() => getMonthGridDates(year, month), [year, month]);

  // Calculate week numbers for each of the 6 rows
  const weekNumbers = useMemo(() => {
    const nums: number[] = [];
    for (let row = 0; row < 6; row++) {
      const weekStartDate = dayjs(gridDates[row * 7].date);
      nums.push(getISOWeekNumber(weekStartDate.toDate()));
    }
    return nums;
  }, [gridDates]);

  // Render 6 rows, each row = 1 week number cell + 7 day cells
  const rows = useMemo(() => {
    const result: React.ReactNode[] = [];
    for (let row = 0; row < 6; row++) {
      const weekNum = weekNumbers[row];
      const rowCells = gridDates.slice(row * 7, row * 7 + 7);

      result.push(
        <View key={`row-${row}`} style={styles.weekRow}>
          {/* Week number column */}
          <TouchableOpacity
            style={styles.weekNumCell}
            onPress={() => onWeekNumPress(rowCells[0].date)}
            activeOpacity={0.6}
          >
            <Text style={styles.weekNumText}>{weekNum}</Text>
          </TouchableOpacity>

          {/* 7 day cells */}
          {rowCells.map((cell) => {
            const dayNumber = parseInt(cell.date.split('-')[2], 10);
            return (
              <DayCell
                key={cell.date}
                date={cell.date}
                dayNumber={dayNumber}
                isCurrentMonth={cell.isCurrentMonth}
                meta={calendarMeta[cell.date]}
                events={eventsData[cell.date] || []}
                onDayPress={onDayPress}
                onDayNumberPress={onDayNumberPress}
                onEventPress={onEventPress}
                onMorePress={onMorePress}
              />
            );
          })}
        </View>
      );
    }
    return result;
  }, [gridDates, weekNumbers, eventsData, calendarMeta, onDayPress, onDayNumberPress, onEventPress, onMorePress, onWeekNumPress]);

  return (
    <View style={styles.container}>
      {/* Weekday header */}
      <View style={styles.headerRow}>
        <View style={styles.weekNumHeader}>
          <Text style={styles.weekNumHeaderText}>周</Text>
        </View>
        {WEEKDAY_LABELS.map((label, i) => (
          <View key={label} style={styles.headerCell}>
            <Text
              style={[
                styles.headerText,
                i >= 5 && styles.headerWeekend,
              ]}
            >
              {label}
            </Text>
          </View>
        ))}
      </View>

      {/* Days grid — scrollable, rows auto-size to content */}
      <ScrollView style={styles.grid} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
        {rows}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: colors.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  weekNumHeader: {
    width: 28,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  weekNumHeaderText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textMuted,
  },
  headerCell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  headerText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  headerWeekend: {
    color: colors.weekend,
  },
  grid: {
    flex: 1,
  },
  weekRow: {
    flexDirection: 'row',
    minHeight: 72,
  },
  weekNumCell: {
    width: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bgSecondary,
    borderRightWidth: 0.5,
    borderRightColor: colors.border,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  weekNumText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
});
