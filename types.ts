
export interface WordDefinition {
  partOfSpeech?: string;      // 词性: n., v., adj., adv., etc.
  meaning: string;             // 中文释义
}

export interface ExampleSentence {
  sentence: string;            // 例句
  translation?: string;        // 例句翻译
}

export interface Word {
  id: string;
  term: string;                // 单词
  definitions?: WordDefinition[];  // 多个释义（带词性）
  definition?: string;         // 主释义（向后兼容）
  examples?: ExampleSentence[];  // 多个例句
  example?: string;            // 主例句（向后兼容）
  unit: string;
  phonetic?: string;           // 音标
  level?: string;              // 难度级别
}

export interface Unit {
  id: string;
  name: string;
  words: string[];
}

export interface Book {
  id: string;
  name: string;
  description: string;
  units: Unit[];
}

export interface UserProgress {
  masteredWords: string[]; // List of word IDs
  learningWords: string[]; // List of word IDs being practiced
}

// 应用层级导航
export enum NavigationLevel {
  BOOK_LIST = 'BOOK_LIST',      // 书籍列表
  UNIT_LIST = 'UNIT_LIST',      // 章节列表
  ACTIVITY_SELECT = 'ACTIVITY_SELECT',  // 活动选择 (单词总汇/学习/Quiz)
  QUIZ_MODE_SELECT = 'QUIZ_MODE_SELECT',  // Quiz 模式选择
  LEARNING = 'LEARNING',        // 学习/进行中
}

// 活动类型
export enum ActivityType {
  WORD_LIST = 'WORD_LIST',      // 单词总汇
  LEARN = 'LEARN',              // 卡片式学习
  QUIZ = 'QUIZ',                // 测验
}

// Quiz 模式
export enum QuizMode {
  EN_TO_CN_MCQ = 'EN_TO_CN_MCQ',      // 英对中单选
  CN_TO_EN_MCQ = 'CN_TO_EN_MCQ',      // 中对英单选
  CN_TO_EN_SPELLING = 'CN_TO_EN_SPELLING',  // 中对英拼写
  MIXED = 'MIXED',                    // 混合题型
}

// 题型枚举（用于内部生成题目）
export enum QuestionType {
  EN_TO_CN = 'EN_TO_CN',      // 英译中：选择中文定义
  CN_TO_EN = 'CN_TO_EN',      // 中对英：选择英文单词
  SPELLING = 'SPELLING',      // 拼写题
}

export interface QuizQuestion {
  word: Word;
  type: QuestionType;
  question: string;           // 题目文本
  options?: string[];         // 选项 (单选题)
  correctAnswer: string;      // 正确答案
}
