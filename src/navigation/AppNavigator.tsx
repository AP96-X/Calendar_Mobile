import React, { useEffect, useMemo } from 'react';
import {
  DarkTheme as NavDarkTheme,
  DefaultTheme as NavDefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useAuthStore } from '../stores/auth';
import LoginScreen from '../screens/LoginScreen';
import TabNavigator from './TabNavigator';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import type { Palette } from '../theme/palette';

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="Main" component={TabNavigator} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { refresh } = useAuthStore();
  const { resolved, colors } = useTheme();

  useEffect(() => {
    refresh();
  }, [refresh]);

  // 导航容器主题：屏幕切换时的背景/文字跟随深浅色
  const navigationTheme = useMemo(() => {
    const base = resolved === 'dark' ? NavDarkTheme : NavDefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.bg,
        card: colors.bg,
        text: colors.text,
        border: colors.border,
        notification: colors.danger,
      },
    };
  }, [resolved, colors]);

  return (
    <NavigationContainer theme={navigationTheme}>
      <RootNavigator />
    </NavigationContainer>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
});
