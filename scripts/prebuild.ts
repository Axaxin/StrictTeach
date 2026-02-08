/**
 * Pre-build script: Generate static word data cache
 * Optimized with small batches and delays to avoid rate limits
 *
 * Usage: npm run prebuild
 */

import dotenv from 'dotenv';
import OpenAI from 'openai';
import { BOOKS } from '../constants';
import { Word, WordDefinition, ExampleSentence } from '../types';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: '.env.local' });

const API_KEY = process.env.OPENAI_API_KEY || '';
const BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

if (!API_KEY) {
  console.error('❌ OPENAI_API_KEY is required. Set it in .env.local');
  process.exit(1);
}

const client = new OpenAI({
  apiKey: API_KEY,
  baseURL: BASE_URL,
});

const CACHE_DIR = path.resolve(__dirname, '../public/data/cache');
const BATCH_SIZE = 5; // Very small batches
const DELAY_MS = 5000; // 5 seconds between batches

function ensureCacheDir(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Enrich a small batch of words
 */
async function enrichBatch(words: string[]): Promise<Map<string, any>> {
  console.log(`    🔄 Batch of ${words.length} words...`);

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
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
            content: `为以下初一英语单词生成数据：${words.join(', ')}

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
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content || '{}';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        const wordsData = Array.isArray(data) ? data : data.words || [];
        return new Map(wordsData.map((w: any) => [w.term, w]));
      }
    } catch (error: any) {
      if (attempt === maxRetries) {
        console.error(`    ❌ Error (attempt ${attempt}):`, error.message);
      } else {
        console.log(`    ⚠️  Retry ${attempt}/${maxRetries}...`);
        await sleep(3000);
      }
    }
  }

  return new Map();
}

/**
 * Process one unit
 */
async function processUnit(unit: { id: string; words: string[] }): Promise<Word[]> {
  console.log(`\n📦 ${unit.id} (${unit.words.length} words)`);

  const unitWords: Word[] = [];

  // Process in small batches
  for (let i = 0; i < unit.words.length; i += BATCH_SIZE) {
    const batch = unit.words.slice(i, Math.min(i + BATCH_SIZE, unit.words.length));
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(unit.words.length / BATCH_SIZE);

    console.log(`  Batch ${batchNum}/${totalBatches}`);

    const enriched = await enrichBatch(batch);

    batch.forEach((term, idx) => {
      const globalIdx = i + idx;
      const data = enriched.get(term);

      if (data) {
        unitWords.push({
          id: `${unit.id}-${globalIdx}`,
          term: data.term || term,
          phonetic: data.phonetic || '',
          definitions: data.definitions || [],
          examples: data.examples || [],
          unit: unit.id,
        });
        console.log(`    ✓ ${term}`);
      } else {
        // Fallback
        unitWords.push({
          id: `${unit.id}-${globalIdx}`,
          term,
          phonetic: '',
          definitions: [],
          examples: [],
          unit: unit.id,
        });
        console.log(`    ✗ ${term} (fallback)`);
      }
    });

    // Delay between batches (except last)
    if (i + BATCH_SIZE < unit.words.length) {
      console.log(`    ⏳ Waiting ${DELAY_MS/1000}s...`);
      await sleep(DELAY_MS);
    }
  }

  return unitWords;
}

function saveToCache(unitId: string, words: Word[]): void {
  const filePath = path.join(CACHE_DIR, `${unitId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(words, null, 2), 'utf-8');
  console.log(`  💾 Saved ${unitId}.json`);
}

async function prebuild(): Promise<void> {
  console.log('🚀 VocabMaster Prebuild');
  console.log(`📊 Model: ${MODEL}`);
  console.log(`🌐 API: ${BASE_URL}`);
  console.log(`📦 Batch size: ${BATCH_SIZE} words`);
  console.log(`⏱️  Delay: ${DELAY_MS/1000}s\n`);

  ensureCacheDir();

  const allUnits = BOOKS.flatMap(book => book.units);
  console.log(`📝 Total units: ${allUnits.length}\n`);

  let successCount = 0;
  let totalWords = 0;

  for (let i = 0; i < allUnits.length; i++) {
    const unit = allUnits[i];

    // Delay between units (except first)
    if (i > 0) {
      console.log(`\n⏳ Unit delay: ${DELAY_MS/1000}s...`);
      await sleep(DELAY_MS);
    }

    try {
      const words = await processUnit(unit);
      if (words.length > 0) {
        saveToCache(unit.id, words);
        successCount++;
        totalWords += words.length;
      }
    } catch (error) {
      console.error(`❌ Failed to process ${unit.id}:`, error);
    }
  }

  console.log('\n' + '='.repeat(40));
  console.log('📊 Summary');
  console.log('='.repeat(40));
  console.log(`✅ Units: ${successCount}/${allUnits.length}`);
  console.log(`✨ Words: ${totalWords}`);
  console.log('='.repeat(40));
  console.log('\n🎉 Done!');
}

prebuild().catch(console.error);
