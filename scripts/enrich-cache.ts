/**
 * Enrich cache files with phonetic, definitions, and examples
 * Uses free dictionary API + AI fallback
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: '.env.local' });

const CACHE_DIR = path.resolve(__dirname, '../public/data/cache');
const API_KEY = process.env.OPENAI_API_KEY || '';
const BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const client = API_KEY ? new OpenAI({ apiKey: API_KEY, baseURL: BASE_URL }) : null;

/**
 * Free Dictionary API for phonetics
 */
async function getPhonetic(word: string): Promise<string | null> {
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    if (!response.ok) return null;

    const data = await response.json();
    const entry = data[0];
    if (entry?.phonetic) return entry.phonetic;
    if (entry?.phonetics?.length > 0) {
      const phoneticWithText = entry.phonetics.find((p: any) => p.text);
      if (phoneticWithText?.text) return phoneticWithText.text;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Enrich a single word using AI (smaller batches)
 */
async function enrichWordWithAI(term: string, meaning: string): Promise<{
  phonetic: string;
  definitions: Array<{ partOfSpeech: string; meaning: string }>;
  examples: Array<{ sentence: string; translation: string }>;
} | null> {
  if (!client) return null;

  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: '你是英语词汇助手。只返回JSON格式。',
        },
        {
          role: 'user',
          content: `为单词 "${term}" (含义: ${meaning}) 提供：
1. 音标
2. 词性和中文释义
3. 1-2个英文例句和中文翻译

返回JSON格式：
{
  "phonetic": "/.../",
  "definitions": [{"partOfSpeech": "n.", "meaning": "xxx"}],
  "examples": [{"sentence": "...", "translation": "..."}]
}`,
        },
      ],
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content || '{}';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Enrich a unit file
 */
async function enrichUnit(unitId: string): Promise<void> {
  const filePath = path.join(CACHE_DIR, `${unitId}.json`);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${unitId}.json`);
    return;
  }

  console.log(`\n🔄 Processing ${unitId}.json...`);
  const words = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  let enrichedCount = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    console.log(`  [${i + 1}/${words.length}] ${word.term}`);

    // Skip if already enriched
    if (word.phonetic || word.definitions?.length > 0) {
      console.log(`    ✓ Already enriched`);
      continue;
    }

    // 1. Try to get phonetic from free API
    const phonetic = await getPhonetic(word.term);

    // 2. Try AI enrichment (one word at a time to avoid limits)
    const aiData = client ? await enrichWordWithAI(word.term, word.definition) : null;

    if (aiData) {
      word.phonetic = aiData.phonetic || phonetic || '';
      word.definitions = aiData.definitions;
      word.examples = aiData.examples;
      enrichedCount++;
      console.log(`    ✓ Enriched with AI`);
    } else if (phonetic) {
      word.phonetic = phonetic;
      word.definitions = [{ partOfSpeech: '', meaning: word.definition }];
      console.log(`    ✓ Added phonetic only`);
    } else {
      console.log(`    ⚠️  No enrichment data available`);
    }

    // Small delay between AI requests
    if (client && i < words.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Save enriched file
  fs.writeFileSync(filePath, JSON.stringify(words, null, 2), 'utf-8');
  console.log(`💾 Saved: ${unitId}.json (${enrichedCount} words enriched)`);
}

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log('🚀 Enriching cache files...\n');

  const unitIds = ['starter', 'unit1', 'unit2', 'unit3', 'unit4', 'unit5', 'unit6'];

  for (const unitId of unitIds) {
    await enrichUnit(unitId);
    // Delay between units
    if (unitId !== 'unit6') {
      console.log('\n⏳ Waiting 3 seconds before next unit...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  console.log('\n✅ Enrichment complete!');
}

main().catch(console.error);
