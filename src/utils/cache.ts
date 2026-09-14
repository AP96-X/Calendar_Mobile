import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 离线缓存工具 — 基于 AsyncStorage 的键值对缓存，带 TTL 过期机制。
 *
 * 缓存策略（缓存优先）：
 * 1. 取缓存：未过期 → 直接命中，跳过网络请求
 * 2. 取缓存：未命中/已过期 → 发起网络请求，成功则写入缓存
 * 3. 网络请求失败 → 读取缓存（即使已过期也比无数据好）
 * 4. 缓存也没有 → 抛出原始错误
 */

const CACHE_PREFIX = 'calendar_cache_';
const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 小时

/**
 * 缓存代际：每次缓存失效（清空/增删改）时自增。
 *
 * 网络请求在发起前记录当时的代际，写回缓存前再比对：若期间发生过失效，
 * 说明本次响应可能已过期（例如删除请求在途时，早先发出的 GET 才回来），
 * 直接丢弃不写入缓存，避免旧数据把已清空的缓存重新「污染」。
 */
let cacheGeneration = 0;

/** 标记缓存失效：不删除数据，仅让所有进行中的请求结果不再写回缓存 */
export function invalidateCache(): void {
  cacheGeneration += 1;
}

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
 * 清除所有日历缓存。
 * 缓存 key 未按用户做命名空间隔离，切换账号时需清空，避免读到上一个用户的数据。
 */
export async function clearAllCache(): Promise<void> {
  invalidateCache();
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
 * 缓存优先 + 离线降级
 *
 * 1. 取未过期缓存 → 命中则直接返回（fromCache=false，视为新鲜数据，不提示离线）
 * 2. 未命中/已过期 → 发起网络请求，成功则写入缓存并返回
 * 3. 网络请求失败 → 读取缓存（即使已过期，fromCache=true，供 UI 提示离线）
 * 4. 缓存也没有 → 抛出原始错误
 *
 * forceRefresh=true 时跳过第 1 步，直接请求服务端（手动刷新场景）；
 * 请求失败仍会降级到缓存。
 */
export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = DEFAULT_TTL,
  forceRefresh: boolean = false,
): Promise<{ data: T; fromCache: boolean }> {
  // 1. 缓存未过期直接命中，避免重复网络请求（手动刷新时跳过）
  if (!forceRefresh) {
    const fresh = await getCache<T>(key);
    if (fresh !== null) {
      return { data: fresh, fromCache: false };
    }
  }

  // 记录发起时的缓存代际；若请求期间发生失效，则本次响应不再写回缓存
  const generation = cacheGeneration;
  try {
    const data = await fetcher();
    if (generation === cacheGeneration) {
      await setCache(key, data, ttl);
    }
    return { data, fromCache: false };
  } catch (error) {
    // 网络失败，尝试缓存降级（含过期数据）
    const cached = await getStaleCache<T>(key);
    if (cached !== null) {
      return { data: cached, fromCache: true };
    }
    throw error;
  }
}
