import { Word } from '../types';
import { getPreloadedWords } from '../data/vocabData';

// LocalStorage 缓存键前缀
const CACHE_PREFIX = 'vocab_cache_';

/**
 * 从 LocalStorage 获取缓存的单词数据
 */
const getCachedWords = (unitId: string): Word[] | null => {
  try {
    const cacheKey = `${CACHE_PREFIX}${unitId}`;
    const cached = localStorage.getItem(cacheKey);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

/**
 * 将单词数据保存到 LocalStorage
 */
const setCachedWords = (unitId: string, words: Word[]): void => {
  try {
    const cacheKey = `${CACHE_PREFIX}${unitId}`;
    localStorage.setItem(cacheKey, JSON.stringify(words));
  } catch (error) {
    console.warn('Failed to cache words:', error);
  }
};

/**
 * 获取单词数据（用于 Learn 模式）
 * 优先级：LocalStorage 缓存 > 静态缓存文件 > JSON 基础数据
 * 注意：不再调用 AI API，因为 public/data/cache/ 已包含完整的 enriched 数据
 */
export const enrichWords = async (terms: string[], unitId: string): Promise<Word[]> => {
  // 1. 检查 LocalStorage 缓存
  const cached = getCachedWords(unitId);
  if (cached && cached.length > 0) {
    console.log(`[Cache Hit] Unit ${unitId} loaded from LocalStorage`);
    return cached;
  }

  // 2. 检查预存数据（静态缓存文件或 JSON 基础数据）
  const preloaded = await getPreloadedWords(unitId);
  if (preloaded && preloaded.length > 0) {
    console.log(`[Static Cache] Unit ${unitId} loaded from static file`);
    // 保存到 LocalStorage 以备下次使用
    setCachedWords(unitId, preloaded);
    return preloaded;
  }

  // 3. 如果都没有，使用基础结构（不应发生）
  console.warn(`[Data Missing] Unit ${unitId} has no data available, using basic structure`);
  return terms.map((term, index) => ({
    id: `${unitId}-${index}`,
    term,
    definition: '暂无数据',
    example: '',
    unit: unitId,
  }));
};

/**
 * 清除所有单词缓存
 */
export const clearWordCache = (): void => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    console.log('[Cache Cleared] All word caches have been removed');
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
};

/**
 * 获取缓存统计信息
 */
export const getCacheStats = () => {
  try {
    const keys = Object.keys(localStorage).filter(key => key.startsWith(CACHE_PREFIX));
    const totalWords = keys.reduce((sum, key) => {
      const cached = localStorage.getItem(key);
      return sum + (cached ? JSON.parse(cached).length : 0);
    }, 0);
    return { cachedUnits: keys.length, totalWords };
  } catch {
    return { cachedUnits: 0, totalWords: 0 };
  }
};
