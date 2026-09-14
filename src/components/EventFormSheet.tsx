import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { TextInput, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { eventsApi } from '../api/events';
import {
  EVENT_COLORS,
  RECURRENCE_OPTIONS,
  getRecurrenceLabel,
  isValidTime,
} from '../utils/calendar';
import type { CalendarEvent, EventInput, EventUpdateScope, RecurrenceRule } from '../types';
import { colors } from '../theme/colors';
import { spacing, fontSize, radius } from '../theme/spacing';
import DatePickerModal from './DatePickerModal';
import TimePickerModal from './TimePickerModal';

interface EventFormSheetProps {
  visible: boolean;
  mode: 'add' | 'edit';
  event?: CalendarEvent | null;
  defaultDate: string;
  onClose: () => void;
  onSaved: () => void;
}

const SCOPE_OPTIONS: { label: string; value: EventUpdateScope }[] = [
  { label: '仅此事件', value: 'single' },
  { label: '整个系列', value: 'series' },
];

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

export default function EventFormSheet({
  visible,
  mode,
  event,
  defaultDate,
  onClose,
  onSaved,
}: EventFormSheetProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [allDay, setAllDay] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceRule>('');
  const [recurrenceHasEnd, setRecurrenceHasEnd] = useState(false);
  const [recurrenceEnd, setRecurrenceEnd] = useState('');
  const [scope, setScope] = useState<EventUpdateScope>('single');
  const [selectedColor, setSelectedColor] = useState(EVENT_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // 选择器显隐
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [recurrenceEndPickerVisible, setRecurrenceEndPickerVisible] = useState(false);
  const [timePicker, setTimePicker] = useState<'start' | 'end' | null>(null);

  const isSeries = mode === 'edit' && !!event?.recurrence_group;
  const colorValid = HEX_RE.test(selectedColor.trim());

  // Reset form when sheet opens
  useEffect(() => {
    if (!visible) return;
    if (mode === 'edit' && event) {
      setTitle(event.title);
      setDate(event.date);
      setAllDay(!!event.all_day);
      setStartTime(event.time || '');
      setEndTime(event.end_time || '');
      setDescription(event.description || '');
      setRecurrence((event.recurrence as RecurrenceRule) || '');
      setRecurrenceEnd(event.recurrence_end || '');
      setRecurrenceHasEnd(!!event.recurrence_end);
      setSelectedColor(event.color);
      setScope('single');
    } else {
      setTitle('');
      setDate(defaultDate);
      setAllDay(false);
      setStartTime('');
      setEndTime('');
      setDescription('');
      setRecurrence('');
      setRecurrenceEnd('');
      setRecurrenceHasEnd(false);
      setSelectedColor(EVENT_COLORS[0]);
      setScope('single');
    }
    setError('');
  }, [visible, mode, event, defaultDate]);

  const handleAllDayChange = useCallback((checked: boolean) => {
    setAllDay(checked);
    if (checked) {
      setStartTime('');
      setEndTime('');
    }
  }, []);

  const adjustDate = (delta: number) => {
    setDate(dayjs(date).add(delta, 'day').format('YYYY-MM-DD'));
  };

  const adjustRecurrenceEnd = (delta: number) => {
    const base = recurrenceEnd ? dayjs(recurrenceEnd) : dayjs(date).add(90, 'day');
    setRecurrenceEnd(base.add(delta, 'day').format('YYYY-MM-DD'));
  };

  const handleRecurrenceChange = (rule: RecurrenceRule) => {
    setRecurrence(rule);
    if (!rule) {
      setRecurrenceHasEnd(false);
      setRecurrenceEnd('');
    } else if (recurrenceHasEnd && !recurrenceEnd) {
      setRecurrenceEnd(dayjs(date).add(90, 'day').format('YYYY-MM-DD'));
    }
  };

  const handleRecurrenceEndToggle = (checked: boolean) => {
    setRecurrenceHasEnd(checked);
    if (checked && !recurrenceEnd) {
      setRecurrenceEnd(dayjs(date).add(90, 'day').format('YYYY-MM-DD'));
    }
  };

  /** 组装提交给后端的共享字段 */
  const buildBase = useCallback((): EventInput => ({
    title: title.trim(),
    date,
    all_day: allDay,
    time: allDay ? null : startTime.trim() || null,
    end_time: allDay ? null : endTime.trim() || null,
    description: description.trim(),
    color: selectedColor.trim().toUpperCase(),
  }), [title, date, allDay, startTime, endTime, description, selectedColor]);

  /** 重复规则变更 → 删除并重建（后端 PUT 只更新字段、不重新生成实例） */
  const doRebuild = useCallback(async (base: EventInput) => {
    if (!event) return;
    setError('');
    setSaving(true);
    try {
      const res = await eventsApi.rebuildSeries(
        event,
        base,
        recurrence,
        recurrenceHasEnd ? recurrenceEnd : null,
        isSeries ? scope : 'single',
      );
      onSaved();
      onClose();
      const count = typeof res.count === 'number' ? res.count : 1;
      Alert.alert('已更新重复规则', count > 1 ? `已重新生成 ${count} 个实例` : '已更新事件');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setError(e.response?.data?.error || e.message || '保存失败');
    } finally {
      setSaving(false);
    }
  }, [event, recurrence, recurrenceHasEnd, recurrenceEnd, isSeries, scope, onSaved, onClose]);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      setError('请输入事件内容');
      return;
    }
    if (!date) {
      setError('请选择日期');
      return;
    }
    if (!colorValid) {
      setError('颜色编号格式应为 #RRGGBB（如 #4A90D9）');
      return;
    }

    const trimmedStart = startTime.trim();
    const trimmedEnd = endTime.trim();
    if (!allDay) {
      if (trimmedStart && !isValidTime(trimmedStart)) {
        setError('开始时间格式应为 HH:MM');
        return;
      }
      if (trimmedEnd && !isValidTime(trimmedEnd)) {
        setError('结束时间格式应为 HH:MM');
        return;
      }
      if (trimmedEnd && !trimmedStart) {
        setError('请先填写开始时间');
        return;
      }
      if (trimmedStart && trimmedEnd && trimmedEnd < trimmedStart) {
        setError('结束时间不能早于开始时间');
        return;
      }
    }
    if (recurrence && recurrenceHasEnd) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(recurrenceEnd)) {
        setError('请选择重复结束日期');
        return;
      }
      if (recurrenceEnd < date) {
        setError('重复结束日期不能早于开始日期');
        return;
      }
    }

    const base = buildBase();

    // 编辑已有事件时，重复规则/结束日期的变化需要「删除 + 重建」才能生效
    if (mode === 'edit' && event) {
      const originalEnd = event.recurrence_end || '';
      const nextEnd = recurrenceHasEnd ? recurrenceEnd : '';
      const ruleChanged = recurrence !== ((event.recurrence as RecurrenceRule) || '');
      const endChanged = nextEnd !== originalEnd;
      if (ruleChanged || endChanged) {
        const seriesHint = isSeries && scope === 'series'
          ? '将删除并重建整个系列（历史完成状态会丢失），确定继续吗？'
          : isSeries
            ? '将把当前这天拆分为一条独立的重复事件（原系列其它实例保持不变），确定继续吗？'
            : '将按新的重复规则重建该事件，确定继续吗？';
        Alert.alert('修改重复规则', seriesHint, [
          { text: '取消', style: 'cancel' },
          { text: '确定', onPress: () => { void doRebuild(base); } },
        ]);
        return;
      }
    }

    setError('');
    setSaving(true);

    try {
      if (mode === 'edit' && event) {
        await eventsApi.update(event.id, base, isSeries ? scope : 'single');
        onSaved();
        onClose();
      } else {
        const payload: EventInput = { ...base };
        if (recurrence) {
          payload.recurrence = recurrence;
          payload.recurrence_end = recurrenceHasEnd ? recurrenceEnd : '';
        }
        const res = await eventsApi.create(payload);
        onSaved();
        onClose();
        const count = typeof res.count === 'number' ? res.count : 1;
        if (count > 1) {
          Alert.alert('已创建重复事件', `共生成 ${count} 个实例`);
        }
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setError(e.response?.data?.error || e.message || '保存失败');
    } finally {
      setSaving(false);
    }
  }, [
    title, date, colorValid, allDay, startTime, endTime, recurrence,
    recurrenceHasEnd, recurrenceEnd, mode, event, isSeries, scope,
    buildBase, doRebuild, onSaved, onClose,
  ]);

  const handleDelete = useCallback(() => {
    if (!event) return;
    const deleteSeries = isSeries && scope === 'series';
    Alert.alert(
      deleteSeries ? '确认删除整个系列' : '确认删除',
      deleteSeries
        ? `确定要删除重复事件"${event.title}"的整个系列吗？`
        : `确定要删除事件"${event.title}"吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await eventsApi.delete(event.id, deleteSeries ? 'series' : 'single');
              onSaved();
              onClose();
            } catch (err: unknown) {
              const e = err as { response?: { data?: { error?: string } }; message?: string };
              setError(e.response?.data?.error || e.message || '删除失败');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  }, [event, isSeries, scope, onSaved, onClose]);

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.sheet}>
                {/* Header */}
                <View style={styles.header}>
                  <View style={styles.handle} />
                  <Text style={styles.headerTitle}>
                    {mode === 'add' ? '添加事件' : '编辑事件'}
                  </Text>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* 重复事件的修改范围（仅系列事件显示） */}
                  {isSeries ? (
                    <View style={styles.section}>
                      <Text style={styles.label}>修改范围</Text>
                      <View style={styles.chipRow}>
                        {SCOPE_OPTIONS.map((opt) => {
                          const active = scope === opt.value;
                          return (
                            <TouchableOpacity
                              key={opt.value}
                              style={[styles.chip, active && styles.chipActive]}
                              onPress={() => setScope(opt.value)}
                            >
                              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                                {opt.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      <Text style={styles.hint}>
                        {scope === 'series'
                          ? '将更新该系列全部实例的标题/时间/备注/颜色（各自日期保持不变）'
                          : '仅更新当前这一天的事件'}
                      </Text>
                    </View>
                  ) : null}

                  {/* Title input */}
                  <TextInput
                    label="事件标题"
                    value={title}
                    onChangeText={(text) => {
                      setTitle(text);
                      setError('');
                    }}
                    mode="outlined"
                    placeholder="输入事件内容..."
                    style={styles.input}
                    autoFocus={mode === 'add'}
                  />

                  {/* Date selector with +/- buttons */}
                  <Text style={styles.label}>日期</Text>
                  <View style={styles.dateRow}>
                    <TouchableOpacity onPress={() => adjustDate(-1)} style={styles.dateBtn}>
                      <MaterialCommunityIcons name="chevron-left" size={24} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.dateTextBtn}
                      onPress={() => setDatePickerVisible(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.dateText}>
                        {dayjs(date).format('YYYY年MM月DD日')}
                      </Text>
                      <MaterialCommunityIcons name="calendar-month-outline" size={16} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => adjustDate(1)} style={styles.dateBtn}>
                      <MaterialCommunityIcons name="chevron-right" size={24} color={colors.primary} />
                    </TouchableOpacity>
                  </View>

                  {/* All-day switch */}
                  <View style={styles.switchRow}>
                    <View style={styles.switchLabelWrap}>
                      <MaterialCommunityIcons name="weather-sunny" size={18} color={colors.textSecondary} />
                      <Text style={styles.switchLabel}>全天事件</Text>
                    </View>
                    <Switch
                      value={allDay}
                      onValueChange={handleAllDayChange}
                      trackColor={{ true: colors.primary, false: colors.borderDark }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  {/* Time range */}
                  <Text style={styles.label}>时间范围（可选）</Text>
                  <View style={styles.timeRow}>
                    <TouchableOpacity
                      style={[styles.timeField, allDay && styles.timeFieldDisabled]}
                      onPress={() => setTimePicker('start')}
                      disabled={allDay}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.timeFieldLabel, allDay && styles.timeFieldLabelDisabled]}>开始</Text>
                      <Text style={[styles.timeFieldValue, !startTime && styles.timeFieldPlaceholder]}>
                        {startTime || (allDay ? '全天' : '选择时间')}
                      </Text>
                    </TouchableOpacity>
                    <Text style={styles.timeSep}>-</Text>
                    <TouchableOpacity
                      style={[styles.timeField, allDay && styles.timeFieldDisabled]}
                      onPress={() => setTimePicker('end')}
                      disabled={allDay}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.timeFieldLabel, allDay && styles.timeFieldLabelDisabled]}>结束</Text>
                      <Text style={[styles.timeFieldValue, !endTime && styles.timeFieldPlaceholder]}>
                        {endTime || (allDay ? '全天' : '选择时间')}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Description */}
                  <TextInput
                    label="备注（可选）"
                    value={description}
                    onChangeText={setDescription}
                    mode="outlined"
                    placeholder="补充说明、地点、参与人等..."
                    style={styles.input}
                    multiline
                    numberOfLines={3}
                  />

                  {/* Recurrence */}
                  <View style={styles.section}>
                    <Text style={styles.label}>重复</Text>
                    <View style={styles.chipRow}>
                      {RECURRENCE_OPTIONS.map((opt) => {
                        const active = recurrence === opt.value;
                        return (
                          <TouchableOpacity
                            key={opt.value || 'none'}
                            style={[styles.chip, active && styles.chipActive]}
                            onPress={() => handleRecurrenceChange(opt.value)}
                          >
                            <Text style={[styles.chipText, active && styles.chipTextActive]}>
                              {opt.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {recurrence ? (
                      <>
                        <View style={styles.switchRow}>
                          <Text style={styles.switchLabel}>设置重复结束日期</Text>
                          <Switch
                            value={recurrenceHasEnd}
                            onValueChange={handleRecurrenceEndToggle}
                            trackColor={{ true: colors.primary, false: colors.borderDark }}
                            thumbColor="#FFFFFF"
                          />
                        </View>

                        {recurrenceHasEnd ? (
                          <View style={styles.dateRow}>
                            <TouchableOpacity
                              onPress={() => adjustRecurrenceEnd(-1)}
                              style={styles.dateBtn}
                            >
                              <MaterialCommunityIcons name="chevron-left" size={24} color={colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.dateTextBtn}
                              onPress={() => setRecurrenceEndPickerVisible(true)}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.dateText}>
                                {recurrenceEnd
                                  ? dayjs(recurrenceEnd).format('YYYY年MM月DD日')
                                  : '请选择'}
                              </Text>
                              <MaterialCommunityIcons name="calendar-month-outline" size={16} color={colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => adjustRecurrenceEnd(1)}
                              style={styles.dateBtn}
                            >
                              <MaterialCommunityIcons name="chevron-right" size={24} color={colors.primary} />
                            </TouchableOpacity>
                          </View>
                        ) : null}

                        {mode === 'edit' ? (
                          <View style={styles.infoBox}>
                            <MaterialCommunityIcons name="information-outline" size={16} color={colors.primary} />
                            <Text style={styles.infoText}>
                              当前为「{getRecurrenceLabel(recurrence)}」重复。修改重复规则或结束日期会删除并重建事件（历史完成状态会丢失）。
                            </Text>
                          </View>
                        ) : (
                          <Text style={styles.hint}>
                            将按「{getRecurrenceLabel(recurrence)}」重复生成事件；未设置结束日期时默认重复 90 天（最多 400 个实例）。
                          </Text>
                        )}
                      </>
                    ) : null}
                  </View>

                  {/* Color picker */}
                  <Text style={styles.label}>颜色标签</Text>
                  <View style={styles.colorGrid}>
                    {EVENT_COLORS.map((color) => (
                      <TouchableOpacity
                        key={color}
                        onPress={() => setSelectedColor(color)}
                        style={[
                          styles.colorDot,
                          { backgroundColor: color },
                          selectedColor.toUpperCase() === color.toUpperCase() && styles.colorDotSelected,
                        ]}
                      >
                        {selectedColor.toUpperCase() === color.toUpperCase() && (
                          <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Custom hex color input */}
                  <View style={styles.customColorRow}>
                    <View
                      style={[
                        styles.colorPreview,
                        { backgroundColor: colorValid ? selectedColor.trim() : '#4A90D9' },
                        !colorValid && styles.colorPreviewInvalid,
                      ]}
                    />
                    <TextInput
                      label="自定义颜色编号"
                      value={selectedColor}
                      onChangeText={(text) => {
                        setSelectedColor(text);
                        setError('');
                      }}
                      mode="outlined"
                      placeholder="#4A90D9"
                      style={styles.hexInput}
                      autoCapitalize="characters"
                      error={!colorValid}
                    />
                  </View>
                  {!colorValid ? (
                    <Text style={styles.fieldError}>颜色编号格式应为 #RRGGBB（如 #4A90D9）</Text>
                  ) : null}

                  {/* Error message */}
                  {error ? (
                    <View style={styles.errorBox}>
                      <MaterialCommunityIcons name="alert-circle" size={16} color={colors.danger} />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  ) : null}
                </ScrollView>

                {/* Action buttons */}
                <View style={styles.actions}>
                  {mode === 'edit' ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.deleteBtn]}
                      onPress={handleDelete}
                      disabled={saving}
                    >
                      <MaterialCommunityIcons name="delete-outline" size={20} color={colors.danger} />
                      <Text style={[styles.actionBtnText, { color: colors.danger }]}>删除</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.cancelBtn]}
                    onPress={onClose}
                    disabled={saving}
                  >
                    <Text style={styles.actionBtnText}>取消</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.saveBtn]}
                    onPress={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color={colors.textInverse} />
                    ) : (
                      <Text style={[styles.actionBtnText, { color: colors.textInverse }]}>
                        保存
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* 日期 / 时间选择器（纯 JS，无需原生模块） */}
      <DatePickerModal
        visible={datePickerVisible}
        value={date}
        title="选择日期"
        onConfirm={(d) => {
          setDate(d);
          setError('');
        }}
        onClose={() => setDatePickerVisible(false)}
      />
      <DatePickerModal
        visible={recurrenceEndPickerVisible}
        value={recurrenceEnd}
        title="重复结束日期"
        allowClear
        onConfirm={(d) => setRecurrenceEnd(d)}
        onClose={() => setRecurrenceEndPickerVisible(false)}
      />
      <TimePickerModal
        visible={timePicker === 'start'}
        value={startTime}
        title="开始时间"
        allowClear
        onConfirm={(t) => {
          setStartTime(t);
          setError('');
        }}
        onClose={() => setTimePicker(null)}
      />
      <TimePickerModal
        visible={timePicker === 'end'}
        value={endTime}
        title="结束时间"
        allowClear
        onConfirm={(t) => {
          setEndTime(t);
          setError('');
        }}
        onClose={() => setTimePicker(null)}
      />
    </>
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
    maxHeight: '88%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderDark,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  header: {
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: colors.bg,
  },
  section: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 16,
    marginTop: spacing.xs,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  dateBtn: {
    padding: spacing.xs,
  },
  dateText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  dateTextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  switchLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  switchLabel: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '500',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  timeInput: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  timeField: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 52,
    justifyContent: 'center',
  },
  timeFieldDisabled: {
    opacity: 0.5,
  },
  timeFieldLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  timeFieldLabelDisabled: {
    color: colors.textMuted,
  },
  timeFieldValue: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  timeFieldPlaceholder: {
    color: colors.textMuted,
    fontWeight: '400',
  },
  timeSep: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.round,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: colors.textInverse,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EBF5FF',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  infoText: {
    fontSize: fontSize.xs,
    color: colors.primaryDark,
    flex: 1,
    lineHeight: 16,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  customColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  colorPreview: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.borderDark,
  },
  colorPreviewInvalid: {
    borderColor: colors.danger,
    borderStyle: 'dashed',
  },
  fieldError: {
    fontSize: fontSize.xs,
    color: colors.danger,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  hexInput: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: colors.text,
    transform: [{ scale: 1.1 }],
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.danger,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    gap: 4,
  },
  cancelBtn: {
    backgroundColor: colors.bgSecondary,
  },
  saveBtn: {
    backgroundColor: colors.primary,
  },
  deleteBtn: {
    backgroundColor: '#FEF2F2',
  },
  actionBtnText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
});
