# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VocabMaster is an English vocabulary learning app built with React 19, TypeScript, and Vite. It uses **OpenAI-compatible APIs** (支持智谱 GLM) to enrich vocabulary words with phonetics, parts of speech, multiple Chinese definitions, and English example sentences with translations. The app features preloaded vocabulary data for 7 chapters (Starter through Unit 6) covering junior high school Year 7 curriculum.

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server on port 3000
npm run build        # Build for production
npm run preview      # Preview production build
```

### Key Dependencies

- `react@19` + `react-dom@19` - UI framework
- `openai` - OpenAI-compatible API client (supports 智谱 GLM)
- `lucide-react` - Icon library for UI components
- `vite` - Build tool and dev server
- `typescript` - Type safety

## Environment Setup

Create a `.env.local` file with your API configuration:

```bash
# 智谱 GLM（推荐）
OPENAI_API_KEY=your_api_key
OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4
OPENAI_MODEL=glm-4-flash

# 或使用 OpenAI
OPENAI_API_KEY=your_openai_key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

**Note**: The app also supports `VITE_` prefixed variables (e.g., `VITE_OPENAI_API_KEY`) for Vite compatibility. Both prefixes work interchangeably.

## Architecture

### Application Structure

```
vocabmaster_-english-learning-app/
├── components/           # React UI components
│   ├── BookList.tsx         # Book/semester selection screen
│   ├── BookListItem.tsx     # Individual book card with progress
│   ├── UnitListItem.tsx     # Compact unit list item
│   ├── ActivitySelector.tsx # Activity type selection (单词总汇/卡片学习/Quiz)
│   ├── QuizModeSelector.tsx # Quiz mode selection (4 modes)
│   ├── FlashcardMode.tsx    # Flashcard learning with shuffle & pronunciation
│   ├── WordList.tsx         # Word list with search, filter, expand details
│   └── QuizMode.tsx         # Quiz with confirmation flow
├── services/
│   ├── aiService.ts         # OpenAI-compatible API integration
│   └── dataExport.ts        # Data export/import functionality
├── data/
│   └── vocabData.ts         # Preloaded vocabulary loader (reads from JSON)
├── utils/
│   └── highlight.tsx        # Word highlighting utility for examples
├── App.tsx                  # Main application with multi-level navigation
├── constants.ts             # Unit structure and word lists (BOOKS, UNITS)
├── types.ts                 # TypeScript definitions
└── year7_vocabulary_with_cn.json  # Preloaded vocabulary data source (word + meaning)
```

**Dual Data Sources**:
- [constants.ts](constants.ts) - Defines unit structure and word term lists (for UI navigation)
- [year7_vocabulary_with_cn.json](year7_vocabulary_with_cn.json) - Provides preloaded word+meaning data (fallback when cache is empty)
- Both work together: [data/vocabData.ts](data/vocabData.ts) maps JSON data to unit IDs from constants.ts

### Data Flow Priority

```
enrichWords() 调用流程：
┌─────────────────┐
│ 1. LocalStorage │ ← vocab_cache_{unitId} (check if enrichment needed)
└────────┬────────┘
         │ 无或需要丰富
         ▼
┌─────────────────┐
│ 2. 预存静态数据  │ ← year7_vocabulary_with_cn.json
└────────┬────────┘
         │ 无
         ▼
┌─────────────────┐
│ 3. AI API 调用   │ ← 智谱 GLM / OpenAI (enrich with phonetics, definitions, examples)
└─────────────────┘
```

**Async Enrichment**: If cached data lacks rich content (phonetic, definitions, examples), it returns immediately and enriches in background without blocking UI.

### Navigation Hierarchy

```
BOOK_LIST (VocabMaster Pro)
    └─→ UNIT_LIST (七年级上册)
            └─→ ACTIVITY_SELECT (章节名称)
                    ├─→ LEARNING (单词总汇)
                    ├─→ LEARNING (卡片学习)
                    └─→ QUIZ_MODE_SELECT (Quiz模式)
                            └─→ LEARNING (Quiz: EN_TO_CN_MCQ/CN_TO_EN_MCQ/CN_TO_EN_SPELLING/MIXED)
```

### Application Modes

| Mode | Description | Features |
|------|-------------|----------|
| `BOOK_LIST` | Book/semester selection | Shows total units and mastered words per book |
| `UNIT_LIST` | Chapter selection | Displays all units with progress indicators |
| `ACTIVITY_SELECT` | Activity type selection | 单词总汇 / 卡片学习 / Quiz |
| `QUIZ_MODE_SELECT` | Quiz mode selection | 4 quiz modes to choose from |
| `LEARNING` | Learning/Quiz mode | Flashcards, Word List, or Quiz based on activity |

### Quiz Modes

```typescript
enum QuizMode {
  EN_TO_CN_MCQ = 'EN_TO_CN_MCQ',        // 英对中单选：10 questions
  CN_TO_EN_MCQ = 'CN_TO_EN_MCQ',        // 中对英单选：10 questions
  CN_TO_EN_SPELLING = 'CN_TO_EN_SPELLING', // 中对英拼写：10 questions
  MIXED = 'MIXED'                       // 混合题型：~3 EN_TO_CN, ~3 CN_TO_EN, ~3-4 SPELLING
}
```

### Quiz Question Types

```typescript
enum QuestionType {
  EN_TO_CN = 'EN_TO_CN',     // 英译中：选择中文定义
  CN_TO_EN = 'CN_TO_EN',     // 中译英：选择英文单词
  SPELLING = 'SPELLING'      // 拼写：输入英文单词
}
```

**Quiz Confirmation Flow**: Multiple choice questions have a two-step flow:
1. Select answer → shows "已选择" indicator
2. Click "确认答案" → shows correct/incorrect with explanation
3. Click "下一题" → proceed to next question

Spelling questions submit directly on Enter/Submit button.

### Rich Word Data Structure

```typescript
interface Word {
  id: string;
  term: string;
  unit: string;
  // Rich content (AI-enriched)
  phonetic?: string;                  // 音标: "/ˈæpl/"
  definitions?: WordDefinition[];     // 多词性释义
  examples?: ExampleSentence[];       // 例句+翻译
  // Backward compatibility
  definition?: string;                // 主要释义
  example?: string;                   // 主要例句
}

interface WordDefinition {
  partOfSpeech: string;  // 词性: "n.", "v.", "adj."
  meaning: string;       // 释义: "苹果"
}

interface ExampleSentence {
  sentence: string;      // 英文例句
  translation?: string;  // 中文翻译
}
```

### State Management

- **React hooks** in App.tsx
- **Navigation state**: `navLevel`, `selectedBook`, `selectedUnit`, `selectedActivity`, `selectedQuizMode`
- **LocalStorage persistence**:
  - `vocab_progress` - User progress (masteredWords, learningWords)
  - `vocab_cache_{unitId}` - AI-enriched word cache
- Word ID format: `{unitId}-{index}` (e.g., "starter-0", "unit1-5")

### Data Export/Import

**Export Data** (`exportAppData()`):
- Downloads JSON file: `vocabmaster_backup_YYYY-MM-DD.json`
- Contains all word caches + progress data
- Triggered via "导出数据" button in footer

**Import Data** (`importAppData(file)`):
- Imports from JSON backup file
- Validates version and data structure
- Shows import statistics (units, words, mastered/learning counts)
- Reloads page to apply imported data
- Triggered via "导入数据" button in footer settings menu

### Reset Progress vs Clear Cache

**Reset Progress** (`handleResetProgress()`):
- Clears user learning progress only
- Empties `masteredWords` and `learningWords` arrays
- Keeps all word caches intact
- Use when starting fresh without losing AI-generated content

**Clear Cache** (`clearWordCache()`):
- Clears all AI-generated word caches
- Keeps user progress intact
- Next unit visit will regenerate content from AI
- Use when content needs refreshing (e.g., improved prompts)

**Export Format**:
```json
{
  "version": "1.0.0",
  "exportDate": "2025-01-XX",
  "data": {
    "words": {
      "starter": [...],
      "unit1": [...],
      ...
    },
    "progress": {
      "masteredWords": ["starter-0", "unit1-5", ...],
      "learningWords": ["starter-1", ...]
    }
  }
}
```

### Word Highlighting in Examples

The `highlightWordInSentenceReact()` function highlights the target word in example sentences:
- Uses regex with word boundaries (`\b`)
- Case-insensitive matching
- Returns `React.ReactNode` with `<span className="bg-indigo-100">` highlights
- Applied in both WordList and FlashcardMode components

### Import Path Alias

`@/*` imports resolve to the root directory (configured in vite.config.ts).

### Build Configuration

- Dev server: `0.0.0.0:3000` (network accessible)
- Environment variables injected via Vite's `define` option
- Tailwind CSS via CDN
- **Icons**: `lucide-react` - Used for all UI icons

## Recent Changes

### 2025-2026 Major Updates

#### 1. Navigation Hierarchy Redesign
- **Multi-level navigation**: Book → Unit → Activity → Quiz Mode
- New components: `BookList`, `BookListItem`, `ActivitySelector`, `QuizModeSelector`
- Proper back button handling at each navigation level
- Breadcrumb titles in header

#### 2. Rich Word Data
- Enhanced Word type with `phonetic`, `definitions[]`, `examples[]`
- AI enrichment adds: phonetics, multiple definitions (with parts of speech), example sentences with translations
- Async enrichment pipeline - returns data immediately, enriches in background
- Backward compatible with legacy `definition` and `example` fields

#### 3. WordList Component
- Search by word or meaning
- Filter: all/mastered/learning/unstudied
- Expandable word cards showing full definitions and examples
- Word highlighting in example sentences
- Quick mark buttons (✓ mastered, ✗ review)

#### 4. FlashcardMode Enhancements
- Shuffle button to randomize word order
- Front: word + phonetic + pronunciation button
- Back: multiple definitions with parts of speech (enlarged, no examples - cleaner UI)
- Flip animation timing: card flips first (500ms), then word changes (prevents jarring content jumps)
- Exit/return button in header
- Word highlighting in examples (WordList only)

#### 5. QuizMode Overhaul
- **4 Quiz Modes**: EN_TO_CN_MCQ, CN_TO_EN_MCQ, CN_TO_EN_SPELLING, MIXED
- **Confirmation Flow**: Select → Confirm → See Result → Next
- Color-coded question type badges (blue/purple/emerald)
- Spelling questions with real-time validation
- Mix mode: ~1/3 each question type, randomly shuffled

#### 6. Data Export/Import
- JSON-based backup system (no SQLite needed)
- Single file contains: word caches + progress data
- Export via "导出数据" button in footer
- Import via "导入数据" button
- Data validation and statistics on import

#### 7. AI Backend Migration
- Migrated from `@google/genai` to `openai` SDK
- Now supports OpenAI-compatible APIs (智谱 GLM, OpenAI)
- Environment variable fallbacks (OPENAI_* and VITE_OPENAI_*)

#### 8. LocalStorage Caching
- Cache key format: `vocab_cache_{unitId}`
- Async enrichment of cached data
- Clear cache via "清除缓存" button in footer

#### 9. Android Speech Synthesis Fix
- Added `voiceschanged` event listener
- Preload voices on component mount
- Set explicit voice properties (rate, pitch, volume)
- Cancel before speaking (Android compatibility)

#### 10. UI/UX Improvements
- **Footer navigation**: 3-button layout - Home | Reserved (disabled) | Settings
- **Settings popup menu**: Export Data | Import Data | Reset Progress | Clear Cache
- Click-outside-to-close functionality for settings menu
- Progress bars on book/unit cards
- Status badges (已掌握/学习中)
- Gradient icons for visual hierarchy
- Responsive design for mobile

#### 11. QuizMode Pronunciation Feature
- **Auto-play pronunciation**: English words auto-play when EN_TO_CN or SPELLING questions appear
- **Manual replay button**: Volume2 icon button next to question for on-demand replay
- **Voice loading**: Uses `voiceschanged` event to preload English voices
- **Smart delay**: 800ms delay when voices not loaded, 300ms when loaded
- Uses Web Speech Synthesis API with en-US voice preference

#### 12. Detailed Quiz Report
- **Answer tracking**: Records all answers with question, user answer, and correctness
- **Wrong questions only**: Report shows only incorrect answers for focused review
- **Celebration card**: Special "全对！太棒了！" message when all answers are correct
- **Detailed info per question**: Shows question type, correct answer, user's answer, and word details

#### 13. Quiz Retry Options
- **"同一题目再练一次"**: Retry same 10 questions, resets all progress
- **"换一批新题目"**: Generate new questions from the unit using `quizKey` state trigger
- Allows focused practice on mistakes or fresh content

#### 14. WordList Pronunciation Button Redesign
- **Larger button**: Changed from small icon to `px-4 py-2` button with icon + text "发音"
- **Two-row layout**:
  - First row: Word + status badges + pronunciation button (right-aligned)
  - Second row: Phonetic (mobile only) + definitions + action buttons
- Better accessibility and visibility on mobile devices

## Troubleshooting

### macOS Downloads Directory Permission Issues

If the project is in macOS `~/Downloads` directory and you encounter permission errors:
```bash
# Error: sh: .../node_modules/.bin/vite: Permission denied
# Error: library load disallowed by system policy (rollup.darwin-arm64.node)

# Solution: Remove quarantine attributes and fix permissions
xattr -cr node_modules
chmod +x node_modules/.bin/*
chmod +x node_modules/@esbuild/darwin-arm64/bin/esbuild
```

This happens because macOS applies quarantine attributes to files in Downloads, preventing unsigned binaries from running.

## Component Reference

### BookList
- **Props**: `books: Book[]`, `progress: UserProgress`, `onSelectBook`
- **Purpose**: Display available books/semesters with statistics
- **Features**: Progress bars, total units, mastered words count

### ActivitySelector
- **Props**: `unit: Unit`, `progress: UserProgress`, `onSelectActivity`, `onBack`
- **Purpose**: Choose learning activity type
- **Options**: 单词总汇, 卡片学习, Quiz
- **Stats**: Shows mastered/learning word counts for unit

### QuizModeSelector
- **Props**: `onSelectMode`, `onBack`
- **Purpose**: Select quiz mode before starting
- **Modes**: 4 options with icons and gradients
- **Icons**: Languages (EN→CN), RotateCcw (CN→EN), Keyboard (Spelling), Shuffle (Mixed)

### WordList
- **Props**: `words`, `progress`, `onComplete`, `onMastered`, `onReview`
- **Purpose**: Browse all words in a unit with search/filter
- **Features**: Expandable cards, word highlighting, quick status toggle
- **Layout**: Two-row word card header with large pronunciation button (icon + "发音" text)
- **Search**: Filter by word or meaning, with status filter (all/mastered/learning/unstudied)

### FlashcardMode
- **Props**: `words`, `progress`, `onComplete`, `onMastered`, `onReview`
- **Purpose**: Learn words through flip cards
- **Features**: Shuffle, pronunciation, flip animation, mastery tracking
- **Card Front**: Word + phonetic + pronunciation button
- **Card Back**: Large definitions with parts of speech (no examples - cleaner UI)
- **Animation**: 500ms flip, completes before word changes

### QuizMode
- **Props**: `words`, `quizMode`, `onComplete`
- **Purpose**: Test knowledge with various question types
- **Features**: Confirmation flow, color-coded badges, score tracking
- **Pronunciation**: Auto-plays for EN_TO_CN/SPELLING questions + manual Volume2 button
- **Report**: Shows only wrong questions with detailed info, celebration when all correct
- **Retry**: Two buttons - "同一题目再练一次" (same questions) / "换一批新题目" (new questions)

## Common Tasks

### Add a New Unit
1. Update `year7_vocabulary_with_cn.json`
2. Run `npm run dev` - app auto-loads from JSON

### Change AI Provider
1. Update `.env.local` with new API_KEY and BASE_URL
2. Optionally update MODEL name
3. Clear cache to regenerate with new provider

### Debug Word Data
1. Open DevTools Console
2. Look for `[Cache Hit]`, `[Cache Miss]`, `[Needs Enrichment]` logs
3. Check `localStorage` for `vocab_cache_*` entries
4. Check `localStorage` for `vocab_progress`

### Export/Import Data
- Export: Settings → "导出数据" → JSON file downloads
- Import: Settings → "导入数据" → Select JSON file → Auto-reload
- Reset Progress: Settings → "重置进度" → Clears mastery status (keeps caches)
- Clear Cache: Settings → "清除缓存" → Clears AI content (keeps progress)
