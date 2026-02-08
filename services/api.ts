/**
 * Cloudflare Workers API Client
 * 用于答题记录、熟练度查询等
 */

// API 配置 - 开发环境使用本地代理，生产环境直接访问 Workers
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://vocabmaster-api.YOUR-SUBDOMAIN.workers.dev';

/**
 * 答题记录接口
 */
export interface QuizAttempt {
  wordId: string;
  wordTerm: string;
  unitId: string;
  questionType: string;  // 'EN_TO_CN' | 'CN_TO_EN' | 'SPELLING'
  isCorrect: boolean;
  timeSpent: number;     // 毫秒
  userAnswer?: string;
}

export interface RecordAttemptsResponse {
  success: boolean;
  recorded: number;
}

/**
 * 熟练度记录接口
 */
export interface WordMastery {
  word_id: string;
  word_term: string;
  unit_id: string;
  mastery_level: number;    // 0-100
  attempt_count: number;
  correct_count: number;
  total_time_spent: number;
  last_attempt_at: string;
  last_correct_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 学习统计接口
 */
export interface LearningStats {
  total: {
    total_attempts: number;
    total_correct: number;
    total_time_spent: number;
    unique_words: number;
  };
  byQuestionType: Array<{
    question_type: string;
    count: number;
    correct: number;
    avg_time: number;
  }>;
  recentTrend: Array<{
    date: string;
    attempts: number;
    correct: number;
  }>;
  masteryDistribution: Array<{
    level: string;
    count: number;
  }>;
}

/**
 * API 错误
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * 通用 fetch 包装器
 */
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: response.statusText };
    }
    throw new ApiError(response.status, errorData.error || 'API request failed', errorData.details);
  }

  return response.json();
}

/**
 * 记录答题结果
 */
export async recordAttempts(attempts: QuizAttempt[]): Promise<RecordAttemptsResponse> {
  return fetchAPI<RecordAttemptsResponse>('/api/attempts', {
    method: 'POST',
    body: JSON.stringify({ userId: 'default', attempts }),
  });
}

/**
 * 获取单个单词熟练度
 */
export async getWordMastery(wordId: string): Promise<WordMastery | null> {
  try {
    return await fetchAPI<WordMastery>(`/api/mastery/${wordId}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * 批量获取单词熟练度
 */
export async getBatchMastery(wordIds: string[]): Promise<WordMastery[]> {
  const params = new URLSearchParams({ wordIds: wordIds.join(',') });
  return fetchAPI<WordMastery[]>(`/api/mastery?${params}`);
}

/**
 * 批量获取单词熟练度（POST 方式，支持更多 wordIds）
 */
export async getBatchMasteryPost(wordIds: string[]): Promise<WordMastery[]> {
  return fetchAPI<WordMastery[]>('/api/mastery/batch', {
    method: 'POST',
    body: JSON.stringify({ wordIds }),
  });
}

/**
 * 获取需要练习的单词
 */
export interface NeedPracticeOptions {
  unitId?: string;
  limit?: number;
  maxMasteryLevel?: number;
}

export async getWordsNeedPractice(options: NeedPracticeOptions = {}): Promise<WordMastery[]> {
  const params = new URLSearchParams({
    limit: String(options.limit || 10),
    maxMasteryLevel: String(options.maxMasteryLevel || 80),
  });

  if (options.unitId) {
    params.set('unitId', options.unitId);
  }

  return fetchAPI<WordMastery[]>(`/api/words/need-practice?${params}`);
}

/**
 * 获取学习统计
 */
export async getLearningStats(userId: string = 'default'): Promise<LearningStats> {
  return fetchAPI<LearningStats>(`/api/stats?userId=${userId}`);
}

/**
 * 获取单词答题历史
 */
export async getWordAttempts(wordId: string, limit: number = 50): Promise<any[]> {
  return fetchAPI<any[]>(`/api/attempts/word/${wordId}?limit=${limit}`);
}

/**
 * 健康检查
 */
export async healthCheck(): Promise<{ status: string }> {
  return fetchAPI<{ status: string }>('/api/health');
}
