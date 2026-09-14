import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';

interface CalendarSkeletonProps {
  mode: 'month' | 'week' | 'day';
}

/** 首次加载时的骨架屏：用脉冲灰块占位，避免白屏 */
export default function CalendarSkeleton({ mode }: CalendarSkeletonProps) {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  if (mode === 'day') {
    return (
      <Animated.View style={[styles.container, { opacity: pulse }]}>
        <View style={styles.dayHeader}>
          <View style={[styles.bar, { width: '45%', height: 16 }]} />
          <View style={[styles.bar, { width: '25%', height: 12 }]} />
        </View>
        {Array.from({ length: 8 }, (_, i) => (
          <View key={i} style={styles.dayRow}>
            <View style={[styles.bar, { width: 40, height: 10 }]} />
            <View style={[styles.block, { flex: i % 3 === 0 ? 0.6 : 0.35 }]} />
          </View>
        ))}
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: pulse }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={[styles.bar, { width: '40%', height: 18 }]} />
        <View style={[styles.bar, { width: 56, height: 22 }]} />
      </View>
      {/* Grid */}
      <View style={styles.grid}>
        {Array.from({ length: mode === 'week' ? 7 : 42 }, (_, i) => (
          <View
            key={i}
            style={[
              styles.gridCell,
              mode === 'week' ? styles.gridCellWeek : styles.gridCellMonth,
            ]}
          >
            <View style={[styles.bar, { width: 16, height: 12, marginBottom: 4 }]} />
            <View style={[styles.bar, { width: '70%', height: 8, marginBottom: 3 }]} />
            {i % 3 === 0 ? <View style={[styles.bar, { width: '90%', height: 10 }]} /> : null}
            {i % 5 === 0 ? <View style={[styles.bar, { width: '80%', height: 10, marginTop: 3 }]} /> : null}
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridCell: {
    borderWidth: 0.5,
    borderColor: colors.border,
    padding: 5,
  },
  gridCellMonth: {
    width: `${100 / 7}%`,
    height: 76,
  },
  gridCellWeek: {
    width: `${100 / 7}%`,
    height: 160,
  },
  bar: {
    backgroundColor: colors.bgTertiary,
    borderRadius: radius.sm,
  },
  block: {
    height: 20,
    backgroundColor: colors.bgTertiary,
    borderRadius: radius.sm,
    marginLeft: spacing.sm,
  },
  dayHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    height: 44,
  },
});
