import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { darkColors, lightColors, type Palette } from './palette';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

/** 与后端 Web 端保持同名，便于用户理解（存储介质不同：Web 用 localStorage，这里用 AsyncStorage） */
export const THEME_STORAGE_KEY = 'calendar-theme';

interface ThemeContextValue {
  /** 用户选择：浅色 / 深色 / 跟随系统 */
  mode: ThemeMode;
  /** 实际生效的主题（system 解析后的结果） */
  resolved: ResolvedTheme;
  /** 当前生效的调色板 */
  colors: Palette;
  setMode: (mode: ThemeMode) => void;
  /** 在浅色与深色之间切换（system 会被解析为具体值） */
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'system',
  resolved: 'light',
  colors: lightColors,
  setMode: () => {},
  toggle: () => {},
});

/** 读取当前主题：mode / resolved / colors / setMode / toggle */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

/**
 * 把「依赖调色板的样式工厂」变成随主题自动重建的样式。
 *
 * 用法：
 *   const createStyles = (c: Palette) => StyleSheet.create({ ... c.bg ... });
 *   // 组件内
 *   const styles = useThemedStyles(createStyles);
 *
 * 工厂必须是模块级常量（引用稳定），否则每次渲染都会重建样式。
 */
export function useThemedStyles<T>(factory: (colors: Palette) => T): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [factory, colors]);
}

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [hydrated, setHydrated] = useState(false);

  // 冷启动读取本地偏好。读取完成前不渲染子树，避免「先浅色再切深色」的闪屏。
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((raw) => {
        if (!alive) return;
        if (isThemeMode(raw)) setModeState(raw);
      })
      .catch(() => {
        // 读取失败（存储不可用等）时保持「跟随系统」
      })
      .finally(() => {
        if (alive) setHydrated(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => {
      // 写入失败不影响本次会话生效
    });
  }, []);

  const resolved: ResolvedTheme = mode === 'system'
    ? (systemScheme === 'dark' ? 'dark' : 'light')
    : mode;
  const colors = resolved === 'dark' ? darkColors : lightColors;

  const toggle = useCallback(() => {
    setMode(resolved === 'dark' ? 'light' : 'dark');
  }, [resolved, setMode]);

  const value = useMemo(
    () => ({ mode, resolved, colors, setMode, toggle }),
    [mode, resolved, colors, setMode, toggle],
  );

  // 首帧用系统主题取色铺底：跟随系统的用户完全无感，手动指定深色的用户
  // 也只会看到一帧同色系底色，而不是白屏。
  if (!hydrated) {
    return <View style={[styles.boot, { backgroundColor: systemScheme === 'dark' ? darkColors.bg : lightColors.bg }]} />;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
  },
});
