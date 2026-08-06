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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { TextInput, Button, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { eventsApi } from '../api/events';
import { EVENT_COLORS } from '../utils/calendar';
import type { CalendarEvent, EventInput } from '../types';
import { colors } from '../theme/colors';
import { spacing, fontSize, radius } from '../theme/spacing';

interface EventFormSheetProps {
  visible: boolean;
  mode: 'add' | 'edit';
  event?: CalendarEvent | null;
  defaultDate: string;
  onClose: () => void;
  onSaved: () => void;
}

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
  const [time, setTime] = useState('');
  const [selectedColor, setSelectedColor] = useState(EVENT_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Reset form when sheet opens
  useEffect(() => {
    if (visible) {
      if (mode === 'edit' && event) {
        setTitle(event.title);
        setDate(event.date);
        setTime(event.time || '');
        setSelectedColor(event.color);
      } else {
        setTitle('');
        setDate(defaultDate);
        setTime('');
        setSelectedColor(EVENT_COLORS[0]);
      }
      setError('');
    }
  }, [visible, mode, event, defaultDate]);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      setError('请输入事件内容');
      return;
    }
    if (!date) {
      setError('请选择日期');
      return;
    }

    setError('');
    setSaving(true);

    // Validate and normalize color
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;
    const finalColor = hexPattern.test(selectedColor) ? selectedColor.toUpperCase() : '#4A90D9';

    const data: EventInput = {
      title: title.trim(),
      date,
      time: time.trim() || null,
      color: finalColor,
    };

    try {
      if (mode === 'edit' && event) {
        await eventsApi.update(event.id, data);
      } else {
        await eventsApi.create(data);
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setError(e.response?.data?.error || e.message || '保存失败');
    } finally {
      setSaving(false);
    }
  }, [title, date, time, selectedColor, mode, event, onSaved, onClose]);

  const handleDelete = useCallback(() => {
    if (!event) return;
    Alert.alert(
      '确认删除',
      `确定要删除事件"${event.title}"吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await eventsApi.delete(event.id);
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
  }, [event, onSaved, onClose]);

  // Simple date increment/decrement
  const adjustDate = (delta: number) => {
    const d = dayjs(date).add(delta, 'day');
    setDate(d.format('YYYY-MM-DD'));
  };

  return (
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
                    <Text style={styles.dateText}>
                      {dayjs(date).format('YYYY年MM月DD日')}
                    </Text>
                    <TouchableOpacity onPress={() => adjustDate(1)} style={styles.dateBtn}>
                      <MaterialCommunityIcons name="chevron-right" size={24} color={colors.primary} />
                    </TouchableOpacity>
                  </View>

                  {/* Time input */}
                  <TextInput
                    label="时间（可选）"
                    value={time}
                    onChangeText={setTime}
                    mode="outlined"
                    placeholder="如 09:30"
                    style={styles.input}
                    keyboardType="numeric"
                  />

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
                        { backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(selectedColor) ? selectedColor : '#4A90D9' },
                      ]}
                    />
                    <TextInput
                      label="自定义颜色编号"
                      value={selectedColor}
                      onChangeText={(text) => setSelectedColor(text)}
                      mode="outlined"
                      placeholder="#4A90D9"
                      style={styles.hexInput}
                      autoCapitalize="characters"
                    />
                  </View>

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
    maxHeight: '85%',
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
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
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
