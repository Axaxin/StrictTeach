/**
 * useMasteryData Hook
 *
 * 获取并管理单词的云端熟练度数据
 * 从 Cloudflare Workers API 获取批量熟练度数据，并提供便捷的查询接口
 */

import { useState, useEffect } from 'react';
import { getBatchMasteryPost } from '../services/api';
import { WordMastery } from '../types';

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

  const fetchMasteryData = async () => {
    if (words.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const wordIds = words.map(w => w.id);
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
    } catch (err) {
      console.error('Failed to fetch mastery data:', err);
      setError(err instanceof Error ? err.message : '获取熟练度数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMasteryData();
  }, [words.length]); // 只在单词数量变化时重新获取（避免频繁请求）

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
