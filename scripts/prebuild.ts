/**
 * Pre-build script: Generate static word data cache
 *
 * This script calls the AI API once to generate enriched word data for all units,
 * then saves them as static JSON files. This eliminates the need for runtime AI calls.
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

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Environment variables
const API_KEY = process.env.OPENAI_API_KEY || '';
const BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

if (!API_KEY) {
  console.error('❌ OPENAI_API_KEY is required. Set it in .env.local or run with:');
  console.error('   OPENAI_API_KEY=your_key npm run prebuild');
  process.exit(1);
}

// Initialize OpenAI client
const client = new OpenAI({
  apiKey: API_KEY,
  baseURL: BASE_URL,
});

// Cache directory (in public folder so Vite can serve it)
const CACHE_DIR = path.resolve(__dirname, '../public/data/cache');

/**
 * Ensure cache directory exists
 */
function ensureCacheDir(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    console.log(`📁 Created cache directory: ${CACHE_DIR}`);
  }
}

/**
 * Enrich ALL words with AI API in one request (much faster!)
 */
async function enrichAllWordsWithAI(units: { id: string; words: string[] }[]): Promise<Map<string, Word[]>> {
  // Collect all words with their unit info
  const allWordsWithUnit: { term: string; unitId: string; index: number }[] = [];
  const wordCountByUnit: Record<string, number> = {};

  units.forEach(unit => {
    wordCountByUnit[unit.id] = unit.words.length;
    unit.words.forEach((term, index) => {
      allWordsWithUnit.push({ term, unitId: unit.id, index });
    });
  });

  const totalWords = allWordsWithUnit.length;
  console.log(`\n🔄 Processing all ${totalWords} words in ONE request...`);

  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的英语词汇教学助手。为每个初中水平的英语单词提供：音标、词性、中文释义（多个词性的不同释义）、英文例句及其中文翻译。返回JSON格式。',
        },
        {
          role: 'user',
          content: `为以下初中英语单词提供详细信息：${allWordsWithUnit.map(w => w.term).join(', ')}\n\n返回格式示例：
{
  "words": [
    {
      "term": "apple",
      "phonetic": "/ˈæpl/",
      "definitions": [
        {"partOfSpeech": "n.", "meaning": "苹果"}
      ],
      "examples": [
        {"sentence": "I eat an apple every day.", "translation": "我每天吃一个苹果。"}
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
    const wordsData = Array.isArray(enrichedData) ? enrichedData : enrichedData.words || enrichedData.data || [];

    // Create a map from term to enriched data
    const enrichedMap = new Map(wordsData.map((item: any) => [item.term, item]));

    // Build result map by unit
    const result = new Map<string, Word[]>();
    let currentWordIndex = 0;

    units.forEach(unit => {
      const unitWords: Word[] = [];
      unit.words.forEach((term, index) => {
        const enriched = enrichedMap.get(term);

        if (enriched) {
          const definitions: WordDefinition[] = Array.isArray(enriched.definitions)
            ? enriched.definitions
            : enriched.definition
              ? [{ meaning: enriched.definition, partOfSpeech: enriched.partOfSpeech }]
              : [{ meaning: '', partOfSpeech: '' }];

          const examples: ExampleSentence[] = Array.isArray(enriched.examples)
            ? enriched.examples
            : enriched.example
              ? [{ sentence: enriched.example, translation: enriched.exampleTranslation }]
              : [];

          unitWords.push({
            id: `${unit.id}-${index}`,
            term: enriched.term || term,
            phonetic: enriched.phonetic || '',
            definitions: definitions.length > 0 ? definitions : [{ meaning: enriched.definition || '', partOfSpeech: '' }],
            definition: definitions[0]?.meaning || enriched.definition || '',
            examples: examples,
            example: examples[0]?.sentence || enriched.example || '',
            unit: unit.id,
          });
        } else {
          // Fallback if word not found in response
          unitWords.push({
            id: `${unit.id}-${index}`,
            term,
            definition: '',
            example: '',
            unit: unit.id,
          });
        }
        currentWordIndex++;
      });
      result.set(unit.id, unitWords);
      console.log(`✅ ${unit.id}: Generated ${unitWords.length} enriched words`);
    });

    return result;
  } catch (error) {
    console.error(`❌ Error enriching words:`, error);
    // Fallback: return empty map
    return new Map();
  }
}

/**
 * Save words to cache file
 */
function saveToCache(unitId: string, words: Word[]): void {
  const filePath = path.join(CACHE_DIR, `${unitId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(words, null, 2), 'utf-8');
  console.log(`💾 Saved: ${filePath}`);
}

/**
 * Main prebuild function
 */
async function prebuild(): Promise<void> {
  console.log('🚀 Starting VocabMaster prebuild...\n');
  console.log(`📊 Model: ${MODEL}`);
  console.log(`🌐 API: ${BASE_URL}\n`);

  ensureCacheDir();

  const allUnits = BOOKS.flatMap(book => book.units);
  const totalWords = allUnits.reduce((sum, unit) => sum + unit.words.length, 0);

  console.log(`📝 Total units: ${allUnits.length}`);
  console.log(`📝 Total words: ${totalWords}\n`);

  // ONE API call for all words!
  const enrichedWordsMap = await enrichAllWordsWithAI(allUnits);

  // Save each unit to its own file
  let successCount = 0;
  let totalProcessed = 0;

  for (const unit of allUnits) {
    const words = enrichedWordsMap.get(unit.id);
    if (words && words.length > 0) {
      saveToCache(unit.id, words);
      totalProcessed += words.length;
      successCount++;
    } else {
      console.error(`❌ Failed to generate words for ${unit.id}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Prebuild Summary');
  console.log('='.repeat(50));
  console.log(`✅ Successfully processed: ${successCount}/${allUnits.length} units`);
  console.log(`✨ Total words processed: ${totalProcessed}`);
  console.log(`📁 Cache directory: ${CACHE_DIR}`);
  console.log('='.repeat(50));
  console.log('\n🎉 Prebuild complete! Run `npm run build` to create the production bundle.');
}

// Run prebuild
prebuild().catch(error => {
  console.error('💥 Prebuild failed:', error);
  process.exit(1);
});
