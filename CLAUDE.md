# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

StrictTeach is an English vocabulary learning app built with React 19, TypeScript, and Vite. It features **pre-enriched vocabulary data** with phonetics, parts of speech, multiple Chinese definitions, and English example sentences with translations. The app includes vocabulary for 7 chapters (Starter through Unit 6) covering junior high school Year 7 curriculum.

**Note**: The app uses **static cache files** (tracked in the repo) containing fully enriched word data. AI APIs are only used during prebuild to generate these caches, not at runtime.

## Development Commands

```bash
npm install          # Install dependencies
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

### Prebuild Workflow (Cache Regeneration)

The app includes **pre-generated static word cache** for all 7 units (287 words) stored in `public/data/cache/`. These files are tracked in the repository, so the app works immediately without any API setup.

**To regenerate the cache (optional):**

```bash
# 1. Install the openai package (needed for prebuild scripts only)
npm install openai

# 2. Set up environment variables
OPENAI_API_KEY=your_key OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4 OPENAI_MODEL=glm-4-flash

# 3. Run prebuild to regenerate static cache files
npm run prebuild:real

# 4. Commit the updated cache files
git add public/data/cache/
```

**Note**: Running `npm run prebuild` will show a message indicating static cache already exists. Use `npm run prebuild:real` to actually regenerate the cache.

**Available Scripts:**
- `scripts/prebuild.ts` - Optimized AI prebuild (5 words/batch, 5s delay to avoid rate limits)
- `scripts/generate-cache.ts` - Generate basic cache from JSON (no AI)
- `scripts/add-phonetics.ts` - Add phonetics from free dictionary API
- `scripts/enrich-cache.ts` - Enrich with AI (phonetics, definitions, examples)

**Cache Priority:**
1. Static files in `public/data/cache/{unitId}.json` (tracked in repo, 287 words with full enrichment)
2. Fallback to `year7_vocabulary_with_cn.json` (word + meaning only)
3. Basic structure fallback (should not happen)

### Key Dependencies

- `react@19` + `react-dom@19` - UI framework
- `lucide-react` - Icon library for UI components
- `vite` - Build tool and dev server
- `typescript` - Type safety
- `openai` - **Only for cache regeneration** (install with `npm install openai` if needed)

## Environment Setup

### For Cloud Sync (Optional)

Create a `.env.local` file with your Cloudflare Workers API URL:

```bash
VITE_API_URL=https://strictteach-api.YOUR-SUBDOMAIN.workers.dev
```

### For Cache Regeneration (Optional)

If you need to regenerate the static word cache (not required for normal operation), set AI API configuration:

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
strictteach_-english-learning-app/
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
│   ├── aiService.ts         # Word data caching (LocalStorage + static cache files, no runtime AI)
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
│   ├── sentenceSelector.ts  # Sentence selection for fill-in-blank questions
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

The app includes a **Cloudflare Workers + D1** backend for cross-device sync and algorithmic word mastery calculation:

**Architecture:**
```
Frontend (StrictTeach App)
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
VITE_API_URL=https://strictteach-api.YOUR-SUBDOMAIN.workers.dev
```

### Data Flow Priority

```
enrichWords() 调用流程：
┌─────────────────┐
│ 1. LocalStorage │ ← vocab_cache_{unitId} (cached for fast loading)
└────────┬────────┘
         │ 无
         ▼
┌─────────────────┐
│ 2. 静态缓存文件  │ ← public/data/cache/{unitId}.json (pre-generated with full enrichment)
└────────┬────────┘
         │ 无
         ▼
┌─────────────────┐
│ 3. JSON基础数据  │ ← year7_vocabulary_with_cn.json (word + meaning only, fallback)
└────────┬────────┘
         │ 无
         ▼
┌─────────────────┐
│ 4. 基础结构      │ ← Empty shell (should not happen)
└─────────────────┘
```

**No Runtime AI Calls**: The app uses pre-generated static cache files with full enrichment (phonetics, definitions, examples). AI API is only used during prebuild to generate these cache files, not at runtime.

### Navigation Hierarchy

```
BOOK_LIST (StrictTeach Pro)
    └─→ UNIT_LIST (七年级上册)
            └─→ ACTIVITY_SELECT (章节名称)
                    ├─→ LEARNING (单词总汇)
                    ├─→ LEARNING (情景阅读 - ContextualMode)
                    ├─→ QUIZ_MODE_SELECT (Quiz模式)
                    └─→ SETTINGS (单元设置)
                            └─→ LEARNING (Quiz: EN_TO_CN_MCQ/CN_TO_EN_MCQ/CN_TO_EN_SPELLING/FILL_IN_BLANK_MCQ/FILL_IN_BLANK_SPELLING/MIXED)
```

### Application Modes

| Mode | Description | Features |
|------|-------------|----------|
| `BOOK_LIST` | Book/semester selection | Shows total units and mastered words per book |
| `UNIT_LIST` | Chapter selection | Displays all units with progress indicators |
| `ACTIVITY_SELECT` | Activity type selection | 单词总汇 / 情景阅读 / Quiz / 设置 |
| `QUIZ_MODE_SELECT` | Quiz mode selection | 6 quiz modes to choose from |
| `LEARNING` | Learning/Quiz mode | ContextualMode, WordList, or Quiz based on activity |
| `SETTINGS` | Unit settings modal | Statistics display and reset functionality |

### Quiz Modes

```typescript
enum QuizMode {
  EN_TO_CN_MCQ = 'EN_TO_CN_MCQ',        // 英对中单选：12 questions (可配置 6-24)
  CN_TO_EN_MCQ = 'CN_TO_EN_MCQ',        // 中对英单选：12 questions (可配置 6-24)
  CN_TO_EN_SPELLING = 'CN_TO_EN_SPELLING', // 中对英拼写：12 questions (可配置 6-24)
  FILL_IN_BLANK_MCQ = 'FILL_IN_BLANK_MCQ', // 句子填空(选择)：12 questions (可配置 6-24)
  FILL_IN_BLANK_SPELLING = 'FILL_IN_BLANK_SPELLING', // 句子填空(拼写)：12 questions (可配置 6-24)
  MIXED = 'MIXED'                       // 混合题型：20%填空+50%拼写+30%选择，填空题随机为选择或拼写
}
```

**句子填空题型** (2026):
- 使用情景阅读文章中的句子生成填空题
- **选择题形式** (FILL_IN_BLANK_MCQ)：显示完整句子（单词替换为___），提供4个选项
- **拼写形式** (FILL_IN_BLANK_SPELLING)：仅显示"___"和中文释义提示，用户需要输入完整单词
- 优先使用文章句子，如无则回退到单词例句
- 与情景阅读模块结合，提供语境化的学习体验

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
  EN_TO_CN = 'EN_TO_CN',                      // 英译中：选择中文定义
  CN_TO_EN = 'CN_TO_EN',                      // 中译英：选择英文单词
  SPELLING = 'SPELLING',                      // 拼写：输入英文单词
  FILL_IN_BLANK = 'FILL_IN_BLANK',            // 句子填空（MIXED模式通用）
  FILL_IN_BLANK_MCQ = 'FILL_IN_BLANK_MCQ',    // 句子填空(选择)
  FILL_IN_BLANK_SPELLING = 'FILL_IN_BLANK_SPELLING',  // 句子填空(拼写)
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
  // Rich content (pre-enriched via prebuild scripts)
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

interface PassageSentence {
  english: string;       // 英文句子
  chinese: string;       // 中文翻译
  index?: number;        // 句子索引（可选）
}

interface Passage {
  title: string;         // 文章标题
  paragraphs: {
    sentences: PassageSentence[];
  }[];
}
```

### Quiz Question Data Structure

```typescript
interface QuizQuestion {
  word: Word;             // Associated word
  type: QuestionType;     // EN_TO_CN / CN_TO_EN / SPELLING / FILL_IN_BLANK_MCQ / FILL_IN_BLANK_SPELLING
  question: string;       // Question text
  options?: string[];     // Multiple choice options (for MCQ types)
  correctAnswer: string;  // Correct answer
  sentenceContext?: {     // Fill-in-blank questions only
    originalSentence: string;  // 原始完整句子
    hint: string;              // 中文释义提示
  };
}
```

### State Management

- **React hooks** in App.tsx
- **Navigation state**: `navLevel`, `selectedBook`, `selectedUnit`, `selectedActivity`, `selectedQuizMode`
- **LocalStorage persistence**:
  - `vocab_progress` - User progress (masteredWords, learningWords)
  - `vocab_cache_{unitId}` - Static cache (copies of public/data/cache files for faster loading)
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

#### 26. 句子填空题型 (Fill-in-Blank Questions) (2026)
- **新功能**：基于情景阅读文章的句子填空题型
- **新增QuizMode枚举**：
  - `FILL_IN_BLANK_MCQ` - 句子填空(选择)：显示完整句子（单词替换为___），4个选项
  - `FILL_IN_BLANK_SPELLING` - 句子填空(拼写)：仅显示"___"和释义提示
- **新增QuestionType枚举**：
  - `FILL_IN_BLANK_MCQ` - 填空选择题
  - `FILL_IN_BLANK_SPELLING` - 填空拼写题
- **新增工具模块**：`utils/sentenceSelector.ts`
  - `findSentencesWithWord()` - 从文章/例句中查找包含目标词的句子
  - `createFillInBlankQuestion()` - 将句子中的单词替换为填空
  - `getDefinitionHint()` - 获取单词释义（用于填空题提示）
- **句子来源优先级**：
  1. 文章句子 (`public/data/passages/{unitId}.json`)
  2. 单词例句（备选方案）
- **UI设计**：
  - 填空选择题：靛青色(indigo)徽章，BookOpen图标，显示完整句子+提示+4选项
  - 填空拼写题：紫色(violet)徽章，PenTool图标，仅显示"___"+提示
- **与情景阅读结合**：学生刚读过文章，在Quiz中看到相同句子的填空题，增强记忆
- **后端兼容**：无需修改，`question_type`字段支持任意字符串值

**数据结构扩展**：
```typescript
// QuizQuestion 接口扩展
interface QuizQuestion {
  // ... 现有字段
  sentenceContext?: {
    originalSentence: string;  // 原始完整句子
    hint: string;              // 中文释义提示
    chineseTranslation?: string; // 中文翻译
  };
}
```

#### 27. 句子填空题型 UI 优化 (2026)
- **填空动态显示**：填空题的"___"会根据用户输入动态更新内容
  - 未确认时显示用户输入或"___"
  - 确认后显示正确答案或用户答案
- **移除奇怪的高亮**：去掉原有的青色/靛青色背景高亮，改用简洁的下划线设计
- **移除冗余提示**：填空选择题不再显示额外的提示区域（中文翻译已足够）
- **自动聚焦**：填空拼写题自动聚焦到输入框，提升用户体验
- **错题报告优化**：
  - 填空题错题显示原句
  - 正确答案单词在原句中绿色高亮显示
  - 帮助学生理解语境中的正确用法

#### 28. 熟练度评分算法重设计 (2026)
- **问题**：旧算法逻辑混乱（正确率分+效率分-错误惩罚），收敛太慢，门槛过低
- **新算法**：`分数 = min(等级上限, 正确率 × 效率系数)`
- **分段上限机制**（根据答题次数防止运气成分）：
  | 次数 | 上限 | 说明 |
  |------|------|------|
  | 1-2次 | 59分 | 鼓励开始，只要答对就有分 |
  | 3-4次 | 79分 | 需要一定的稳定性 |
  | 5-9次 | 89分 | 需要较高的正确率 |
  | 10+次 | 100分 | 可以达到精通 |
- **效率系数**（有拼写题时）：
  | 平均用时 | 系数 | 说明 |
  |---------|------|------|
  | ≤6秒 | 1.0 | 满分效率（精通水平） |
  | 6-10秒 | 0.90 | 很好 |
  | 10-15秒 | 0.75 | 良好 |
  | 15-25秒 | 0.60 | 一般 |
  | >25秒 | 0.50 | 较慢 |
- **精通标准**（10+次答题）：
  - 95%正确率 + ≤6秒 = 95分（精通）
  - 100%正确率 + ≤10秒 = 90分（熟练）
- **改进点**：
  - ✅ 逻辑清晰：移除重复的错误惩罚
  - ✅ 收敛更快：10次左右可达到精通（而非30+次）
  - ✅ 进步明显：前几次能看到明显提升（59→79→89）
  - ✅ 门槛合理：精通需要95%正确率+很快速度
- **后端更新**：
  - `FILL_IN_BLANK_MCQ` 归类为 MCQ 计算正确率
  - `FILL_IN_BLANK_SPELLING` 归类为 Spelling 计算正确率（2x权重）

### 2025-2026 Major Updates

#### 1. Navigation Hierarchy Redesign
- **Multi-level navigation**: Book → Unit → Activity → Quiz Mode
- New components: `BookList`, `BookListItem`, `ActivitySelector`, `QuizModeSelector`
- Proper back button handling at each navigation level
- Breadcrumb titles in header

#### 2. Rich Word Data
- Enhanced Word type with `phonetic`, `definitions[]`, `examples[]`
- Pre-generated static cache files with phonetics, multiple definitions (with parts of speech), example sentences with translations
- Cache files tracked in repo - no runtime AI calls needed
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
- **6 Quiz Modes**: EN_TO_CN_MCQ, CN_TO_EN_MCQ, CN_TO_EN_SPELLING, FILL_IN_BLANK_MCQ, FILL_IN_BLANK_SPELLING, MIXED
- **Confirmation Flow**: Select → Confirm → See Result → Next
- Color-coded question type badges (blue/purple/emerald/indigo/violet)
- Spelling questions with real-time validation
- Mix mode: 20% fill-in-blank + 50% spelling + 30% MCQ, fill-in-blank randomly 50/50 MCQ vs spelling
- Fill-in-blank questions use passage sentences from ContextualMode

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

#### 29. Access Password Protection (2026)
- **功能**: 可选的访问密码保护，用于限制单用户使用
- **环境变量**: `VITE_ACCESS_PASSWORD` - 在 `.env.local` 或 Cloudflare Pages 环境变量中设置
- **行为**:
  - 未设置密码时：直接进入应用，无需验证
  - 设置密码后：显示密码验证界面，输入正确密码才能访问
- **记住验证**: 验证成功后存储在 LocalStorage，下次无需重新输入
- **UI 设计**: 渐变背景 + 居中白色卡片，简洁美观

**配置示例**:
```bash
# .env.local 或 Cloudflare Pages 环境变量
VITE_ACCESS_PASSWORD=your_password_here
```

**禁用密码保护**:
```bash
# 留空或不设置此变量即可
VITE_ACCESS_PASSWORD=
```

## Project Status Summary (2026)

### Current Features
StrictTeach is a mature English vocabulary learning app with:
- **6 Quiz Modes**: EN_TO_CN_MCQ, CN_TO_EN_MCQ, CN_TO_EN_SPELLING, FILL_IN_BLANK_MCQ, FILL_IN_BLANK_SPELLING, MIXED
- **3 Quiz Strategies**: RANDOM (balanced), BALANCED (prioritize less-practiced), FOCUS (prioritize low-mastery)
- **Cloud-based mastery tracking**: All progress synced via Cloudflare Workers + D1
- **7 Units** with 287 words total, each with contextual reading passages
- **Rich word data**: Phonetic, multiple definitions (with parts of speech), example sentences with translations

### Recent Major Improvements (Session 2026-02)
1. **Fill-in-Blank Questions** - Contextual questions from reading passages, supports both MCQ and spelling variants
2. **Refined Mastery Algorithm** - Simpler formula with progressive caps based on attempt count, higher skill ceiling (95% accuracy + fast speed for mastery)
3. **UI Polish** - Dynamic blank display, auto-focus for spelling inputs, enhanced error reports with sentence context
4. **Project Rebranding** - Renamed from VocabMaster to StrictTeach across all files, API, and documentation
5. **Learning Progress Adjustment** - Progress bars now count words with mastery >= 60 (previously >= 80) as completed
6. **Access Password Protection** - Optional password protection via `VITE_ACCESS_PASSWORD` environment variable for single-user access control

### Tech Stack
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **Backend**: Cloudflare Workers + D1 (SQLite at edge)
- **Icons**: lucide-react
- **Speech**: Web Speech Synthesis API

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
- **Modes**: 6 options with icons and gradients
- **Icons**: Languages (EN→CN), RotateCcw (CN→EN), Keyboard (Spelling), BookOpen (Fill-in-blank MCQ), PenTool (Fill-in-blank Spelling), Shuffle (Mixed)

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

### sentenceSelector Utility (utils/sentenceSelector.ts)
- **Purpose**: 句子选择和填空题生成工具
- **Functions**:
  - `findSentencesWithWord(targetWord, passage)` - 从文章或例句中查找包含目标单词的句子
    - 使用单词边界匹配(`\b`)避免部分匹配
    - 优先返回文章句子，如无则回退到单词例句
  - `createFillInBlankQuestion(sentence, targetWord)` - 将句子中的目标单词替换为"___"填空
    - 大小写不敏感替换
    - 返回题目文本和正确答案
  - `getDefinitionHint(word)` - 获取单词的中文释义（用于填空题提示）
    - 支持新旧两种数据格式
- **Used by**: QuizMode for generating fill-in-blank questions

### QuizMode
- **Props**: `words`, `quizMode`, `onComplete`
- **Purpose**: Test knowledge with various question types
- **Features**: Confirmation flow, color-coded badges, score tracking
- **Fill-in-blank questions**: Loads passage data, extracts sentences containing target words, generates contextual questions
- **Pronunciation**: Auto-plays for EN_TO_CN/SPELLING questions + manual Volume2 button
- **Auto-focus**: Spelling questions (SPELLING, FILL_IN_BLANK_SPELLING) automatically focus input field on question load
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
1. Install openai package if regenerating cache: `npm install openai`
2. Set API key: `OPENAI_API_KEY=your_key` (in `.env.local` or environment)
3. Run `npm run prebuild:real` to regenerate static cache files in `public/data/cache/`
4. Run `npm run build` to create production bundle
5. Deploy - the app will use static cache files, no runtime AI calls needed

**Note**: Static cache files are already tracked in the repo, so steps 1-3 are only needed if you want to regenerate the enriched data.

### Add a New Unit
1. Update `year7_vocabulary_with_cn.json` with new words
2. Update `constants.ts` to add the unit to the UNITS array
3. Install openai: `npm install openai`
4. Run `npm run prebuild:real` to generate cache for the new unit
5. Run `npm run dev` to test

### Change AI Provider
1. Install openai: `npm install openai`
2. Update `.env.local` with new API_KEY and BASE_URL
3. Optionally update MODEL name
4. Run `npm run prebuild:real` to regenerate cache with new provider

### Debug Word Data
1. Open DevTools Console
2. Look for `[Cache Hit]`, `[Static Cache]`, `[Data Missing]` logs
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
wrangler d1 create strictteach-db

# 4. Update wrangler.toml with the returned database_id
# Example: database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# 5. Initialize remote database schema (IMPORTANT: use --remote for production)
npm run d1:schema  # Runs with --remote flag

# 6. Deploy Workers
npm run deploy

# 7. Update .env.local with your Workers URL
# VITE_API_URL=https://strictteach-api-xxx.workers.dev
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
