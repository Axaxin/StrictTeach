import { Word } from '../types';
import rawVocabData from '../year7_vocabulary_with_cn.json';

/**
 * 预存的词汇数据（从 year7_vocabulary_with_cn.json 导入）
 * 用于 Learn 模式，避免每次都调用 AI API
 */

// 单元 ID 映射
const UNIT_ID_MAP: Record<string, string> = {
  'Starter Chapter': 'starter',
  'Unit1': 'unit1',
  'Unit2': 'unit2',
  'Unit3': 'unit3',
  'Unit4': 'unit4',
  'Unit5': 'unit5',
  'Unit6': 'unit6',
};

// JSON 数据类型
interface JsonWordEntry {
  word: string;
  meaning: string;
}

interface JsonVocabData {
  [key: string]: JsonWordEntry[];
}

/**
 * 获取指定单元的预存单词数据
 */
export const getPreloadedWords = (unitId: string): Word[] | null => {
  try {
    const vocabData = rawVocabData as JsonVocabData;

    // 根据 unitId 查找对应的单元名称
    const unitName = Object.keys(UNIT_ID_MAP).find(
      key => UNIT_ID_MAP[key] === unitId
    );

    if (!unitName || !vocabData[unitName]) {
      return null;
    }

    const entries = vocabData[unitName];
    return entries.map((entry, index) => ({
      id: `${unitId}-${index}`,
      term: entry.word,
      definition: entry.meaning,
      example: '', // 预存数据暂不包含例句，需要时可以用 AI 生成
      unit: unitId,
    }));
  } catch (error) {
    console.error('Error loading preloaded words:', error);
    return null;
  }
};

/**
 * 检查单元是否有预存数据
 */
export const hasPreloadedData = (unitId: string): boolean => {
  return getPreloadedWords(unitId) !== null;
};

/**
 * 获取所有有预存数据的单元 ID
 */
export const getPreloadedUnitIds = (): string[] => {
  return Object.values(UNIT_ID_MAP);
};
