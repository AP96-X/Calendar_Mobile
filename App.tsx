import { StatusBar } from 'expo-status-bar';
import { MD3LightTheme, PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { colors } from './src/theme/colors';

// 应用整体为浅色设计（app.json 中 userInterfaceStyle = "light"）。
// 这里显式固定为浅色主题：否则 react-native-paper 会跟随系统深色模式自动切换成
// 深色主题，导致 TextInput 等组件的文字/标签变为浅色，在浅色背景上难以辨认。
const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    onSurface: colors.text,
    onSurfaceVariant: colors.textSecondary,
    outline: colors.borderDark,
    background: colors.bg,
    surface: colors.bg,
  },
};

export default function App() {
  return (
    <PaperProvider theme={paperTheme}>
      <SafeAreaProvider>
        <AppNavigator />
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </PaperProvider>
  );
}
