// Fluent Flow - AI-Powered Speaking Assistant Types

export type AppMode = "assistant" | "interview" | "learning" | "qa";

export interface SpeechAnalysis {
  transcript: string;
  grammarScore: number; // 0-100
  pronunciationScore: number; // 0-100
  fluencyScore: number; // 0-100
  confidenceScore: number; // 0-100
  speakingSpeed: number; // words per minute
  fillerWords: FillerWordInstance[];
  grammarMistakes: GrammarMistake[];
  pauseCount: number;
  totalPauseDuration: number; // seconds
  suggestions: string[];
}

export interface FillerWordInstance {
  word: string;
  count: number;
  timestamps?: number[];
}

export interface GrammarMistake {
  original: string;
  correction: string;
  explanation: string;
  position?: number;
}

export interface InterviewQuestion {
  id: string;
  question: string;
  category: "hr" | "technical" | "behavioral" | "situational";
  difficulty: "easy" | "medium" | "hard";
  expectedKeyPoints?: string[];
  sampleAnswer?: string;
}

export interface InterviewFeedback {
  question: string;
  userAnswer: string;
  grammarScore: number;
  fluencyScore: number;
  confidenceScore: number;
  keyPointsCovered: string[];
  missedPoints: string[];
  improvedAnswer: string;
  tips: string[];
}

export interface LearningTopic {
  id: string;
  title: string;
  description: string;
  duration: number; // recommended speaking time in seconds
  category: "introduction" | "opinion" | "experience" | "technical" | "situational";
  prompts: string[];
}

export interface QAResponse {
  question: string;
  definition: string;
  importance: string;
  examples: string[];
  interviewAnswer: string;
  relatedTopics: string[];
}

export interface SessionHistory {
  id: string;
  mode: AppMode;
  timestamp: Date;
  transcript: string;
  analysis?: SpeechAnalysis;
  interviewFeedback?: InterviewFeedback;
  learningTopic?: LearningTopic;
  qaResponse?: QAResponse;
}

export interface UserSettings {
  responseStyle: "formal" | "casual" | "supportive" | "neutral";
  language: string;
  voiceFeedback: boolean;
  autoStartListening: boolean;
  showRealTimeGrammar: boolean;
}

// Default values
export const DEFAULT_SPEECH_ANALYSIS: SpeechAnalysis = {
  transcript: "",
  grammarScore: 0,
  pronunciationScore: 0,
  fluencyScore: 0,
  confidenceScore: 0,
  speakingSpeed: 0,
  fillerWords: [],
  grammarMistakes: [],
  pauseCount: 0,
  totalPauseDuration: 0,
  suggestions: [],
};

export const DEFAULT_USER_SETTINGS: UserSettings = {
  responseStyle: "neutral",
  language: "en-US",
  voiceFeedback: false,
  autoStartListening: false,
  showRealTimeGrammar: true,
};

// Common filler words to detect
export const FILLER_WORDS = [
  "uh", "um", "like", "you know", "basically", "actually", "literally",
  "so", "well", "right", "okay", "I mean", "kind of", "sort of",
  "you see", "honestly", "obviously", "essentially"
];

// Interview question categories
export const INTERVIEW_CATEGORIES = {
  hr: "HR & General",
  technical: "Technical",
  behavioral: "Behavioral",
  situational: "Situational"
} as const;

// Learning topic categories
export const LEARNING_CATEGORIES = {
  introduction: "Self Introduction",
  opinion: "Opinion & Discussion",
  experience: "Personal Experience",
  technical: "Technical Topics",
  situational: "Situational Speaking"
} as const;
