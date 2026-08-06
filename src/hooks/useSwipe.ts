import { useRef } from 'react';
import type { GestureResponderEvent } from 'react-native';
import { PanResponder, Animated } from 'react-native';

interface SwipeConfig {
  /** 触发滑动的最小距离（默认 50） */
  threshold?: number;
  /** 左滑回调（下一页） */
  onSwipeLeft?: () => void;
  /** 右滑回调（上一页） */
  onSwipeRight?: () => void;
}

/**
 * 基于 PanResponder 的左右滑动手势 Hook。
 *
 * 特性：
 * - 回调存储在 ref 中，避免闭包陈旧问题
 * - 内置防抖锁（600ms 冷却），防止快速连续滑动导致跳页
 * - 支持速度判定：快速滑动即使距离不够也能触发
 * - 所有动画使用 useNativeDriver: true，保证 60fps 流畅度
 * - 返回 translateX 供视图做手指跟随效果
 */
export function useSwipe(config: SwipeConfig) {
  // 用 ref 存储最新配置，避免 PanResponder 闭包陈旧
  const configRef = useRef(config);
  configRef.current = config;

  const translateX = useRef(new Animated.Value(0)).current;
  // 防抖锁：一次滑动触发后锁定 600ms，防止连续跳页
  const isSwipingRef = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (
        _evt: GestureResponderEvent,
        gestureState
      ) => {
        // 锁定中不响应新手势
        if (isSwipingRef.current) return false;
        // 水平移动明显大于垂直时才接管
        return (
          Math.abs(gestureState.dx) > 10 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5
        );
      },

      onPanResponderMove: (_evt: GestureResponderEvent, gestureState) => {
        // 手指跟随（阻尼 0.25，轻微位移即可感知）
        translateX.setValue(gestureState.dx * 0.25);
      },

      onPanResponderRelease: (_evt: GestureResponderEvent, gestureState) => {
        // 双重保险：锁定中直接回弹
        if (isSwipingRef.current) {
          Animated.spring(translateX, {
            toValue: 0,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
          }).start();
          return;
        }

        const { threshold = 50, onSwipeLeft, onSwipeRight } = configRef.current;
        const dx = gestureState.dx;
        const vx = gestureState.vx;

        // 距离足够 或 速度足够快 才触发翻页
        const shouldSwipe = Math.abs(dx) > threshold || Math.abs(vx) > 0.5;

        if (shouldSwipe) {
          // 锁定
          isSwipingRef.current = true;

          // 先归位 translateX
          Animated.timing(translateX, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }).start();

          // 触发回调
          if (dx < 0) {
            onSwipeLeft?.();
          } else {
            onSwipeRight?.();
          }

          // 600ms 后解锁（足够等待切换动画完成）
          setTimeout(() => {
            isSwipingRef.current = false;
          }, 600);
        } else {
          // 未达阈值，弹性回弹
          Animated.spring(translateX, {
            toValue: 0,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
          }).start();
        }
      },

      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  return {
    panHandlers: panResponder.panHandlers,
    translateX,
  };
}
