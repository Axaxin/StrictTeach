/**
 * Sentence Selector Utility
 *
 * 用于从文章或单词例句中选择包含目标单词的句子，
 * 并生成句子填空题目。
 */

import { Word } from '../types';

/**
 * 文章句子接口
 */
export interface PassageSentence {
  english: string;
  chinese: string;
  index?: number;
}

/**
 * 文章结构接口
 */
export interface Passage {
  title: string;
  paragraphs: {
    sentences: PassageSentence[];
  }[];
}

/**
 * 从文章中选择包含目标单词的句子
 *
 * @param targetWord - 目标单词
 * @param passage - 文章数据 (可为 null)
 * @returns 包含目标单词的句子列表
 */
export function findSentencesWithWord(
  targetWord: Word,
  passage: Passage | null
): PassageSentence[] {
  const results: PassageSentence[] = [];

  // 使用单词边界匹配，避免部分匹配（如 "cat" 匹配 "category"）
  const searchTerm = new RegExp(`\\b${targetWord.term.toLowerCase()}\\b`);

  // 1. 从文章中查找
  if (passage) {
    passage.paragraphs.forEach((paragraph) => {
      paragraph.sentences.forEach((sentence) => {
        if (searchTerm.test(sentence.english.toLowerCase())) {
          results.push(sentence);
        }
      });
    });
  }

  // 2. 从单词例句中查找 (备选方案)
  if (results.length === 0 && targetWord.examples) {
    targetWord.examples.forEach((ex) => {
      if (searchTerm.test(ex.sentence.toLowerCase())) {
        results.push({
          english: ex.sentence,
          chinese: ex.translation || '',
        });
      }
    });
  }

  return results;
}

/**
 * 将句子中的目标单词替换为填空
 *
 * @param sentence - 原始句子
 * @param targetWord - 目标单词
 * @returns 包含填空的题目和正确答案
 */
export function createFillInBlankQuestion(
  sentence: PassageSentence,
  targetWord: Word
): { question: string; answer: string } {
  const term = targetWord.term;

  // 使用正则替换单词为 ___ (忽略大小写)
  const question = sentence.english.replace(
    new RegExp(`\\b${term}\\b`, 'i'),
    '___'
  );

  return {
    question: question,  // 直接返回填空句子，不加引号
    answer: term,
  };
}

/**
 * 获取单词的释义（用于填空题提示）
 * 支持新旧两种数据格式
 */
export function getDefinitionHint(word: Word): string {
  // 新格式: definitions 数组
  if (word.definitions && word.definitions.length > 0) {
    return word.definitions[0].meaning;
  }
  // 旧格式: definition 字符串
  if (word.definition) {
    const parts = word.definition.split('；');
    return parts[0].trim();
  }
  return '';
}
