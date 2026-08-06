import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 离线缓存工具 — 基于 AsyncStorage 的键值对缓存，带 TTL 过期机制。
 *
 * 缓存策略：
 * 1. 网络请求成功 → 更新缓存
 * 2. 网络请求失败 → 读取缓存（即使已过期也比无数据好）
 * 3. 缓存命中时返回 { data, fromCache } 标记
 */

const CACHE_PREFIX = 'calendar_cache_';
const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 小时

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * 生成缓存 key
 */
function cacheKey(key: string): string {
  return `${CACHE_PREFIX}${key}`;
}

/**
 * 写入缓存
 */
export async function setCache<T>(key: string, data: T, ttl: number = DEFAULT_TTL): Promise<void> {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    await AsyncStorage.setItem(cacheKey(key), JSON.stringify(entry));
  } catch {
    // 缓存写入失败不影响主流程
  }
}

/**
 * 读取缓存（未过期才返回）
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(key));
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > entry.ttl) {
      // 已过期，但保留数据供离线降级使用
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

/**
 * 读取缓存（忽略过期，用于网络失败时的降级）
 */
export async function getStaleCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(key));
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    return entry.data;
  } catch {
    return null;
  }
}

/**
 * 清除指定缓存
 */
export async function clearCache(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(cacheKey(key));
  } catch {
    // ignore
  }
}

/**
 * 清除所有日历缓存
 */
export async function clearAllCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch {
    // ignore
  }
}

/**
 * 网络优先 + 缓存降级
 *
 * 1. 先尝试网络请求
 * 2. 成功 → 更新缓存，返回 { data, fromCache: false }
 * 3. 失败 → 读取缓存（即使过期），返回 { data, fromCache: true }
 * 4. 缓存也没有 → 抛出原始错误
 */
export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = DEFAULT_TTL,
): Promise<{ data: T; fromCache: boolean }> {
  try {
    const data = await fetcher();
    await setCache(key, data, ttl);
    return { data, fromCache: false };
  } catch (error) {
    // 网络失败，尝试缓存降级
    const cached = await getStaleCache<T>(key);
    if (cached !== null) {
      return { data: cached, fromCache: true };
    }
    throw error;
  }
}
