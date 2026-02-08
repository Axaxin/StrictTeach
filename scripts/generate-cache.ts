/**
 * Simple cache generator - creates static word data from year7_vocabulary_with_cn.json
 * No AI API required
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Unit ID mapping
const UNIT_ID_MAP: Record<string, string> = {
  'Starter Chapter': 'starter',
  'Unit1': 'unit1',
  'Unit2': 'unit2',
  'Unit3': 'unit3',
  'Unit4': 'unit4',
  'Unit5': 'unit5',
  'Unit6': 'unit6',
};

// Cache directory
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
 * Save words to cache file
 */
function saveToCache(unitId: string, words: any[]): void {
  const filePath = path.join(CACHE_DIR, `${unitId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(words, null, 2), 'utf-8');
  console.log(`💾 Saved: ${unitId}.json (${words.length} words)`);
}

/**
 * Generate cache files
 */
function generateCache(): void {
  console.log('🚀 Generating static word cache...\n');

  ensureCacheDir();

  // Read source data
  const sourcePath = path.resolve(__dirname, '../year7_vocabulary_with_cn.json');
  const sourceData = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));

  let totalUnits = 0;
  let totalWords = 0;

  // Process each unit
  for (const [chapterName, words] of Object.entries(sourceData)) {
    const unitId = UNIT_ID_MAP[chapterName];

    if (!unitId) {
      console.warn(`⚠️  Skipped: "${chapterName}" (no matching unit ID)`);
      continue;
    }

    // Convert to Word[] format
    const wordArray = words as { word: string; meaning: string }[];
    const unitWords = wordArray.map((entry, index) => ({
      id: `${unitId}-${index}`,
      term: entry.word,
      definition: entry.meaning,
      example: '',
      unit: unitId,
    }));

    saveToCache(unitId, unitWords);
    totalUnits++;
    totalWords += unitWords.length;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary');
  console.log('='.repeat(50));
  console.log(`✅ Units processed: ${totalUnits}`);
  console.log(`✨ Total words: ${totalWords}`);
  console.log(`📁 Cache directory: ${CACHE_DIR}`);
  console.log('='.repeat(50));
  console.log('\n🎉 Cache generation complete!');
}

// Run
generateCache();
