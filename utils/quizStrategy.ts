/**
 * Quiz 出题策略工具
 * 根据不同的策略选择单词进行测验
 */

import { Word, QuizStrategy, type WordMastery } from '../types';

export interface WordWithMastery {
  word: Word;
  index: number;
  mastery?: WordMastery;
}

/**
 * 根据策略选择单词
 * @param words 所有单词列表
 * @param masteryData 熟练度数据映射
 * @param strategy 出题策略
 * @param count 需要选择的单词数量
 * @returns 选中的单词列表
 */
export function selectWordsByStrategy(
  words: Word[],
  masteryData: Map<string, WordMastery>,
  strategy: QuizStrategy,
  count: number
): Word[] {
  if (words.length === 0) return [];

  const actualCount = Math.min(count, words.length);

  switch (strategy) {
    case QuizStrategy.RANDOM:
      return selectRandomWords(words, actualCount);

    case QuizStrategy.BALANCED:
      return selectBalancedWords(words, masteryData, actualCount);

    case QuizStrategy.FOCUS:
      return selectFocusWords(words, masteryData, actualCount);

    default:
      return selectRandomWords(words, actualCount);
  }
}

/**
 * 一般模式：等概率随机选择
 */
function selectRandomWords(words: Word[], count: number): Word[] {
  const shuffled = [...words].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * 平衡模式：练习次数越少，被选中概率越高
 * 权重公式：weight = 1 / (attempt_count + 1)
 */
function selectBalancedWords(
  words: Word[],
  masteryData: Map<string, WordMastery>,
  count: number
): Word[] {
  // 计算每个单词的权重
  const weightedWords: Array<{ word: Word; weight: number }> = words.map(word => {
    const mastery = masteryData.get(word.id);
    const attemptCount = mastery?.attempt_count || 0;
    // 权重 = 1 / (练习次数 + 1)
    // 练习0次 → 权重1.0，1次 → 0.5，2次 → 0.33...
    const weight = 1 / (attemptCount + 1);
    return { word, weight };
  });

  // 加权随机选择
  return weightedRandomSelect(weightedWords, count);
}

/**
 * 攻克模式：优先选择低熟练度单词
 * 策略：
 * 1. 优先选择 mastery_level < 40 的单词
 * 2. 如果不足，补充 mastery_level < 60 的单词
 * 3. 再不足，补充其他单词
 */
function selectFocusWords(
  words: Word[],
  masteryData: Map<string, WordMastery>,
  count: number
): Word[] {
  // 分类单词
  const critical: Word[] = [];      // 熟练度 < 40
  const needsPractice: Word[] = [];  // 熟练度 40-60
  const others: Word[] = [];         // 其他

  words.forEach(word => {
    const mastery = masteryData.get(word.id);
    const level = mastery?.mastery_level ?? 0;

    if (level < 40) {
      critical.push(word);
    } else if (level < 60) {
      needsPractice.push(word);
    } else {
      others.push(word);
    }
  });

  // 打乱每组内部的顺序
  critical.sort(() => 0.5 - Math.random());
  needsPractice.sort(() => 0.5 - Math.random());
  others.sort(() => 0.5 - Math.random());

  // 按优先级选择
  const selected: Word[] = [];

  // 优先选择急需攻坚的单词
  while (selected.length < count && critical.length > 0) {
    selected.push(critical.shift()!);
  }

  // 补充需要练习的单词
  while (selected.length < count && needsPractice.length > 0) {
    selected.push(needsPractice.shift()!);
  }

  // 再补充其他单词
  while (selected.length < count && others.length > 0) {
    selected.push(others.shift()!);
  }

  return selected;
}

/**
 * 加权随机选择算法
 * 使用累积权重的方式随机选择
 */
function weightedRandomSelect<T extends { weight: number }>(
  items: T[],
  count: number
): T[] {
  if (items.length <= count) {
    return [...items];
  }

  const selected: T[] = [];
  const remaining = [...items];

  for (let i = 0; i < count; i++) {
    // 计算总权重
    const totalWeight = remaining.reduce((sum, item) => sum + item.weight, 0);

    // 生成随机数
    let random = Math.random() * totalWeight;

    // 找到对应的项
    let accumulatedWeight = 0;
    for (let j = 0; j < remaining.length; j++) {
      accumulatedWeight += remaining[j].weight;
      if (random <= accumulatedWeight) {
        selected.push(remaining[j]);
        remaining.splice(j, 1);
        break;
      }
    }
  }

  return selected.map(item => (item as any).word);
}
