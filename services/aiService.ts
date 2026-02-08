import OpenAI from 'openai';
import { Word, WordDefinition, ExampleSentence } from '../types';
import { getPreloadedWords } from '../data/vocabData';

// 从环境变量获取配置
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
const BASE_URL = import.meta.env.VITE_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const MODEL = import.meta.env.VITE_OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';

// LocalStorage 缓存键前缀
const CACHE_PREFIX = 'vocab_cache_';

const client = new OpenAI({
  apiKey: API_KEY,
  baseURL: BASE_URL,
  dangerouslyAllowBrowser: true, // 允许在浏览器环境中使用
});

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
 * 优先级：LocalStorage 缓存（检查是否需要丰富）> 预存数据 + AI 丰富 > AI API
 */
export const enrichWords = async (terms: string[], unitId: string): Promise<Word[]> => {
  // 1. 检查 LocalStorage 缓存
  const cached = getCachedWords(unitId);
  if (cached && cached.length > 0) {
    console.log(`[Cache Hit] Unit ${unitId} loaded from cache`);

    // 检查缓存数据是否需要丰富
    const needsEnrichment = !cached[0].phonetic || !cached[0].definitions || cached[0].definitions!.length === 0;

    if (needsEnrichment) {
      console.log(`[Cache Needs Enrichment] Enriching cached data...`);
      // 异步丰富缓存数据（不阻塞UI，先返回基础数据）
      enrichPreloadedWords(cached).then(enriched => {
        setCachedWords(unitId, enriched);
        console.log(`[Cache Enriched] Unit ${unitId} data enriched and saved`);
      }).catch(err => {
        console.error('Error enriching cached words:', err);
      });
    }

    return cached;
  }

  // 2. 检查预存数据（可能是静态缓存或JSON基础数据）
  const preloaded = await getPreloadedWords(unitId);
  if (preloaded && preloaded.length > 0) {
    console.log(`[Preloaded Data] Unit ${unitId} loaded from static data`);

    // 检查预存数据是否缺少丰富内容
    const needsEnrichment = !preloaded[0].phonetic || !preloaded[0].definitions || preloaded[0].definitions!.length === 0;

    if (needsEnrichment) {
      console.log(`[Needs Enrichment] Unit ${unitId} needs AI enrichment...`);
      // 用 AI 来丰富预存数据
      try {
        const enriched = await enrichPreloadedWords(preloaded);
        // 保存到缓存
        setCachedWords(unitId, enriched);
        return enriched;
      } catch (error) {
        console.error('Error enriching preloaded words:', error);
        // 失败时返回原预存数据
        return preloaded;
      }
    }

    return preloaded;
  }

  console.log(`[Cache Miss] Unit ${unitId} fetching from AI...`);

  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `你是初一英语词汇教学专家。为中国初一学生提供简单、准确的英语单词信息。

重要规则：
1. 只提供1-2个最常用、最核心的释义（不要列举过多释义）
2. 释义要简洁明了，适合初一学生理解水平
3. 例句要简单实用，使用初一学生能看懂的词汇
4. 例句长度控制在10个单词以内
5. 只返回JSON，不要其他文字`,
        },
        {
          role: 'user',
          content: `为以下初一英语单词生成数据：${terms.join(', ')}

要求：
- 音标：使用标准国际音标
- 词性：n.(名词) v.(动词) adj.(形容词) adv.(副词) prep.(介词)
- 释义：只提供1-2个最常用的中文释义，简洁准确
- 例句：每个词1个简单例句，用词量不超过10个单词，适合初一水平

返回JSON格式：
{
  "words": [
    {
      "term": "apple",
      "phonetic": "/ˈæpl/",
      "definitions": [
        {"partOfSpeech": "n.", "meaning": "苹果"}
      ],
      "examples": [
        {"sentence": "I eat an apple.", "translation": "我吃一个苹果。"}
      ]
    }
  ]
}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content || '{}';
    const enrichedData = JSON.parse(content);

    // 处理返回数据
    const wordsData = Array.isArray(enrichedData) ? enrichedData : enrichedData.words || enrichedData.data || [];

    const words = wordsData.map((item: any, index: number) => {
      // 处理 definitions
      const definitions: WordDefinition[] = Array.isArray(item.definitions)
        ? item.definitions
        : item.definition
          ? [{ meaning: item.definition, partOfSpeech: item.partOfSpeech }]
          : [{ meaning: '', partOfSpeech: '' }];

      // 处理 examples
      const examples: ExampleSentence[] = Array.isArray(item.examples)
        ? item.examples
        : item.example
          ? [{ sentence: item.example, translation: item.exampleTranslation }]
          : [];

      return {
        id: `${unitId}-${index}`,
        term: item.term || terms[index],
        phonetic: item.phonetic || '',
        definitions: definitions.length > 0 ? definitions : [{ meaning: item.definition || '', partOfSpeech: '' }],
        // 向后兼容字段
        definition: definitions[0]?.meaning || item.definition || '',
        examples: examples,
        example: examples[0]?.sentence || item.example || '',
        unit: unitId,
      };
    });

    // 3. 保存到缓存
    setCachedWords(unitId, words);
    console.log(`[Cache Saved] Unit ${unitId} cached for future use`);

    return words;
  } catch (error) {
    console.error('Error enriching words:', error);
    // 降级处理：返回基础结构
    return terms.map((term, index) => ({
      id: `${unitId}-${index}`,
      term,
      definition: '加载中...',
      example: '加载中...',
      unit: unitId,
    }));
  }
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

/**
 * 通用 AI 聊天接口（可用于扩展其他 AI 功能）
 */
export const chatCompletion = async (messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]) => {
  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.7,
    });
    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Chat completion error:', error);
    throw error;
  }
};

/**
 * 用 AI 丰富预存的单词数据（添加音标、词性、例句等）
 */
const enrichPreloadedWords = async (preloadedWords: Word[]): Promise<Word[]> => {
  try {
    const terms = preloadedWords.map(w => w.term);

    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `你是初一英语词汇教学专家。为中国初一学生提供简单、准确的英语单词信息。

重要规则：
1. 只提供1-2个最常用、最核心的释义（不要列举过多释义）
2. 释义要简洁明了，适合初一学生理解水平
3. 例句要简单实用，使用初一学生能看懂的词汇
4. 例句长度控制在10个单词以内
5. 只返回JSON，不要其他文字`,
        },
        {
          role: 'user',
          content: `为以下初一英语单词生成数据：${terms.join(', ')}

要求：
- 音标：使用标准国际音标
- 词性：n.(名词) v.(动词) adj.(形容词) adv.(副词) prep.(介词)
- 释义：只提供1-2个最常用的中文释义，简洁准确
- 例句：每个词1个简单例句，用词量不超过10个单词，适合初一水平

返回JSON格式：
{
  "words": [
    {
      "term": "apple",
      "phonetic": "/ˈæpl/",
      "definitions": [
        {"partOfSpeech": "n.", "meaning": "苹果"}
      ],
      "examples": [
        {"sentence": "I eat an apple.", "translation": "我吃一个苹果。"}
      ]
    }
  ]
}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content || '{}';
    const enrichedData = JSON.parse(content);
    const wordsData = Array.isArray(enrichedData) ? enrichedData : enrichedData.words || [];

    // 创建一个 map 来快速查找
    const enrichedMap = new Map(wordsData.map((item: any) => [item.term, item]));

    // 合并预存数据和 AI 生成的数据
    return preloadedWords.map(word => {
      const enriched = enrichedMap.get(word.term);
      if (!enriched) {
        return word;
      }

      // 处理 definitions
      const definitions: WordDefinition[] = Array.isArray(enriched.definitions)
        ? enriched.definitions
        : enriched.definition || word.definition
          ? [{ meaning: enriched.definition || word.definition, partOfSpeech: enriched.partOfSpeech || '' }]
          : [{ meaning: word.definition || '', partOfSpeech: '' }];

      // 处理 examples
      const examples: ExampleSentence[] = Array.isArray(enriched.examples)
        ? enriched.examples
        : enriched.example || word.example
          ? [{ sentence: enriched.example || word.example, translation: enriched.exampleTranslation }]
          : [];

      return {
        ...word,
        phonetic: enriched.phonetic || '',
        definitions: definitions.length > 0 ? definitions : [{ meaning: word.definition || '', partOfSpeech: '' }],
        examples: examples,
        // 向后兼容字段
        definition: definitions[0]?.meaning || word.definition || '',
        example: examples[0]?.sentence || word.example || '',
      };
    });
  } catch (error) {
    console.error('Error enriching preloaded words:', error);
    return preloadedWords; // 失败时返回原数据
  }
};

/**
 * 为单词生成英文例句（用于增强预存数据）
 */
export const generateExamples = async (words: Word[]): Promise<Word[]> => {
  try {
    const wordsWithoutExamples = words.filter(w => !w.example);
    if (wordsWithoutExamples.length === 0) {
      return words;
    }

    const terms = wordsWithoutExamples.map(w => w.term);
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `你是初一英语教学专家。为中国初一学生提供简单实用的英文例句。

重要规则：
1. 例句使用初一学生能看懂的简单词汇
2. 例句长度控制在10个单词以内
3. 提供中文翻译
4. 只返回JSON，不要其他文字`,
        },
        {
          role: 'user',
          content: `为以下初一英语单词提供简单例句：${terms.join(', ')}

要求：每个词1个简单例句（不超过10个单词），附带中文翻译。

返回格式：{"words": [{"term": "apple", "example": "I eat an apple.", "translation": "我吃一个苹果。"}]}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
    });

    const content = response.choices[0]?.message?.content || '{}';
    const data = JSON.parse(content);
    const examples = data.words || data.data || [];

    // 更新有例句的单词
    const exampleMap = new Map(examples.map((e: any) => [e.term, e.example]));

    return words.map(word => ({
      ...word,
      example: word.example || exampleMap.get(word.term) || '',
    }));
  } catch (error) {
    console.error('Error generating examples:', error);
    return words; // 失败时返回原数据
  }
};
