import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { TextInput, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { eventsApi } from '../api/events';
import { EVENT_COLORS, formatEventTime } from '../utils/calendar';
import type { CalendarEvent } from '../types';
import { colors } from '../theme/colors';
import { spacing, fontSize, radius } from '../theme/spacing';

interface SearchSheetProps {
  visible: boolean;
  onClose: () => void;
  /** 点击结果：跳转到该事件日期并打开详情 */
  onJump: (event: CalendarEvent) => void;
  /** 结果里切换完成状态（用于刷新日历视图） */
  onToggle: (eventId: number) => void;
}

type StatusFilter = 'all' | '0' | '1';

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: '全部', value: 'all' },
  { label: '未完成', value: '0' },
  { label: '已完成', value: '1' },
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function SearchSheet({ visible, onClose, onJump, onToggle }: SearchSheetProps) {
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [color, setColor] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [results, setResults] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const runSearch = useCallback(async () => {
    const s = start.trim();
    const e = end.trim();
    if (s && !DATE_RE.test(s)) {
      setError('开始日期格式应为 YYYY-MM-DD');
      return;
    }
    if (e && !DATE_RE.test(e)) {
      setError('结束日期格式应为 YYYY-MM-DD');
      return;
    }
    if (s && e && e < s) {
      setError('结束日期不能早于开始日期');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await eventsApi.search({
        q: keyword.trim() || undefined,
        start: s || undefined,
        end: e || undefined,
        color: color || undefined,
        completed: status === 'all' ? undefined : status,
        limit: 200,
      });
      setResults(data);
      setSearched(true);
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [keyword, start, end, color, status]);

  // 打开弹窗时先拉一次（默认展示最近事件）
  useEffect(() => {
    if (visible) runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleToggle = useCallback((ev: CalendarEvent) => {
    onToggle(ev.id);
    // 本地即时更新，避免整表重查
    setResults((prev) => prev.map((x) => (x.id === ev.id ? { ...x, completed: !x.completed } : x)));
  }, [onToggle]);

  const renderItem = ({ item: ev }: { item: CalendarEvent }) => {
    const timeText = formatEventTime(ev);
    return (
      <TouchableOpacity
        style={styles.resultItem}
        activeOpacity={0.7}
        onPress={() => {
          onJump(ev);
          onClose();
        }}
      >
        <TouchableOpacity
          onPress={() => handleToggle(ev)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.resultCheckbox}
        >
          <MaterialCommunityIcons
            name={ev.completed ? 'checkbox-marked' : 'checkbox-blank-outline'}
            size={22}
            color={ev.completed ? colors.success : colors.textMuted}
          />
        </TouchableOpacity>

        <View style={[styles.resultColor, { backgroundColor: ev.color }]} />

        <View style={styles.resultInfo}>
          <View style={styles.resultTop}>
            <Text style={styles.resultDate}>{ev.date}</Text>
            {timeText ? (
              <View style={styles.resultTag}>
                <MaterialCommunityIcons name="clock-outline" size={11} color={colors.textSecondary} />
                <Text style={styles.resultTagText}>{timeText}</Text>
              </View>
            ) : null}
            {ev.recurrence ? (
              <MaterialCommunityIcons name="sync" size={12} color={colors.primary} />
            ) : null}
          </View>
          <Text
            style={[styles.resultTitle, ev.completed && styles.resultTitleDone]}
            numberOfLines={1}
          >
            {ev.title}
          </Text>
          {ev.description ? (
            <Text style={styles.resultDesc} numberOfLines={1}>
              {ev.description}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const header = (
    <View style={styles.filters}>
      <TextInput
        label="搜索标题或备注"
        value={keyword}
        onChangeText={setKeyword}
        mode="outlined"
        placeholder="输入关键字..."
        style={styles.input}
        left={<TextInput.Icon icon="magnify" />}
        onSubmitEditing={runSearch}
        returnKeyType="search"
      />

      <Text style={styles.label}>完成状态</Text>
      <View style={styles.chipRow}>
        {STATUS_OPTIONS.map((opt) => {
          const active = status === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setStatus(opt.value)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>日期范围（可选）</Text>
      <View style={styles.rangeRow}>
        <TextInput
          label="开始日期"
          value={start}
          onChangeText={setStart}
          mode="outlined"
          placeholder="YYYY-MM-DD"
          style={styles.rangeInput}
        />
        <Text style={styles.rangeSep}>-</Text>
        <TextInput
          label="结束日期"
          value={end}
          onChangeText={setEnd}
          mode="outlined"
          placeholder="YYYY-MM-DD"
          style={styles.rangeInput}
        />
      </View>

      <Text style={styles.label}>颜色</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.colorRow}
      >
        <TouchableOpacity
          style={[styles.colorChip, !color && styles.colorChipActive]}
          onPress={() => setColor('')}
        >
          <Text style={[styles.colorChipText, !color && styles.colorChipTextActive]}>全部</Text>
        </TouchableOpacity>
        {EVENT_COLORS.map((c) => (
          <TouchableOpacity
            key={c}
            style={[
              styles.colorDot,
              { backgroundColor: c },
              color.toUpperCase() === c.toUpperCase() && styles.colorDotSelected,
            ]}
            onPress={() => setColor(color.toUpperCase() === c.toUpperCase() ? '' : c)}
          >
            {color.toUpperCase() === c.toUpperCase() ? (
              <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />
            ) : null}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {error ? (
        <View style={styles.errorBox}>
          <MaterialCommunityIcons name="alert-circle" size={16} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <TouchableOpacity style={styles.searchBtn} onPress={runSearch} disabled={loading}>
        {loading ? (
          <ActivityIndicator size="small" color={colors.textInverse} />
        ) : (
          <>
            <MaterialCommunityIcons name="magnify" size={18} color={colors.textInverse} />
            <Text style={styles.searchBtnText}>搜索</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.countText}>
        共 {results.length} 条结果{results.length >= 200 ? '（已达上限，请缩小范围）' : ''}
      </Text>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.sheet}>
                <View style={styles.handle} />
                <View style={styles.headerRow}>
                  <Text style={styles.headerTitle}>搜索 / 筛选事件</Text>
                  <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <FlatList
                  style={styles.list}
                  data={results}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={renderItem}
                  ListHeaderComponent={header}
                  ListEmptyComponent={
                    searched && !loading ? (
                      <View style={styles.empty}>
                        <MaterialCommunityIcons name="magnify-close" size={40} color={colors.textMuted} />
                        <Text style={styles.emptyText}>没有匹配的事件</Text>
                      </View>
                    ) : null
                  }
                  contentContainerStyle={styles.listContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                />
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    height: '88%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderDark,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  filters: {
    gap: spacing.xs,
  },
  input: {
    backgroundColor: colors.bg,
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
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
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rangeInput: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  rangeSep: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  colorChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.round,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  colorChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  colorChipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  colorChipTextActive: {
    color: colors.textInverse,
    fontWeight: '600',
  },
  colorDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorDotSelected: {
    borderWidth: 2,
    borderColor: colors.text,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.danger,
    flex: 1,
  },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
    minHeight: 46,
  },
  searchBtnText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textInverse,
  },
  countText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultCheckbox: {
    padding: 2,
  },
  resultColor: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  resultInfo: {
    flex: 1,
    minWidth: 0,
  },
  resultTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  resultDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  resultTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.bgTertiary,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: radius.sm,
  },
  resultTagText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  resultTitle: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text,
    marginTop: 1,
  },
  resultTitleDone: {
    textDecorationLine: 'line-through',
    opacity: 0.55,
  },
  resultDesc: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
});
