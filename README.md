<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# VocabMaster - English Learning App

An interactive English vocabulary learning application with AI-powered definitions, flashcards, and quizzes.

## Features

- **7 Vocabulary Chapters** - Starter through Unit 6 with ~200 words
- **Flashcard Learning** - Interactive flip cards with pronunciation
- **Mixed Quiz Mode** - English-to-Chinese and Chinese-to-English questions
- **Progress Tracking** - Track mastered and learning words
- **Offline Ready** - Preloaded vocabulary data, no API required for learning

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure API key (optional, for AI-generated examples):
   Create a `.env.local` file with:
   ```bash
   # 智谱 GLM（推荐）
   OPENAI_API_KEY=your_api_key
   OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4
   OPENAI_MODEL=glm-4-flash

   # Or use OpenAI
   OPENAI_API_KEY=your_openai_key
   OPENAI_BASE_URL=https://api.openai.com/v1
   OPENAI_MODEL=gpt-4o-mini
   ```

3. Run the app:
   ```bash
   npm run dev
   ```

4. Open http://localhost:3000

## Build for Production

```bash
npm run build
npm run preview
```

## Tech Stack

- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS** (via CDN)
- **OpenAI SDK** (for 智谱 GLM / OpenAI compatibility)
- **Web Speech API** (pronunciation)
- **LocalStorage** (progress persistence)
