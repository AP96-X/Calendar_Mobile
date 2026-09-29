import { useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';

/**
 * 应用主题装配。
 *
 * - 自定义组件走 `useTheme()` / `useThemedStyles()` 读取调色板
 * - react-native-paper 组件走 PaperProvider 的 MD3 主题（深浅两套）
 *
 * 注意：必须显式传入 Paper 主题的深浅两套取值，否则 Paper 会自行跟随系统，
 * 出现「应用内选浅色、系统是深色」时 TextInput 文字不可辨认的问题。
 */
function ThemedApp() {
  const { resolved, colors } = useTheme();

  const paperTheme = useMemo(() => {
    const base = resolved === 'dark' ? MD3DarkTheme : MD3LightTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        onPrimary: colors.textInverse,
        onSurface: colors.text,
        onSurfaceVariant: colors.textSecondary,
        outline: colors.borderDark,
        background: colors.bg,
        surface: colors.bg,
        surfaceVariant: colors.bgSecondary,
        error: colors.danger,
        onError: colors.textInverse,
      },
    };
  }, [resolved, colors]);

  return (
    <PaperProvider theme={paperTheme}>
      <SafeAreaProvider>
        <AppNavigator />
        <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
      </SafeAreaProvider>
    </PaperProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  );
}
