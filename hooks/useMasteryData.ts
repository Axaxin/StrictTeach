/**
 * useMasteryData Hook
 *
 * 获取并管理单词的云端熟练度数据
 * 从 Cloudflare Workers API 获取批量熟练度数据，并提供便捷的查询接口
 *
 * 现在集成全局刷新系统，确保所有组件显示一致的熟练度数据
 */

import { useState, useEffect, useRef } from 'react';
import { getBatchMasteryPost } from '../services/api';
import { WordMastery } from '../types';
import { globalMasteryRefresh } from './useMasteryRefresh';

export interface MasteryDataMap {
  [wordId: string]: WordMastery | null;
}

export interface UseMasteryDataResult {
  masteryData: MasteryDataMap;
  isLoading: boolean;
  error: string | null;
  getMasteryLevel: (wordId: string) => number;
  getMasteryBadge: (wordId: string) => { level: string; color: string; bgColor: string } | null;
  refetch: () => Promise<void>;
}

/**
 * 根据熟练度分数返回徽章样式
 */
export function getMasteryBadgeByLevel(masteryLevel: number): { level: string; color: string; bgColor: string } {
  if (masteryLevel >= 80) {
    return { level: '精通', color: 'text-green-700', bgColor: 'bg-green-100' };
  } else if (masteryLevel >= 60) {
    return { level: '熟练', color: 'text-blue-700', bgColor: 'bg-blue-100' };
  } else if (masteryLevel >= 40) {
    return { level: '一般', color: 'text-amber-700', bgColor: 'bg-amber-100' };
  } else if (masteryLevel > 0) {
    return { level: '生疏', color: 'text-orange-700', bgColor: 'bg-orange-100' };
  } else {
    return { level: '新词', color: 'text-slate-600', bgColor: 'bg-slate-100' };
  }
}

/**
 * 获取单词列表的熟练度数据
 */
export function useMasteryData(words: { id: string }[]): UseMasteryDataResult {
  const [masteryData, setMasteryData] = useState<MasteryDataMap>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // 全局刷新触发器

  // 使用 ref 避免依赖循环
  const wordsRef = useRef(words);
  wordsRef.current = words;

  const fetchMasteryData = async () => {
    const currentWords = wordsRef.current;
    if (currentWords.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const wordIds = currentWords.map(w => w.id);
      const result = await getBatchMasteryPost(wordIds);

      // 将数组转换为 Map 以便快速查找
      const map: MasteryDataMap = {};
      for (const mastery of result) {
        map[mastery.word_id] = mastery;
      }
      // 为没有熟练度数据的单词设置 null
      for (const wordId of wordIds) {
        if (!(wordId in map)) {
          map[wordId] = null;
        }
      }

      setMasteryData(map);
      console.log(`[useMasteryData] Fetched ${result.length} mastery records for ${wordIds.length} words`);
    } catch (err) {
      console.error('Failed to fetch mastery data:', err);
      setError(err instanceof Error ? err.message : '获取熟练度数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 初始化时和全局刷新时获取数据
  useEffect(() => {
    fetchMasteryData();
  }, [refreshTrigger]); // 依赖 refreshTrigger 而不是 words.length

  // 订阅全局刷新事件
  useEffect(() => {
    const unsubscribe = globalMasteryRefresh.subscribe(() => {
      console.log('[useMasteryData] Global refresh triggered, refetching...');
      setRefreshTrigger(prev => prev + 1);
    });

    return unsubscribe;
  }, []);

  const getMasteryLevel = (wordId: string): number => {
    const mastery = masteryData[wordId];
    return mastery?.mastery_level ?? 0;
  };

  const getMasteryBadge = (wordId: string) => {
    const masteryLevel = getMasteryLevel(wordId);
    return getMasteryBadgeByLevel(masteryLevel);
  };

  return {
    masteryData,
    isLoading,
    error,
    getMasteryLevel,
    getMasteryBadge,
    refetch: fetchMasteryData,
  };
}
