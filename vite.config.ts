import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',  // 允许内网访问
      },
      plugins: [react()],
      define: {
        // OpenAI / 智谱 GLM 配置
        'process.env.OPENAI_API_KEY': JSON.stringify(env.OPENAI_API_KEY || env.VITE_OPENAI_API_KEY),
        'process.env.VITE_OPENAI_API_KEY': JSON.stringify(env.OPENAI_API_KEY || env.VITE_OPENAI_API_KEY),
        'process.env.OPENAI_BASE_URL': JSON.stringify(env.OPENAI_BASE_URL || env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1'),
        'process.env.VITE_OPENAI_BASE_URL': JSON.stringify(env.OPENAI_BASE_URL || env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1'),
        'process.env.OPENAI_MODEL': JSON.stringify(env.OPENAI_MODEL || env.VITE_OPENAI_MODEL || 'gpt-4o-mini'),
        'process.env.VITE_OPENAI_MODEL': JSON.stringify(env.OPENAI_MODEL || env.VITE_OPENAI_MODEL || 'gpt-4o-mini'),
        // 兼容旧的 GEMINI 配置（可选）
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
