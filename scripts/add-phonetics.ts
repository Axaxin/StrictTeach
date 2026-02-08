/**
 * Add phonetics from free dictionary API (no AI required)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_DIR = path.resolve(__dirname, '../public/data/cache');

/**
 * Free Dictionary API for phonetics
 */
async function getPhonetic(word: string): Promise<string | null> {
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    if (!response.ok) return null;

    const data = await response.json();
    const entry = data[0];

    // Try various phonetic sources
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
 * Add phonetics to a unit file
 */
async function addPhonetics(unitId: string): Promise<void> {
  const filePath = path.join(CACHE_DIR, `${unitId}.json`);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${unitId}.json`);
    return;
  }

  console.log(`\n🔄 Processing ${unitId}.json...`);
  const words = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  let phoneticCount = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    // Skip if already has phonetic
    if (word.phonetic) {
      console.log(`  [${i + 1}/${words.length}] ${word.term} ✓ (has phonetic)`);
      continue;
    }

    const phonetic = await getPhonetic(word.term);

    if (phonetic) {
      word.phonetic = phonetic;
      phoneticCount++;
      console.log(`  [${i + 1}/${words.length}] ${word.term} → ${phonetic}`);
    } else {
      console.log(`  [${i + 1}/${words.length}] ${word.term} ✗ (not found)`);
    }

    // Small delay to be polite to the API
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Save updated file
  fs.writeFileSync(filePath, JSON.stringify(words, null, 2), 'utf-8');
  console.log(`\n💾 Saved: ${unitId}.json (${phoneticCount} phonetics added)`);
}

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log('🚀 Adding phonetics from free dictionary API...\n');

  const unitIds = ['starter', 'unit1', 'unit2', 'unit3', 'unit4', 'unit5', 'unit6'];

  for (const unitId of unitIds) {
    await addPhonetics(unitId);
  }

  console.log('\n✅ Done! Phonetics added.');
}

main().catch(console.error);
