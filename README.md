<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# StrictTeach - English Learning App

An interactive English vocabulary learning application with AI-powered definitions, flashcards, quizzes, and cloud-synced progress tracking.

## Features

- **7 Vocabulary Chapters** - Starter through Unit 6 with **287 enriched words**
- **Rich Word Data** - Phonetics, multiple definitions with parts of speech, example sentences
- **Flashcard Learning** - Interactive flip cards with shuffle and pronunciation
- **4 Quiz Modes** - EN→CN, CN→EN, Spelling, and Mixed
- **Real-Time Timer** - Track time spent on each question
- **Cloud Sync** - Progress and mastery synchronized across devices via Cloudflare Workers
- **Offline Ready** - Preloaded vocabulary data with static cache files
- **Smart Mastery System** - Automatic proficiency calculation based on accuracy and timing

## Quick Start

**Prerequisites:** Node.js 18+

1. Clone and install:
   ```bash
   npm install
   ```

2. Run the app:
   ```bash
   npm run dev
   ```

3. Open http://localhost:3000

That's it! The app includes pre-generated static cache files, so it works immediately without any API configuration.

## Cloud Sync Setup (Optional)

For cross-device progress tracking and mastery calculation:

1. Configure API URL in `.env.local`:
   ```bash
   VITE_API_URL=https://strictteach-api.YOUR-SUBDOMAIN.workers.dev
   ```

2. The app will automatically sync quiz attempts and mastery data to the cloud.

## Run Locally

### Development Mode

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm run preview
```

## Tech Stack

### Frontend
- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS** (via CDN)
- **lucide-react** - Icon library
- **Web Speech API** - Pronunciation features

### Backend (Optional)
- **Cloudflare Workers** - Serverless API
- **Cloudflare D1** - SQLite database at edge
- **itty-router** - Fast routing

### AI Services
- **OpenAI SDK** - Compatible with 智谱 GLM, OpenAI, and more
