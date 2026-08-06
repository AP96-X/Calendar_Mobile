import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL_KEY = 'api_base_url';

/**
 * Check if a hostname is a local/private address.
 * Local addresses use HTTP, public domains use HTTPS.
 */
function isLocalAddress(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  // localhost
  if (lower === 'localhost' || lower === '127.0.0.1') return true;
  // 10.x.x.x
  if (/^10\.\d+\.\d+\.\d+/.test(lower)) return true;
  // 172.16-31.x.x
  if (/^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+/.test(lower)) return true;
  // 192.168.x.x
  if (/^192\.168\.\d+\.\d+/.test(lower)) return true;
  return false;
}

/**
 * Normalize a URL entered by the user:
 * - Trim whitespace
 * - Prepend http:// for local addresses, https:// for public domains
 * - Remove trailing slash
 */
export function normalizeUrl(url: string): string {
  let normalized = url.trim();
  if (!normalized) return '';
  // Prepend protocol if missing
  if (!/^https?:\/\//i.test(normalized)) {
    // Extract hostname (before port or path)
    const hostMatch = normalized.match(/^([^:/]+)/);
    const hostname = hostMatch ? hostMatch[1] : '';
    // Local/private IP → HTTP; public domain → HTTPS
    const protocol = isLocalAddress(hostname) ? 'http' : 'https';
    normalized = `${protocol}://${normalized}`;
  }
  // Remove trailing slash
  normalized = normalized.replace(/\/+$/, '');
  return normalized;
}

/** Get the stored API base URL */
export async function getApiBaseUrl(): Promise<string> {
  const url = await AsyncStorage.getItem(API_URL_KEY);
  return url || '';
}

/** Save the API base URL (normalized) */
export async function setApiBaseUrl(url: string): Promise<void> {
  const normalized = normalizeUrl(url);
  if (normalized) {
    await AsyncStorage.setItem(API_URL_KEY, normalized);
  } else {
    await AsyncStorage.removeItem(API_URL_KEY);
  }
}

/** Clear the stored API base URL */
export async function clearApiBaseUrl(): Promise<void> {
  await AsyncStorage.removeItem(API_URL_KEY);
}

/**
 * Test connectivity to the given API URL.
 * Returns { ok: boolean; message: string }
 */
export async function testConnection(url: string): Promise<{ ok: boolean; message: string }> {
  const normalized = normalizeUrl(url);
  if (!normalized) {
    return { ok: false, message: '请输入服务器地址' };
  }
  try {
    const response = await axios.get(`${normalized}/api/auth/status`, {
      timeout: 10000,
    });
    if (response.status === 200) {
      return { ok: true, message: '连接成功' };
    }
    return { ok: false, message: `服务器返回状态码 ${response.status}` };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        return { ok: false, message: '连接超时，请检查地址和网络' };
      }
      if (error.response) {
        // Server responded with error status - still means it's reachable
        return { ok: true, message: '连接成功' };
      }
      return { ok: false, message: '无法连接到服务器，请检查地址' };
    }
    return { ok: false, message: '连接失败，请检查地址' };
  }
}

/** Build a full URL from a path, using the stored API base URL */
export async function getFullUrl(path: string): Promise<string> {
  const baseUrl = await getApiBaseUrl();
  if (!baseUrl) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}
