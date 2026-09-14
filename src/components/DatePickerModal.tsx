import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { getMonthGridDates } from '../utils/calendar';
import { colors } from '../theme/colors';
import { spacing, fontSize, radius } from '../theme/spacing';

interface DatePickerModalProps {
  visible: boolean;
  /** 当前值 YYYY-MM-DD，允许空串 */
  value: string;
  title?: string;
  onConfirm: (date: string) => void;
  onClose: () => void;
  /** 是否显示「清除」按钮（用于可选日期，如重复结束日期） */
  allowClear?: boolean;
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 纯 JS 月历选择器，不依赖原生时间选择器（无需重新构建原生包） */
export default function DatePickerModal({
  visible,
  value,
  title = '选择日期',
  onConfirm,
  onClose,
  allowClear = false,
}: DatePickerModalProps) {
  const baseDate = DATE_RE.test(value) ? dayjs(value) : dayjs();
  const [cursor, setCursor] = useState(baseDate.startOf('month'));
  const [selected, setSelected] = useState(DATE_RE.test(value) ? value : '');

  // 每次打开时按当前值重置
  useEffect(() => {
    if (!visible) return;
    const base = DATE_RE.test(value) ? dayjs(value) : dayjs();
    setCursor(base.startOf('month'));
    setSelected(DATE_RE.test(value) ? value : '');
  }, [visible, value]);

  const todayStr = dayjs().format('YYYY-MM-DD');
  const grid = useMemo(
    () => getMonthGridDates(cursor.year(), cursor.month() + 1),
    [cursor]
  );

  const shiftMonth = (delta: number) => setCursor((c) => c.add(delta, 'month'));
  const shiftYear = (delta: number) => setCursor((c) => c.add(delta, 'year'));

  const handleConfirm = () => {
    onConfirm(selected || todayStr);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              {/* Header */}
              <View style={styles.headerRow}>
                <Text style={styles.title}>{title}</Text>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Month / year navigation */}
              <View style={styles.navRow}>
                <TouchableOpacity style={styles.navBtn} onPress={() => shiftYear(-1)}>
                  <MaterialCommunityIcons name="chevron-double-left" size={22} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.navBtn} onPress={() => shiftMonth(-1)}>
                  <MaterialCommunityIcons name="chevron-left" size={22} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.navLabel}>
                  {cursor.year()}年{cursor.month() + 1}月
                </Text>
                <TouchableOpacity style={styles.navBtn} onPress={() => shiftMonth(1)}>
                  <MaterialCommunityIcons name="chevron-right" size={22} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.navBtn} onPress={() => shiftYear(1)}>
                  <MaterialCommunityIcons name="chevron-double-right" size={22} color={colors.primary} />
                </TouchableOpacity>
              </View>

              {/* Weekday header */}
              <View style={styles.weekRow}>
                {WEEKDAYS.map((w, i) => (
                  <View key={w} style={styles.weekCell}>
                    <Text style={[styles.weekText, i >= 5 && styles.weekendText]}>{w}</Text>
                  </View>
                ))}
              </View>

              {/* Day grid */}
              {Array.from({ length: 6 }, (_, row) => (
                <View key={row} style={styles.dayRow}>
                  {grid.slice(row * 7, row * 7 + 7).map((cell) => {
                    const isSelected = cell.date === selected;
                    const isToday = cell.date === todayStr;
                    const dayNumber = parseInt(cell.date.split('-')[2], 10);
                    return (
                      <TouchableOpacity
                        key={cell.date}
                        style={styles.dayCell}
                        onPress={() => setSelected(cell.date)}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.dayNumberWrap,
                            isToday && !isSelected && styles.todayWrap,
                            isSelected && styles.selectedWrap,
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayNumber,
                              !cell.isCurrentMonth && styles.otherMonthText,
                              isToday && !isSelected && styles.todayText,
                              isSelected && styles.selectedText,
                            ]}
                          >
                            {dayNumber}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}

              {/* Actions */}
              <View style={styles.actions}>
                {allowClear ? (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.clearBtn]}
                    onPress={() => {
                      onConfirm('');
                      onClose();
                    }}
                  >
                    <Text style={[styles.actionText, { color: colors.textSecondary }]}>清除</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={[styles.actionBtn, styles.cancelBtn]}
                  onPress={onClose}
                >
                  <Text style={[styles.actionText, { color: colors.text }]}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.confirmBtn]}
                  onPress={handleConfirm}
                >
                  <Text style={[styles.actionText, { color: colors.textInverse }]}>确定</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  navBtn: {
    padding: spacing.xs,
  },
  navLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  weekCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  weekendText: {
    color: colors.weekend,
  },
  dayRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 3,
  },
  dayNumberWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayWrap: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  selectedWrap: {
    backgroundColor: colors.primary,
  },
  dayNumber: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  otherMonthText: {
    color: colors.textMuted,
  },
  todayText: {
    color: colors.primary,
    fontWeight: '700',
  },
  selectedText: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  clearBtn: {
    backgroundColor: colors.bgSecondary,
  },
  cancelBtn: {
    backgroundColor: colors.bgSecondary,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
  },
  actionText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
