import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { getApiBaseUrl } from './config';

const COOKIE_KEY = 'session_cookie';

// Callback that gets invoked on 401 responses
let unauthorizedCallback: (() => void) | null = null;

export function setUnauthorizedCallback(cb: (() => void) | null) {
  unauthorizedCallback = cb;
}

/** Extract session cookie value from Set-Cookie header */
function extractCookie(setCookieHeader: string | string[]): string | null {
  const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  for (const c of cookies) {
    // Match "session=<value>" at the start of the cookie string
    const match = c.match(/^session=([^;]+)/);
    if (match) return `session=${match[1]}`;
  }
  return null;
}

/** Save session cookie to SecureStore */
export async function saveCookie(cookie: string): Promise<void> {
  await SecureStore.setItemAsync(COOKIE_KEY, cookie);
}

/** Get session cookie from SecureStore */
export async function getCookie(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(COOKIE_KEY);
  } catch {
    return null;
  }
}

/** Clear session cookie */
export async function clearCookie(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(COOKIE_KEY);
  } catch {
    // ignore
  }
}

const client = axios.create({
  timeout: 30000,
  withCredentials: true,
});

// Request interceptor: dynamically set baseURL + attach Cookie
client.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Dynamically set baseURL from stored API address
    const baseUrl = await getApiBaseUrl();
    if (baseUrl && !config.url?.startsWith('http')) {
      config.baseURL = baseUrl;
    }
    // Attach session cookie if available
    const cookie = await getCookie();
    if (cookie) {
      config.headers.Cookie = cookie;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: extract Set-Cookie + handle 401
client.interceptors.response.use(
  (response) => {
    // Extract and save session cookie from Set-Cookie header
    const setCookie = response.headers['set-cookie'] || response.headers['Set-Cookie'];
    if (setCookie) {
      const cookie = extractCookie(setCookie as string | string[]);
      if (cookie) {
        saveCookie(cookie).catch(() => {});
      }
    }
    return response;
  },
  (error: AxiosError<{ error?: string; code?: string }>) => {
    if (error.response) {
      const { status } = error.response;
      if (status === 401) {
        // Clear cookie and trigger unauthorized callback
        clearCookie().catch(() => {});
        if (unauthorizedCallback) {
          unauthorizedCallback();
        }
      }
    }
    return Promise.reject(error);
  }
);

export default client;
