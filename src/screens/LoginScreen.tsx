import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { TextInput, Button, Checkbox, Divider, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../stores/auth';
import { getApiBaseUrl, setApiBaseUrl, normalizeUrl, testConnection } from '../api/config';
import { colors } from '../theme/colors';
import { spacing, fontSize, radius } from '../theme/spacing';

export default function LoginScreen() {
  const { login } = useAuthStore();

  // Server config state
  const [savedApiUrl, setSavedApiUrl] = useState('');
  const [editingUrl, setEditingUrl] = useState('');
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'ok' | 'fail'>('none');
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Load saved API URL on mount
  useEffect(() => {
    (async () => {
      const url = await getApiBaseUrl();
      setSavedApiUrl(url);
      setEditingUrl(url);
      // If no URL saved, auto-expand the config section
      if (!url) {
        setShowServerConfig(true);
      }
      setLoadingConfig(false);
    })();
  }, []);

  // Handlers
  const handleTestConnection = useCallback(async () => {
    const normalized = normalizeUrl(editingUrl);
    if (!normalized) {
      Alert.alert('提示', '请输入服务器地址');
      return;
    }
    setTesting(true);
    setConnectionStatus('none');
    const result = await testConnection(normalized);
    setTesting(false);
    setConnectionStatus(result.ok ? 'ok' : 'fail');
    if (result.ok) {
      // Save the URL on successful test
      await setApiBaseUrl(normalized);
      setSavedApiUrl(normalized);
      setEditingUrl(normalized);
    }
    Alert.alert(result.ok ? '连接成功' : '连接失败', result.message);
  }, [editingUrl]);

  const handleSaveUrl = useCallback(async () => {
    const normalized = normalizeUrl(editingUrl);
    await setApiBaseUrl(normalized);
    setSavedApiUrl(normalized);
    setEditingUrl(normalized);
    setShowServerConfig(false);
    setConnectionStatus('none');
  }, [editingUrl]);

  const handleLogin = useCallback(async () => {
    if (!savedApiUrl) {
      Alert.alert('提示', '请先配置服务器地址');
      setShowServerConfig(true);
      return;
    }
    if (!username.trim()) {
      setLoginError('请输入用户名');
      return;
    }
    if (!password) {
      setLoginError('请输入密码');
      return;
    }

    setLoginError('');
    setSubmitting(true);
    const result = await login({
      username: username.trim(),
      password,
      remember,
    });
    setSubmitting(false);

    if (!result.success) {
      setLoginError(result.error || '登录失败');
    }
  }, [savedApiUrl, username, password, remember, login]);

  if (loadingConfig) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo / Title */}
          <View style={styles.header}>
            <MaterialCommunityIcons name="calendar-month" size={64} color={colors.primary} />
            <Text style={styles.appTitle}>日历</Text>
            <Text style={styles.appSubtitle}>农历 · 节气 · 事件管理</Text>
          </View>

          {/* Server Configuration Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>服务器地址</Text>
              {savedApiUrl ? (
                <Button
                  mode="text"
                  compact
                  onPress={() => {
                    setShowServerConfig(!showServerConfig);
                    setEditingUrl(savedApiUrl);
                    setConnectionStatus('none');
                  }}
                  labelStyle={styles.linkText}
                >
                  {showServerConfig ? '收起' : '修改'}
                </Button>
              ) : null}
            </View>

            {savedApiUrl && !showServerConfig ? (
              <View style={styles.savedUrlRow}>
                <MaterialCommunityIcons
                  name={connectionStatus === 'ok' ? 'check-circle' : 'server-network'}
                  size={20}
                  color={connectionStatus === 'ok' ? colors.success : colors.textSecondary}
                />
                <Text style={styles.savedUrlText} numberOfLines={1}>
                  {savedApiUrl}
                </Text>
              </View>
            ) : (
              <View>
                <TextInput
                  label="服务器地址"
                  value={editingUrl}
                  onChangeText={(text) => {
                    setEditingUrl(text);
                    setConnectionStatus('none');
                  }}
                  placeholder="如 192.168.1.100:5000"
                  mode="outlined"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  style={styles.input}
                  right={
                    connectionStatus !== 'none' ? (
                      <TextInput.Icon
                        icon={connectionStatus === 'ok' ? 'check-circle' : 'alert-circle'}
                        color={connectionStatus === 'ok' ? colors.success : colors.danger}
                      />
                    ) : undefined
                  }
                />
                <View style={styles.urlActions}>
                  <Button
                    mode="outlined"
                    onPress={handleTestConnection}
                    loading={testing}
                    disabled={testing || !editingUrl.trim()}
                    style={styles.urlButton}
                  >
                    测试连接
                  </Button>
                  {savedApiUrl ? (
                    <Button
                      mode="contained"
                      onPress={handleSaveUrl}
                      disabled={!editingUrl.trim()}
                      style={styles.urlButton}
                    >
                      保存
                    </Button>
                  ) : null}
                </View>
              </View>
            )}
          </View>

          <Divider style={styles.divider} />

          {/* Login Form */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>登录</Text>

            <TextInput
              label="用户名"
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                setLoginError('');
              }}
              mode="outlined"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              left={<TextInput.Icon icon="account" />}
            />

            <TextInput
              label="密码"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setLoginError('');
              }}
              mode="outlined"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              left={<TextInput.Icon icon="lock" />}
            />

            <View style={styles.rememberRow}>
              <Checkbox
                status={remember ? 'checked' : 'unchecked'}
                onPress={() => setRemember(!remember)}
                color={colors.primary}
              />
              <Text style={styles.rememberText} onPress={() => setRemember(!remember)}>
                记住我
              </Text>
            </View>

            {loginError ? (
              <View style={styles.errorBox}>
                <MaterialCommunityIcons name="alert-circle" size={16} color={colors.danger} />
                <Text style={styles.errorText}>{loginError}</Text>
              </View>
            ) : null}

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={submitting}
              disabled={submitting}
              style={styles.loginButton}
              contentStyle={styles.loginButtonContent}
            >
              {submitting ? '登录中...' : '登录'}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
  },
  flex: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  appTitle: {
    fontSize: fontSize.xxxl,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: spacing.md,
  },
  appSubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  savedUrlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  savedUrlText: {
    fontSize: fontSize.md,
    color: colors.text,
    flex: 1,
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: colors.bg,
  },
  urlActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  urlButton: {
    flex: 1,
  },
  linkText: {
    fontSize: fontSize.sm,
  },
  divider: {
    marginVertical: spacing.sm,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  rememberText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
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
  loginButton: {
    marginTop: spacing.xs,
    borderRadius: radius.md,
  },
  loginButtonContent: {
    paddingVertical: spacing.sm,
  },
});
