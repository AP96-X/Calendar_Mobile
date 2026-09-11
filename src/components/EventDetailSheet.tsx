import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import type { CalendarEvent, EventUpdateScope } from '../types';
import { formatEventTime, getRecurrenceLabel } from '../utils/calendar';
import { colors } from '../theme/colors';
import { spacing, fontSize, radius } from '../theme/spacing';

interface EventDetailSheetProps {
  visible: boolean;
  event: CalendarEvent | null;
  onClose: () => void;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (eventId: number, scope?: EventUpdateScope) => void;
  onToggleComplete: (eventId: number) => void;
}

const WEEKDAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];

export default function EventDetailSheet({
  visible,
  event,
  onClose,
  onEdit,
  onDelete,
  onToggleComplete,
}: EventDetailSheetProps) {
  if (!event) return null;

  const eventDate = dayjs(event.date);
  const weekdayStr = `星期${WEEKDAY_NAMES[eventDate.day()]}`;
  const isSeries = !!event.recurrence_group;

  const handleDelete = () => {
    if (isSeries) {
      Alert.alert(
        '删除重复事件',
        `「${event.title}」属于重复系列，请选择删除范围`,
        [
          { text: '取消', style: 'cancel' },
          {
            text: '仅此事件',
            onPress: () => {
              onDelete(event.id, 'single');
              onClose();
            },
          },
          {
            text: '整个系列',
            style: 'destructive',
            onPress: () => {
              onDelete(event.id, 'series');
              onClose();
            },
          },
        ]
      );
      return;
    }
    Alert.alert('确认删除', `确定要删除事件"${event.title}"吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          onDelete(event.id, 'single');
          onClose();
        },
      },
    ]);
  };

  const handleToggleComplete = () => {
    onToggleComplete(event.id);
    onClose();
  };

  const handleEdit = () => {
    onClose();
    onEdit(event);
  };

  const timeText = formatEventTime(event);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              {/* Drag handle */}
              <View style={styles.handle} />

              {/* Title with color bar */}
              <View style={styles.titleRow}>
                <View style={[styles.colorBar, { backgroundColor: event.color }]} />
                <Text
                  style={[
                    styles.title,
                    event.completed && styles.titleCompleted,
                  ]}
                  numberOfLines={3}
                >
                  {event.title}
                </Text>
                {event.recurrence ? (
                  <MaterialCommunityIcons name="sync" size={18} color={colors.primary} />
                ) : null}
              </View>

              {/* Status badge */}
              <View style={styles.statusRow}>
                <View style={[styles.statusBadge, event.completed ? styles.statusDone : styles.statusPending]}>
                  <MaterialCommunityIcons
                    name={event.completed ? 'check-circle' : 'clock-outline'}
                    size={14}
                    color={event.completed ? colors.success : colors.primary}
                  />
                  <Text style={[styles.statusText, event.completed ? styles.statusTextDone : styles.statusTextPending]}>
                    {event.completed ? '已完成' : '待完成'}
                  </Text>
                </View>
              </View>

              {/* Detail rows */}
              <View style={styles.detailCard}>
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="calendar" size={18} color={colors.textSecondary} />
                  <Text style={styles.detailLabel}>日期</Text>
                  <Text style={styles.detailValue}>
                    {eventDate.format('YYYY年MM月DD日')} {weekdayStr}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="clock-outline" size={18} color={colors.textSecondary} />
                  <Text style={styles.detailLabel}>时间</Text>
                  <Text style={styles.detailValue}>{timeText || '未设置'}</Text>
                </View>

                {event.recurrence ? (
                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="sync" size={18} color={colors.textSecondary} />
                    <Text style={styles.detailLabel}>重复</Text>
                    <Text style={styles.detailValue}>
                      {getRecurrenceLabel(event.recurrence)}
                      {event.recurrence_end ? `，至 ${event.recurrence_end}` : ''}
                    </Text>
                  </View>
                ) : null}

                {event.description ? (
                  <View style={[styles.detailRow, styles.detailRowTop]}>
                    <MaterialCommunityIcons name="text-box-outline" size={18} color={colors.textSecondary} />
                    <Text style={styles.detailLabel}>备注</Text>
                    <Text style={styles.detailValue}>{event.description}</Text>
                  </View>
                ) : null}

                <View style={styles.detailRow}>
                  <View style={[styles.colorDot, { backgroundColor: event.color }]} />
                  <Text style={styles.detailLabel}>标签</Text>
                  <Text style={styles.detailValue}>{event.color}</Text>
                </View>

                {event.created_at && (
                  <View style={styles.createdRow}>
                    <Text style={styles.createdText}>
                      创建于 {dayjs(event.created_at).format('YYYY-MM-DD HH:mm')}
                    </Text>
                  </View>
                )}
              </View>

              {/* Action buttons */}
              <View style={styles.actions}>
                <TouchableOpacity style={styles.actionBtn} onPress={handleDelete}>
                  <MaterialCommunityIcons name="delete-outline" size={22} color={colors.danger} />
                  <Text style={[styles.actionText, { color: colors.danger }]}>删除</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn} onPress={handleToggleComplete}>
                  <MaterialCommunityIcons
                    name={event.completed ? 'undo' : 'check'}
                    size={22}
                    color={event.completed ? colors.warning : colors.success}
                  />
                  <Text style={[styles.actionText, { color: event.completed ? colors.warning : colors.success }]}>
                    {event.completed ? '取消完成' : '标记完成'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={handleEdit}>
                  <MaterialCommunityIcons name="pencil" size={22} color={colors.textInverse} />
                  <Text style={[styles.actionText, { color: colors.textInverse }]}>编辑</Text>
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
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderDark,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  colorBar: {
    width: 5,
    height: 28,
    borderRadius: 2.5,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  statusRow: {
    marginBottom: spacing.lg,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.round,
    alignSelf: 'flex-start',
  },
  statusDone: {
    backgroundColor: '#D1FAE5',
  },
  statusPending: {
    backgroundColor: '#EBF5FF',
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  statusTextDone: {
    color: colors.success,
  },
  statusTextPending: {
    color: colors.primary,
  },
  detailCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailRowTop: {
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    minWidth: 36,
  },
  detailValue: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  createdRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  createdText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.bgSecondary,
    gap: 4,
  },
  actionBtnPrimary: {
    backgroundColor: colors.primary,
  },
  actionText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
});
