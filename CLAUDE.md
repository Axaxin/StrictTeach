# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VocabMaster is an English vocabulary learning app built with React 19, TypeScript, and Vite. It uses **OpenAI-compatible APIs** (支持智谱 GLM) to enrich vocabulary words with phonetics, parts of speech, multiple Chinese definitions, and English example sentences with translations. The app features preloaded vocabulary data for 7 chapters (Starter through Unit 6) covering junior high school Year 7 curriculum.

## Development Commands

```bash
npm install          # Install dependencies
npm run prebuild     # Generate static word data cache (requires API key)
npm run dev          # Start dev server on port 3000
npm run build        # Build for production
npm run preview      # Preview production build
```

### Cloudflare Workers API Commands (api/ directory)

```bash
cd api                       # Navigate to API directory
npm run dev                # Start local Workers dev server
npm run deploy             # Deploy to Cloudflare Workers
npm run d1:create          # Create D1 database
npm run d1:schema          # Initialize remote database schema (with --remote flag)
npm run d1:schema:local    # Initialize local database schema (for testing)
npm run d1:query           # Run custom D1 queries
```

### Prebuild Workflow

The app includes **pre-generated static word cache** for all 7 units (287 words) stored in `public/data/cache/`. These files are tracked in the repository, so the app works immediately without any API setup.

**To regenerate the cache (optional):**

```bash
# 1. Set up environment variables
OPENAI_API_KEY=your_key OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4 OPENAI_MODEL=glm-4-flash

# 2. Run prebuild to regenerate static cache files
npm run prebuild

# 3. Commit the updated cache files
git add public/data/cache/
```

**Available Scripts:**
- `scripts/generate-cache.ts` - Generate basic cache from JSON (no AI)
- `scripts/add-phonetics.ts` - Add phonetics from free dictionary API
- `scripts/enrich-cache.ts` - Enrich with AI (phonetics, definitions, examples)
- `scripts/prebuild.ts` - Optimized prebuild (5 words/batch, 5s delay to avoid rate limits)

**Cache Priority:**
1. Static files in `public/data/cache/{unitId}.json` (tracked in repo)
2. Fallback to `year7_vocabulary_with_cn.json` (word + meaning only)
3. Runtime AI enrichment (if cache missing)

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
│   ├── ActivitySelector.tsx # Activity type selection (单词总汇/情景阅读/Quiz/设置)
│   ├── QuizModeSelector.tsx # Quiz mode selection (4 modes)
│   ├── ContextualMode.tsx   # Contextual reading with 2 modes (full text & sentence-by-sentence)
│   ├── WordList.tsx         # Word list with search, filter, expand details
│   └── QuizMode.tsx         # Quiz with confirmation flow + timing tracking
├── services/
│   ├── aiService.ts         # OpenAI-compatible API integration
│   ├── api.ts               # Cloudflare Workers API client
│   └── dataExport.ts        # Data export/import functionality
├── scripts/               # Utility scripts
│   ├── prebuild.ts          # AI prebuild with small batches
│   ├── generate-cache.ts    # Generate basic cache from JSON
│   ├── add-phonetics.ts     # Add phonetics from free dictionary API
│   └── enrich-cache.ts      # Enrich with AI (fallback)
├── api/                    # Cloudflare Workers backend
│   ├── src/
│   │   └── index.ts         # Workers API endpoints
│   ├── schema.sql           # D1 database schema
│   ├── wrangler.toml        # Workers configuration
│   └── package.json         # API dependencies
├── public/
│   └── data/
│       ├── cache/               # Static cache files (tracked in repo, 287 words with phonetics/definitions/examples)
│       └── passages/            # Reading passages for ContextualMode (7 units: starter, unit1-6)
│           ├── starter.json     # "My First Day at Junior High"
│           ├── unit1.json       # "A Journey to Remember"
│           ├── unit2.json       # "The Music Festival Adventure"
│           ├── unit3.json       # "A Father's Love"
│           ├── unit4.json       # "A Special Spring Festival"
│           ├── unit5.json       # "A Relaxing Weekend in the Yard"
│           └── unit6.json       # "The Animal Rescue Team"
├── data/
│   └── vocabData.ts         # Vocabulary loader (static cache → JSON fallback)
├── utils/
│   ├── highlight.tsx        # Word highlighting utility for examples
│   ├── quizStrategy.ts      # Quiz word selection strategies (RANDOM/BALANCED/FOCUS)
│   └── settings.ts          # App settings management (quiz question count)
├── App.tsx                  # Main application with multi-level navigation
├── constants.ts             # Unit structure and word lists (BOOKS, UNITS)
├── types.ts                 # TypeScript definitions
└── year7_vocabulary_with_cn.json  # Preloaded vocabulary data source (word + meaning)
```

**Data Sources**:
- [constants.ts](constants.ts) - Defines unit structure and word term lists (for UI navigation)
- [public/data/cache/*.json](public/data/cache/) - **Static cache** (tracked in repo, enriched data with phonetics, definitions, examples for 287 words)
- [year7_vocabulary_with_cn.json](year7_vocabulary_with_cn.json) - Fallback data (word + meaning only)
- [data/vocabData.ts](data/vocabData.ts) - Maps data sources to unit IDs

### Cloudflare Workers API Integration

The app includes a **Cloudflare Workers + D1** backend for cross-device sync and AI-judged word mastery:

**Architecture:**
```
Frontend (VocabMaster App)
    ↓ POST /api/attempts
Cloudflare Workers (api/src/index.ts)
    ↓ SQL Queries
Cloudflare D1 Database (SQLite at edge)
    ├── attempts table (答题记录)
    ├── mastery table (单词熟练度)
    └── user_stats table (学习统计)
```

**API Endpoints:**
- `POST /api/attempts` - Record quiz attempts with timing data
- `GET /api/mastery/:wordId` - Get single word mastery level
- `GET /api/mastery` - Batch get mastery levels (URL params)
- `POST /api/mastery/batch` - Batch get mastery levels (POST body)
- `GET /api/words/need-practice` - Get words needing practice
- `GET /api/stats` - Get learning statistics
- `GET /api/health` - Health check
- `DELETE /api/units/:unitId` - Delete all learning data for a unit (attempts + mastery)

**Features:**
- **Timing tracking**: Each quiz question is timed (milliseconds)
- **Mastery calculation**: Based on accuracy, attempt count, and recency
- **Cross-device sync**: Progress synchronized across devices via Cloudflare
- **Offline-first**: App works without API, syncs when available

**Environment Setup:**
```bash
# .env.local or .env
VITE_API_URL=https://vocabmaster-api.YOUR-SUBDOMAIN.workers.dev
```

### Data Flow Priority

```
enrichWords() 调用流程：
┌─────────────────┐
│ 1. LocalStorage │ ← vocab_cache_{unitId} (check if enrichment needed)
└────────┬────────┘
         │ 无或需要丰富
         ▼
┌─────────────────┐
│ 2. 静态缓存文件  │ ← public/data/cache/{unitId}.json (generated by prebuild)
└────────┬────────┘
         │ 无
         ▼
┌─────────────────┐
│ 3. JSON基础数据  │ ← year7_vocabulary_with_cn.json (word + meaning only)
└────────┬────────┘
         │ 无
         ▼
┌─────────────────┐
│ 4. AI API 调用   │ ← 智谱 GLM / OpenAI (enrich with phonetics, definitions, examples)
└─────────────────┘
```

**Async Enrichment**: If cached data lacks rich content (phonetic, definitions, examples), it returns immediately and enriches in background without blocking UI.

### Navigation Hierarchy

```
BOOK_LIST (VocabMaster Pro)
    └─→ UNIT_LIST (七年级上册)
            └─→ ACTIVITY_SELECT (章节名称)
                    ├─→ LEARNING (单词总汇)
                    ├─→ LEARNING (情景阅读 - ContextualMode)
                    ├─→ QUIZ_MODE_SELECT (Quiz模式)
                    └─→ SETTINGS (单元设置)
                            └─→ LEARNING (Quiz: EN_TO_CN_MCQ/CN_TO_EN_MCQ/CN_TO_EN_SPELLING/MIXED)
```

### Application Modes

| Mode | Description | Features |
|------|-------------|----------|
| `BOOK_LIST` | Book/semester selection | Shows total units and mastered words per book |
| `UNIT_LIST` | Chapter selection | Displays all units with progress indicators |
| `ACTIVITY_SELECT` | Activity type selection | 单词总汇 / 情景阅读 / Quiz / 设置 |
| `QUIZ_MODE_SELECT` | Quiz mode selection | 4 quiz modes to choose from |
| `LEARNING` | Learning/Quiz mode | ContextualMode, WordList, or Quiz based on activity |
| `SETTINGS` | Unit settings modal | Statistics display and reset functionality |

### Quiz Modes

```typescript
enum QuizMode {
  EN_TO_CN_MCQ = 'EN_TO_CN_MCQ',        // 英对中单选：12 questions (可配置 6-24)
  CN_TO_EN_MCQ = 'CN_TO_EN_MCQ',        // 中对英单选：12 questions (可配置 6-24)
  CN_TO_EN_SPELLING = 'CN_TO_EN_SPELLING', // 中对英拼写：12 questions (可配置 6-24)
  MIXED = 'MIXED'                       // 混合题型：~4 EN_TO_CN, ~4 CN_TO_EN, ~4 SPELLING
}
```

### Quiz Strategies (2026)

```typescript
enum QuizStrategy {
  RANDOM = 'RANDOM',          // 一般模式：等概率随机选择
  BALANCED = 'BALANCED',      // 平衡模式：练习次数少的词概率更高
  FOCUS = 'FOCUS',            // 攻克模式：优先选择低熟练度单词
}
```

**Strategy Details:**
- **RANDOM**: 纯随机选择，适合全面复习
- **BALANCED**: 加权随机（权重 = 1/(attempt_count+1)），优先选练习少的词
- **FOCUS**: 分层选择，优先选 mastery_level < 40 的词，其次 < 60 的词

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

### Quiz Question Data Structure

```typescript
interface QuizQuestion {
  word: Word;             // Associated word
  type: QuestionType;     // EN_TO_CN / CN_TO_EN / SPELLING
  question: string;       // Question text
  options?: string[];     // Multiple choice options (for MCQ types)
  correctAnswer: string;  // Correct answer
}
```

### State Management

- **React hooks** in App.tsx
- **Navigation state**: `navLevel`, `selectedBook`, `selectedUnit`, `selectedActivity`, `selectedQuizMode`
- **LocalStorage persistence**:
  - `vocab_progress` - User progress (masteredWords, learningWords)
  - `vocab_cache_{unitId}` - AI-enriched word cache
- Word ID format: `{unitId}-{index}` (e.g., "starter-0", "unit1-5")

### Settings Menu Functions (2026)

The settings menu has been redesigned for cloud-native architecture:

**Cloud Service Status** (`handleCloudStatus()`):
- Tests connection to Cloudflare Workers API
- Displays API endpoint URL
- Shows response status and data
- Helps diagnose sync issues

**About** (`handleAbout()`):
- Displays app version (1.0.0)
- Lists key features and technologies
- Shows word count (287 words across 7 units)

### Word Highlighting in Examples

The `highlightWordInSentenceReact()` function highlights the target word in example sentences:
- Uses regex with word boundaries (`\b`)
- Case-insensitive matching
- Returns `React.ReactNode` with `<span className="bg-indigo-100">` highlights
- Applied in WordList and ContextualMode components

### Import Path Alias

`@/*` imports resolve to the root directory (configured in vite.config.ts).

### Build Configuration

- Dev server: `0.0.0.0:3000` (network accessible)
- Environment variables injected via Vite's `define` option
- Tailwind CSS via CDN
- **Icons**: `lucide-react` - Used for all UI icons

## Recent Changes

### 2026 Q1 Updates

#### 21. Quiz Strategy Selection System (2026)
- **三种出题策略**：
  - **一般模式 (RANDOM)**：等概率随机选择单词
  - **平衡模式 (BALANCED)**：练习次数少的词概率更高（权重公式：1/(attempt_count+1)）
  - **攻克模式 (FOCUS)**：优先选择低熟练度单词（mastery_level < 40 优先）
- **策略实现**：`utils/quizStrategy.ts` - 加权随机选择算法
- **默认策略**：Quiz 默认使用一般模式
- **重试选项**：
  - "同一题目再练一次"：使用 RANDOM 模式
  - "换一批新题目（平衡）"：使用 BALANCED 模式
  - "换一批新题目（攻克）"：使用 FOCUS 模式

#### 22. Audio Playback Fix for Arc/Chromium (2026)
- **问题**：Arc 浏览器（Chromium 内核）中 Web Speech API 无法播放声音
- **原因**：每次调用 `speak()` 都先调用 `cancel()`，导致 utterance 被取消
- **解决方案**：移除所有 `speak()` 函数开头的 `cancel()` 调用
- **影响组件**：WordList、QuizMode、ContextualMode
- **浏览器兼容性**：Safari、Edge、Arc 现在都能正常播放

#### 23. Navigation System Simplification (2026)
- **移除冗余返回按钮**：删除顶部导航栏和所有子页面的返回按钮
- **统一导航**：仅使用底部导航栏的"返回"按钮
- **影响组件**：App.tsx、WordList、ActivitySelector、QuizModeSelector、ContextualMode
- **优势**：减少UI冗余，简化导航逻辑

#### 24. WordList UI Refinements (2026)
- **移除卡片音标**：卡片上不再显示音标（仅模态框中显示）
- **修复长单词截断**：使用 `break-words` 替代 `truncate`，字体从 `text-2xl` 降至 `text-xl`
- **优化释义文本层级**：词性标签 `font-semibold text-xs`，释义 `text-sm`
- **修复模态框头部布局**：关闭按钮移至右上角外侧，播放按钮移至左侧，避免重叠
- **布局重组**：测试统计 → 搜索框 → 分类筛选 → 单词网格（更符合用户浏览流程）
- **单词总数位置**：移至顶部导航栏面包屑标题 "单词总汇 (42)"

#### 25. Settings Menu Cleanup (2026)
- **移除废弃功能**：删除"清除本地缓存"按钮和相关功能
- **云端架构**：数据已全部云端化，无需本地缓存管理
- **保留功能**：云端服务状态、关于

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

#### 4. FlashcardMode (已废弃，被 ContextualMode 取代)
- 原卡片学习功能已被情景阅读模块取代
- 文件保留在 `components/FlashcardMode.tsx` 仅供参考
- 请使用 ContextualMode 进行阅读学习

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
- **Settings popup menu**: Cloud Service Status | About
- Click-outside-to-close functionality for settings menu
- Progress bars on book/unit cards
- Status badges (已掌握/学习中)
- Gradient icons for visual hierarchy
- Responsive design for mobile
- **Simplified navigation**: Unified bottom navigation back button (no redundant back buttons in pages)

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

#### 15. Cloudflare Workers + D1 Integration (2026)
- **Backend API**: Cloudflare Workers for cross-device sync and mastery tracking
- **Database**: Cloudflare D1 (SQLite at edge) for attempts and mastery data
- **Quiz timing**: Each question timed in milliseconds, sent to API on completion
- **Mastery system**: Automatic calculation based on accuracy, attempts, and timing
- **Sync status indicators**: Recording spinner, success/error messages in quiz results
- **Mastery badges**: Color-coded proficiency levels on wrong answers (80%+ green, 60%+ yellow, 40%+ orange, <40% red)
- **Offline-first**: App works without API, gracefully handles connection failures
- **itty-router v4 fix**: Correctly passes `env` parameter to route handlers for D1 access
- **Remote database initialization**: Schema initialized with `--remote` flag for production

**Mastery Data Structure:**
```typescript
interface WordMastery {
  word_id: string;
  word_term: string;
  unit_id: string;
  mastery_level: number;     // 0-100 熟练度分数
  attempt_count: number;     // 总答题次数
  correct_count: number;     // 正确次数
  total_time_spent: number;  // 总用时（毫秒）
  last_attempt_at: string;
  last_correct_at?: string;
}
```

**Quiz Timing Flow:**
1. Question appears → `questionStartTime` recorded
2. User answers → `timeSpent` calculated (Date.now() - questionStartTime)
3. Quiz completes → All attempts sent to `/api/attempts`
4. Mastery updated → Backend calculates new mastery levels
5. Frontend fetches → Updated mastery displayed in results

#### 16. Static Cache Format Update & QuizMode Compatibility
- **New format**: `definitions: [{partOfSpeech, meaning}]` array instead of `definition: string`
- **Backward compatibility**: `getDefinition()` helper function handles both formats
- **QuizMode fix**: All quiz modes now correctly extract definitions from new cache format
- **Affected modes**: EN_TO_CN_MCQ, CN_TO_EN_MCQ, CN_TO_EN_SPELLING, MIXED

#### 17. Settings Menu Redesign (2026)
- **Removed**: Export/Import JSON (data now in cloud, no need for local backups)
- **Added**: Cloud Service Status - Test API connection and display endpoint info
- **Updated**: Reset Local Progress - Only clears LocalStorage, preserves cloud data
- **Updated**: Clear Local Cache - Now clarifies it doesn't affect cloud records
- **Added**: About - Shows app version and feature list

#### 18. Real-Time Quiz Timer (2026)
- **Timer display**: Shows elapsed time per question in seconds (0.1s precision)
- **Visual indicator**: Timer icon with amber color in header
- **Updates every 100ms**: Smooth real-time countdown
- **Accuracy**: Uses `currentElapsedTime` state for both display and recording

#### 19. ContextualMode - 情景阅读模块 (2026)
- **替代FlashcardMode**：原本的卡片学习被情景阅读取代
- **两种阅读模式**：
  - **全文阅读模式**：完整段落显示，英文原文+中文译文分开显示，支持全文连续朗读
  - **逐句拆解模式**：每句独立显示，英文+中文成对显示，每句有独立的播放/停止按钮
- **音频控制系统**：
  - 全文模式：播放/暂停/停止按钮，进度显示
  - 逐句模式：每句独立的播放/停止按钮，当前播放句子高亮显示
  - 自动播放：全文模式下自动连续播放所有句子
  - 组件卸载时自动停止所有音频
- **单词交互**：点击高亮单词查看详情面板（发音、释义、例句）
- **7个单元内容**：Starter到Unit6，每个单元有独立的阅读passage

**Passage JSON结构** (`public/data/passages/{unitId}.json`):
```json
{
  "title": "文章标题",
  "paragraphs": [
    {
      "sentences": [
        {
          "english": "English sentence.",
          "chinese": "中文翻译。"
        }
      ]
    }
  ]
}
```

#### 20. 单元设置重置功能 (2026)
- **后端API**：`DELETE /api/units/:unitId` - 删除指定单元的所有attempts和mastery记录
- **前端UI**：单元设置 → 重置学习统计
- **功能流程**：
  1. 点击设置按钮打开单元设置弹窗
  2. 显示学习统计（测试次数、正确率、错误次数、平均用时）
  3. 点击"重置学习统计"进入确认界面
  4. 确认后调用API删除云端数据
  5. 成功后2秒自动关闭并刷新数据
- **错误处理**：显示错误信息，支持重试
- **Loading状态**：重置中显示loading动画

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

### Cloudflare Workers API Issues

**Problem**: "Cannot read properties of undefined (reading 'DB')"
- **Cause**: Workers not deployed or `env` parameter not passed to router
- **Solution**:
  ```bash
  cd api
  npm run deploy  # Re-deploy to ensure D1 binding is active
  ```
  The issue was fixed by changing `router.handle(request)` to `router.handle(request, env)` in `api/src/index.ts`

**Problem**: "no such table: attempts"
- **Cause**: D1 database tables not initialized
- **Solution**:
  ```bash
  cd api
  npm run d1:schema  # Initialize remote database schema
  ```

**Problem**: Quiz data not syncing
- **Check**: Browser DevTools Console for error messages
- **Test**: Settings → "云端服务状态" to verify API connection
- **Verify**: `.env.local` contains correct `VITE_API_URL`
- **Fallback**: App works offline, syncs when connection restored

### Audio Playback Issues (Arc/Chromium Browsers)

**Problem**: No sound plays in Arc browser, but works in Safari
- **Cause**: Web Speech API in Arc sometimes enters a "bad state"
- **Solution**: Restart the browser to clear the cached state
- **Prevention**: The app now avoids calling `cancel()` before `speak()` to prevent triggering this state
- **Browser Status**: Safari, Edge, Arc (after restart) all work correctly

## Component Reference

### BookList
- **Props**: `books: Book[]`, `progress: UserProgress`, `onSelectBook`
- **Purpose**: Display available books/semesters with statistics
- **Features**: Progress bars, total units, mastered words count

### ActivitySelector
- **Props**: `unit: Unit`, `onSelectActivity`, `onBack`
- **Purpose**: Choose learning activity type or manage unit settings
- **Options**: 单词总汇, 情景阅读, Quiz, 设置
- **Stats**: Shows mastered/learning word counts for unit (from cloud mastery data)
- **Settings**:
  - 单元学习统计显示（测试次数、正确率、错误次数、平均用时）
  - 重置学习统计功能（删除云端所有attempts和mastery数据）
  - 确认流程防止误操作
  - Loading状态和错误处理

### QuizModeSelector
- **Props**: `onSelectMode`, `onBack`
- **Purpose**: Select quiz mode before starting
- **Modes**: 4 options with icons and gradients
- **Icons**: Languages (EN→CN), RotateCcw (CN→EN), Keyboard (Spelling), Shuffle (Mixed)

### WordList
- **Props**: `words`, `progress`, `onComplete`, `onMastered`, `onReview`
- **Purpose**: Browse all words in a unit with search/filter
- **Features**: Responsive grid layout, modal detail view, word highlighting, quick status toggle
- **Layout**:
  - Cloud test statistics section (共测试、正确、错误、平均用时)
  - Search box
  - Category filter buttons (新词/生疏/一般/熟练/精通/全部)
  - Responsive word grid (1/2/3 columns)
- **Card Design**: Shows word, proficiency badge, definition preview, test stats, pronunciation button
- **Modal**: Full phonetics, all definitions with parts of speech, example sentences, detailed test stats
- **Search**: Filter by word or meaning, with status filter (all/mastered/learning/unstudied)
- **Navigation**: Word count displayed in breadcrumb title "单词总汇 (42)"

### ContextualMode
- **Props**: `words`, `unitId`, `onComplete`
- **Purpose**: Learn words through contextual reading passages
- **Features**:
  - 两种模式切换：全文阅读 / 逐句拆解
  - 全文模式：段落式显示，英文原文+中文译文，支持全文连续朗读
  - 逐句模式：每句独立显示，英文+中文成对，每句有独立的音频按钮
  - 音频控制：播放/暂停/停止，进度指示，自动连续播放
  - 单词交互：点击高亮单词查看详情面板
  - 组件卸载时自动停止所有音频
- **Passage结构**：从 `public/data/passages/{unitId}.json` 加载
- **Sentence解析**：按段落组织，每句独立存储english和chinese

### QuizMode
- **Props**: `words`, `quizMode`, `onComplete`
- **Purpose**: Test knowledge with various question types
- **Features**: Confirmation flow, color-coded badges, score tracking
- **Pronunciation**: Auto-plays for EN_TO_CN/SPELLING questions + manual Volume2 button
- **Real-time timer**: Shows elapsed time per question (Timer icon, amber color, 0.1s precision)
- **Report**: Shows only wrong questions with detailed info, celebration when all correct
- **Retry Options** (3种):
  1. "同一题目再练一次"：使用 RANDOM 模式，相同单词重新出题
  2. "换一批新题目（平衡）"：使用 BALANCED 模式，优先选练习少的词
  3. "换一批新题目（攻克）"：使用 FOCUS 模式，优先选低熟练度词
- **Timing tracking**: Records time spent on each question (milliseconds)
- **Cloud sync**: Auto-sends attempts to Cloudflare Workers API on completion
- **Mastery display**: Shows proficiency level badges on wrong answers
- **Error handling**: Detailed sync error messages with auto-dismiss (5-8 seconds)

## Common Tasks

### Prepare for Production Build
1. Ensure API key is set: `OPENAI_API_KEY=your_key` (in `.env.local` or environment)
2. Run `npm run prebuild` to generate static cache files in `public/data/cache/`
3. Run `npm run build` to create production bundle
4. Deploy - the app will use static cache files, no runtime AI calls needed

### Add a New Unit
1. Update `year7_vocabulary_with_cn.json` with new words
2. Update `constants.ts` to add the unit to the UNITS array
3. Run `npm run prebuild` to generate cache for the new unit
4. Run `npm run dev` to test

### Change AI Provider
1. Update `.env.local` with new API_KEY and BASE_URL
2. Optionally update MODEL name
3. Run `npm run prebuild` to regenerate cache with new provider

### Debug Word Data
1. Open DevTools Console
2. Look for `[Static Cache]`, `[Cache Hit]`, `[Cache Miss]`, `[Needs Enrichment]` logs
3. Check `localStorage` for `vocab_cache_*` entries
4. Check `localStorage` for `vocab_progress`

### Settings Menu Functions
- **Cloud Service Status**: Settings → "云端服务状态" → Test API connection
- **About**: Settings → "关于" → Show app info

### Unit Settings (ActivitySelector)
- **Quiz Question Count**: 可配置每次测验的题目数量（6-24题，默认12题）
- **Statistics Display**: 测试次数、正确率、错误次数、平均用时
- **Reset Unit Data**: 重置本单元所有云端学习数据（attempts + mastery）

### Deploy Cloudflare Workers API

**First-time setup:**
```bash
# 1. Install Wrangler CLI
npm install -g wrangler

# 2. Login to Cloudflare
wrangler login

# 3. Create D1 database
cd api
wrangler d1 create vocabmaster-db

# 4. Update wrangler.toml with the returned database_id
# Example: database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# 5. Initialize remote database schema (IMPORTANT: use --remote for production)
npm run d1:schema  # Runs with --remote flag

# 6. Deploy Workers
npm run deploy

# 7. Update .env.local with your Workers URL
# VITE_API_URL=https://vocabmaster-api-xxx.workers.dev
```

**Deploying updates:**
```bash
cd api
npm run deploy  # Re-deploy after code changes
```

**Important Notes:**
- Use `npm run d1:schema` to initialize remote database (includes `--remote` flag)
- Use `npm run d1:schema:local` to initialize local database for testing
- The `itty-router` requires `router.handle(request, env)` to pass D1 bindings correctly
- Always verify D1 bindings are active after deployment (check deployment output for "env.DB")

**Running Workers locally:**
```bash
cd api
npm run dev  # Starts local dev server on http://localhost:8787
```
