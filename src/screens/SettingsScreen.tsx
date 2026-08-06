import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  Modal,
  Linking,
} from 'react-native';
import { TextInput, Button, Divider, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { cacheDirectory, writeAsStringAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../stores/auth';
import { getApiBaseUrl, setApiBaseUrl, normalizeUrl, testConnection } from '../api/config';
import { profileApi } from '../api/profile';
import { eventsApi } from '../api/events';
import { getCookie } from '../api/client';
import { siteApi } from '../api/site';
import { colors } from '../theme/colors';
import { spacing, fontSize, radius } from '../theme/spacing';
import dayjs from 'dayjs';

export default function SettingsScreen() {
  const { user, logout, refresh } = useAuthStore();
  const [apiUrl, setApiUrl] = useState('');
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Export month picker
  const [exportMonthVisible, setExportMonthVisible] = useState(false);
  const [exportYearVisible, setExportYearVisible] = useState(false);
  const [exportYear, setExportYear] = useState(dayjs().year());
  const [exportMonth, setExportMonth] = useState(dayjs().month() + 1);
  const [availableYears, setAvailableYears] = useState<number[]>([dayjs().year()]);

  // Site info (ICP / Public Security numbers)
  const [icpNumber, setIcpNumber] = useState('');
  const [publicSecurityNumber, setPublicSecurityNumber] = useState('');

  // Profile editing
  const [displayName, setDisplayName] = useState('');
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Password change
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const url = await getApiBaseUrl();
    setApiUrl(url);
    setUrlInput(url);
    if (user?.display_name) {
      setDisplayName(user.display_name);
    }
    // Fetch site info (ICP / Public Security numbers)
    if (url) {
      siteApi.getInfo().then((info) => {
        setIcpNumber(info.icp_number);
        setPublicSecurityNumber(info.public_security_number);
      }).catch(() => {});
    }
    setLoading(false);
  };

  const handleSaveUrl = async () => {
    const normalized = normalizeUrl(urlInput);
    await setApiBaseUrl(normalized);
    setApiUrl(normalized);
    setUrlInput(normalized);
    setEditingUrl(false);
    Alert.alert('提示', '服务器地址已保存，请重新登录');
    await logout();
  };

  const handleTestConnection = async () => {
    const normalized = normalizeUrl(urlInput);
    if (!normalized) {
      Alert.alert('提示', '请输入服务器地址');
      return;
    }
    setTesting(true);
    const result = await testConnection(normalized);
    setTesting(false);
    Alert.alert(result.ok ? '连接成功' : '连接失败', result.message);
  };

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      Alert.alert('提示', '请输入显示名称');
      return;
    }
    setSavingProfile(true);
    try {
      await profileApi.update(displayName.trim());
      await refresh();
      setEditingProfile(false);
      Alert.alert('成功', '个人信息已更新');
    } catch (error: unknown) {
      const e = error as { response?: { data?: { error?: string } }; message?: string };
      Alert.alert('错误', e.response?.data?.error || e.message || '保存失败');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) {
      Alert.alert('提示', '请输入旧密码和新密码');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('提示', '新密码至少6位');
      return;
    }
    setChangingPassword(true);
    try {
      await profileApi.changePassword(oldPassword, newPassword);
      Alert.alert('成功', '密码已修改');
      setOldPassword('');
      setNewPassword('');
      setShowPasswordSection(false);
    } catch (error: unknown) {
      const e = error as { response?: { data?: { error?: string } }; message?: string };
      Alert.alert('错误', e.response?.data?.error || e.message || '修改失败');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;

      const file = result.assets[0];
      setImporting(true);
      const res = await eventsApi.importExcel(file.uri, file.name);
      Alert.alert('成功', res.message || '事件导入完成');
    } catch (error: unknown) {
      const e = error as { response?: { data?: { error?: string } }; message?: string };
      Alert.alert('导入失败', e.response?.data?.error || e.message || '导入失败');
    } finally {
      setImporting(false);
    }
  };

  const handleExport = () => {
    Alert.alert(
      '导出事件',
      '请选择导出范围',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '选择月份导出',
          onPress: () => {
            setExportYear(dayjs().year());
            setExportMonth(dayjs().month() + 1);
            setExportMonthVisible(true);
          },
        },
        {
          text: '按年导出',
          onPress: async () => {
            try {
              const res = await eventsApi.getAvailableYears();
              if (res.years.length > 0) {
                setAvailableYears(res.years);
                setExportYear(res.years[res.years.length - 1]);
              } else {
                setAvailableYears([dayjs().year()]);
                setExportYear(dayjs().year());
              }
            } catch {
              setAvailableYears([dayjs().year()]);
              setExportYear(dayjs().year());
            }
            setExportYearVisible(true);
          },
        },
        {
          text: '导出全部',
          onPress: () => doExport(null, null),
        },
      ]
    );
  };

  const confirmMonthExport = () => {
    setExportMonthVisible(false);
    doExport(`${exportYear}`, `${exportMonth}`);
  };

  const confirmYearExport = () => {
    setExportYearVisible(false);
    doExport(`${exportYear}`, null);
  };

  const doExport = async (year: string | null, month: string | null) => {
    const isAll = year === null;
    const isYearOnly = year !== null && month === null;
    try {
      setExporting(true);
      const baseUrl = await getApiBaseUrl();
      const cookie = await getCookie();
      let fileName: string;
      let exportUrl: string;

      if (isAll) {
        fileName = 'calendar-all.xlsx';
        exportUrl = `${baseUrl}/api/events/export?all=1`;
      } else if (isYearOnly) {
        fileName = `calendar-${year}.xlsx`;
        exportUrl = `${baseUrl}/api/events/export?year=${year}`;
      } else {
        fileName = `calendar-${year}${month}.xlsx`;
        exportUrl = `${baseUrl}/api/events/export?year=${year}&month=${month}`;
      }

      // Use XMLHttpRequest for reliable binary download in React Native.
      // fetch's blob/arrayBuffer and expo-file-system's downloadAsync both have
      // issues on Android (Expo SDK 57) that corrupt binary content, producing
      // "Ljava.lang.Object" strings in the output file.
      // XHR with responseType='arraybuffer' is the most reliable approach.
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', exportUrl, true);
        xhr.responseType = 'arraybuffer';
        if (cookie) {
          xhr.setRequestHeader('Cookie', cookie);
        }
        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve(xhr.response as ArrayBuffer);
          } else {
            reject(new Error(`服务器返回状态码 ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error('网络请求失败，请检查网络连接'));
        xhr.ontimeout = () => reject(new Error('请求超时'));
        xhr.timeout = 30000;
        xhr.send();
      });

      // Convert ArrayBuffer to base64 string
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      const chunkSize = 0x8000; // 32KB chunks to avoid call stack overflow
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const base64Data = btoa(binary);

      // Write base64 data to cache directory
      const fileUri = `${cacheDirectory}${fileName}`;
      await writeAsStringAsync(fileUri, base64Data, {
        encoding: 'base64',
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: '导出日历',
          UTI: 'org.openxmlformats.spreadsheetml.sheet',
        });
      } else {
        Alert.alert('提示', `文件已保存到: ${fileUri}`);
      }
    } catch (error: unknown) {
      const e = error as { message?: string };
      Alert.alert('导出失败', e.message || '导出失败');
    } finally {
      setExporting(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('退出登录', '确定要退出登录吗？', [
      { text: '取消', style: 'cancel' },
      { text: '确定', style: 'destructive', onPress: () => logout() },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator animating />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: spacing.xxxl }}>
        {/* Header */}
        <View style={styles.screenHeader}>
          <Text style={styles.screenTitle}>设置</Text>
        </View>

        {/* User Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>个人信息</Text>
          {editingProfile ? (
            <View>
              <TextInput
                label="显示名称"
                value={displayName}
                onChangeText={setDisplayName}
                mode="outlined"
                style={styles.input}
              />
              <View style={styles.rowButtons}>
                <Button mode="outlined" onPress={() => { setEditingProfile(false); setDisplayName(user?.display_name || ''); }} style={styles.flexBtn}>
                  取消
                </Button>
                <Button mode="contained" onPress={handleSaveProfile} loading={savingProfile} style={styles.flexBtn}>
                  保存
                </Button>
              </View>
            </View>
          ) : (
            <View style={styles.userInfoCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(user?.display_name || user?.username || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user?.display_name || user?.username}</Text>
                <Text style={styles.userDetail}>@{user?.username}</Text>
                <View style={[styles.roleBadge, user?.role === 'admin' ? styles.roleAdmin : styles.roleUser]}>
                  <Text style={styles.roleText}>{user?.role === 'admin' ? '管理员' : '普通用户'}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setEditingProfile(true)} style={styles.editBtn}>
                <MaterialCommunityIcons name="pencil" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Divider />

        {/* Password Change */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setShowPasswordSection(!showPasswordSection)}
          >
            <MaterialCommunityIcons name="lock-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.sectionTitle}>修改密码</Text>
            <MaterialCommunityIcons
              name={showPasswordSection ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textMuted}
            />
          </TouchableOpacity>
          {showPasswordSection && (
            <View>
              <TextInput
                label="旧密码"
                value={oldPassword}
                onChangeText={setOldPassword}
                mode="outlined"
                secureTextEntry
                style={styles.input}
              />
              <TextInput
                label="新密码（至少6位）"
                value={newPassword}
                onChangeText={setNewPassword}
                mode="outlined"
                secureTextEntry
                style={styles.input}
              />
              <Button mode="contained" onPress={handleChangePassword} loading={changingPassword}>
                修改密码
              </Button>
            </View>
          )}
        </View>

        <Divider />

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>数据管理</Text>
          <TouchableOpacity style={styles.menuItem} onPress={handleImport} disabled={importing || exporting}>
            <MaterialCommunityIcons name="file-import" size={22} color={colors.primary} />
            <Text style={styles.menuText}>导入事件 (Excel)</Text>
            {importing && <ActivityIndicator size="small" color={colors.primary} />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={handleExport} disabled={exporting || importing}>
            <MaterialCommunityIcons name="file-export" size={22} color={colors.success} />
            <Text style={styles.menuText}>导出事件 (Excel)</Text>
            {exporting && <ActivityIndicator size="small" color={colors.success} />}
          </TouchableOpacity>
        </View>

        <Divider />

        {/* API Server Configuration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>服务器地址</Text>
          {editingUrl ? (
            <View>
              <TextInput
                label="服务器地址"
                value={urlInput}
                onChangeText={setUrlInput}
                placeholder="如 your-domain.com"
                mode="outlined"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                style={styles.input}
              />
              <View style={styles.rowButtons}>
                <Button mode="outlined" onPress={handleTestConnection} loading={testing} disabled={testing} style={styles.flexBtn}>
                  测试连接
                </Button>
                <Button mode="contained" onPress={handleSaveUrl} style={styles.flexBtn}>
                  保存
                </Button>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.serverCard} onPress={() => { setEditingUrl(true); setUrlInput(apiUrl); }}>
              <MaterialCommunityIcons name="server-network" size={20} color={colors.textSecondary} />
              <Text style={styles.serverUrl} numberOfLines={1}>{apiUrl || '未配置'}</Text>
              <MaterialCommunityIcons name="pencil" size={18} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        <Divider />

        {/* Logout */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <MaterialCommunityIcons name="logout" size={20} color={colors.danger} />
            <Text style={styles.logoutText}>退出登录</Text>
          </TouchableOpacity>
        </View>

        {/* App version */}
        <Text style={styles.versionText}>日历 v1.0.0</Text>
        {icpNumber ? (
          <TouchableOpacity
            onPress={() => Linking.openURL('https://beian.miit.gov.cn/')}
            style={styles.icpContainer}
          >
            <Text style={styles.icpText}>{icpNumber}</Text>
          </TouchableOpacity>
        ) : null}
        {publicSecurityNumber ? (
          <TouchableOpacity
            onPress={() => Linking.openURL('http://www.beian.gov.cn/portal/registerSystemInfo')}
            style={styles.icpContainer}
          >
            <Text style={styles.icpText}>{publicSecurityNumber}</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      {/* Export Month Picker Modal */}
      <Modal visible={exportMonthVisible} transparent animationType="fade" onRequestClose={() => setExportMonthVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>选择导出月份</Text>

            {/* Year selector */}
            <View style={styles.yearRow}>
              <TouchableOpacity
                style={styles.yearBtn}
                onPress={() => setExportYear(exportYear - 1)}
              >
                <MaterialCommunityIcons name="chevron-left" size={24} color={colors.primary} />
              </TouchableOpacity>
              <Text style={styles.yearText}>{exportYear} 年</Text>
              <TouchableOpacity
                style={styles.yearBtn}
                onPress={() => setExportYear(exportYear + 1)}
              >
                <MaterialCommunityIcons name="chevron-right" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Month grid */}
            <View style={styles.monthGrid}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.monthCell,
                    exportMonth === m && styles.monthCellActive,
                  ]}
                  onPress={() => setExportMonth(m)}
                >
                  <Text
                    style={[
                      styles.monthCellText,
                      exportMonth === m && styles.monthCellTextActive,
                    ]}
                  >
                    {m}月
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => setExportMonthVisible(false)} style={styles.modalBtn}>
                取消
              </Button>
              <Button mode="contained" onPress={confirmMonthExport} style={styles.modalBtn}>
                导出 {exportYear}年{exportMonth}月
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Export Year Picker Modal */}
      <Modal visible={exportYearVisible} transparent animationType="fade" onRequestClose={() => setExportYearVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>选择导出年份</Text>

            {/* Year list */}
            <View style={styles.yearListContainer}>
              {availableYears.map((y) => (
                <TouchableOpacity
                  key={y}
                  style={[
                    styles.yearCell,
                    exportYear === y && styles.yearCellActive,
                  ]}
                  onPress={() => setExportYear(y)}
                >
                  <Text
                    style={[
                      styles.yearCellText,
                      exportYear === y && styles.yearCellTextActive,
                    ]}
                  >
                    {y} 年
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => setExportYearVisible(false)} style={styles.modalBtn}>
                取消
              </Button>
              <Button mode="contained" onPress={confirmYearExport} style={styles.modalBtn}>
                导出 {exportYear}年
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
  },
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenHeader: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  screenTitle: {
    fontSize: fontSize.xxxl,
    fontWeight: 'bold',
    color: colors.text,
  },
  section: {
    padding: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    color: colors.textSecondary,
    flex: 1,
  },
  userInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.textInverse,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
  },
  userDetail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.round,
    marginTop: 4,
  },
  roleAdmin: {
    backgroundColor: '#FEF3C7',
  },
  roleUser: {
    backgroundColor: '#EBF5FF',
  },
  roleText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  editBtn: {
    padding: spacing.sm,
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: colors.bg,
  },
  rowButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flexBtn: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  menuText: {
    fontSize: fontSize.md,
    color: colors.text,
    flex: 1,
  },
  serverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  serverUrl: {
    fontSize: fontSize.md,
    color: colors.text,
    flex: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#FEF2F2',
    gap: spacing.sm,
  },
  logoutText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.danger,
  },
  versionText: {
    textAlign: 'center',
    fontSize: fontSize.sm,
    color: colors.textMuted,
    paddingVertical: spacing.lg,
  },
  icpContainer: {
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  icpText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  // Export month picker modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 360,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    marginBottom: spacing.lg,
  },
  yearBtn: {
    padding: spacing.sm,
  },
  yearText: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.text,
    minWidth: 100,
    textAlign: 'center',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  monthCell: {
    width: '30%',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
    backgroundColor: colors.bgSecondary,
  },
  monthCellActive: {
    backgroundColor: colors.primary,
  },
  monthCellText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  monthCellTextActive: {
    color: colors.textInverse,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  modalBtn: {
    flex: 1,
  },
  // Export year picker modal styles
  yearListContainer: {
    maxHeight: 280,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginBottom: spacing.lg,
  },
  yearCell: {
    width: '48%',
    margin: '1%',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.bgSecondary,
  },
  yearCellActive: {
    backgroundColor: colors.primary,
  },
  yearCellText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  yearCellTextActive: {
    color: colors.textInverse,
  },
});
