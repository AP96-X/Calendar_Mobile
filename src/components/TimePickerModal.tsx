import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, fontSize, radius } from '../theme/spacing';

interface TimePickerModalProps {
  visible: boolean;
  /** 当前值 HH:MM，允许空串 */
  value: string;
  title?: string;
  onConfirm: (time: string) => void;
  onClose: () => void;
  /** 是否显示「清除」按钮（用于可选时间） */
  allowClear?: boolean;
}

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;
const PAD = ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2);
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const pad = (n: number) => String(n).padStart(2, '0');

/** 纯 JS 时间选择器（小时 + 分钟两列滚轮），不依赖原生模块 */
export default function TimePickerModal({
  visible,
  value,
  title = '选择时间',
  onConfirm,
  onClose,
  allowClear = false,
}: TimePickerModalProps) {
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const hourRef = useRef<ScrollView>(null);
  const minuteRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!visible) return;
    const [h, m] = TIME_RE.test(value) ? value.split(':').map(Number) : [9, 0];
    setHour(h);
    setMinute(m);
    // 等 Modal 完成布局后再定位到当前值
    const timer = setTimeout(() => {
      hourRef.current?.scrollTo({ y: h * ITEM_HEIGHT, animated: false });
      minuteRef.current?.scrollTo({ y: m * ITEM_HEIGHT, animated: false });
    }, 60);
    return () => clearTimeout(timer);
  }, [visible, value]);

  const scrollToIndex = (
    ref: React.RefObject<ScrollView | null>,
    index: number
  ) => {
    ref.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true });
  };

  const handleConfirm = () => {
    onConfirm(`${pad(hour)}:${pad(minute)}`);
    onClose();
  };

  const renderColumn = (
    values: number[],
    selected: number,
    onSelect: (v: number) => void,
    ref: React.RefObject<ScrollView | null>
  ) => (
    <ScrollView
      ref={ref}
      style={styles.column}
      contentContainerStyle={styles.columnContent}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_HEIGHT}
      decelerationRate="fast"
      onMomentumScrollEnd={(e) => {
        const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
        const clamped = Math.max(0, Math.min(values.length - 1, index));
        onSelect(values[clamped]);
      }}
    >
      {values.map((v) => {
        const active = v === selected;
        return (
          <TouchableOpacity
            key={v}
            style={styles.item}
            onPress={() => {
              onSelect(v);
              scrollToIndex(ref, v);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.itemText, active && styles.itemTextActive]}>
              {pad(v)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              <View style={styles.headerRow}>
                <Text style={styles.title}>{title}</Text>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.preview}>{`${pad(hour)}:${pad(minute)}`}</Text>

              <View style={styles.wheels}>
                {/* 中间高亮条 */}
                <View pointerEvents="none" style={styles.highlight} />
                {renderColumn(HOURS, hour, setHour, hourRef)}
                <Text style={styles.colon}>:</Text>
                {renderColumn(MINUTES, minute, setMinute, minuteRef)}
              </View>

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
                <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={onClose}>
                  <Text style={[styles.actionText, { color: colors.text }]}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.confirmBtn]} onPress={handleConfirm}>
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
    maxWidth: 320,
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
  preview: {
    textAlign: 'center',
    fontSize: fontSize.xxxl,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  wheels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
  },
  highlight: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    top: PAD,
    height: ITEM_HEIGHT,
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
  },
  column: {
    width: 72,
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
  },
  columnContent: {
    paddingTop: PAD,
    paddingBottom: PAD,
  },
  item: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
  },
  itemTextActive: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  colon: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.textMuted,
    paddingHorizontal: spacing.xs,
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
