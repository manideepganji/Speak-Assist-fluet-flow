import { useState, useCallback, useRef, useEffect } from "react";
import {
  SpeechAnalysis,
  FillerWordInstance,
  GrammarMistake,
  FILLER_WORDS,
  DEFAULT_SPEECH_ANALYSIS,
} from "@/types/fluent-flow";

interface UseSpeechAnalysisReturn {
  analysis: SpeechAnalysis;
  analyzeText: (text: string) => void;
  resetAnalysis: () => void;
  isAnalyzing: boolean;
}

// Count words in text
const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

// Detect filler words
const detectFillerWords = (text: string): FillerWordInstance[] => {
  const lowerText = text.toLowerCase();
  const instances: FillerWordInstance[] = [];

  FILLER_WORDS.forEach(filler => {
    const regex = new RegExp(`\\b${filler}\\b`, "gi");
    const matches = lowerText.match(regex);
    if (matches && matches.length > 0) {
      instances.push({
        word: filler,
        count: matches.length,
      });
    }
  });

  return instances;
};

// Simple grammar check patterns
const GRAMMAR_PATTERNS: { pattern: RegExp; correction: string; explanation: string }[] = [
  {
    pattern: /\bi am went\b/gi,
    correction: "I went",
    explanation: "Use simple past tense",
  },
  {
    pattern: /\bhe don't\b/gi,
    correction: "he doesn't",
    explanation: "Use 'doesn't' with third person singular",
  },
  {
    pattern: /\bshe don't\b/gi,
    correction: "she doesn't",
    explanation: "Use 'doesn't' with third person singular",
  },
  {
    pattern: /\bit don't\b/gi,
    correction: "it doesn't",
    explanation: "Use 'doesn't' with third person singular",
  },
  {
    pattern: /\bmore better\b/gi,
    correction: "better",
    explanation: "'Better' is already comparative",
  },
  {
    pattern: /\bmost best\b/gi,
    correction: "best",
    explanation: "'Best' is already superlative",
  },
  {
    pattern: /\bshould of\b/gi,
    correction: "should have",
    explanation: "Use 'have' not 'of' after modal verbs",
  },
  {
    pattern: /\bcould of\b/gi,
    correction: "could have",
    explanation: "Use 'have' not 'of' after modal verbs",
  },
  {
    pattern: /\bwould of\b/gi,
    correction: "would have",
    explanation: "Use 'have' not 'of' after modal verbs",
  },
  {
    pattern: /\btheir is\b/gi,
    correction: "there is",
    explanation: "'There' indicates location/existence",
  },
  {
    pattern: /\btheir are\b/gi,
    correction: "there are",
    explanation: "'There' indicates location/existence",
  },
  {
    pattern: /\byour welcome\b/gi,
    correction: "you're welcome",
    explanation: "Use 'you're' (you are)",
  },
  {
    pattern: /\bwent to went\b/gi,
    correction: "went to",
    explanation: "Avoid repetition",
  },
  {
    pattern: /\bvery very\b/gi,
    correction: "very",
    explanation: "Avoid repetition",
  },
  {
    pattern: /\bi has\b/gi,
    correction: "I have",
    explanation: "Use 'have' with first person",
  },
  {
    pattern: /\bwe was\b/gi,
    correction: "we were",
    explanation: "Use 'were' with plural subjects",
  },
  {
    pattern: /\bthey was\b/gi,
    correction: "they were",
    explanation: "Use 'were' with plural subjects",
  },
];

// Detect grammar mistakes
const detectGrammarMistakes = (text: string): GrammarMistake[] => {
  const mistakes: GrammarMistake[] = [];

  GRAMMAR_PATTERNS.forEach(({ pattern, correction, explanation }) => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        mistakes.push({
          original: match,
          correction,
          explanation,
        });
      });
    }
  });

  return mistakes;
};

// Calculate speaking speed
const calculateSpeed = (wordCount: number, durationSeconds: number): number => {
  if (durationSeconds <= 0) return 0;
  return Math.round((wordCount / durationSeconds) * 60);
};

// Estimate scores
const calculateScores = (
  text: string,
  fillerWords: FillerWordInstance[],
  grammarMistakes: GrammarMistake[],
  wordCount: number
): { grammar: number; fluency: number; confidence: number } => {
  const totalFillers = fillerWords.reduce((sum, f) => sum + f.count, 0);
  
  // Grammar score: deduct points per mistake
  const grammarDeduction = Math.min(grammarMistakes.length * 10, 50);
  const grammarScore = Math.max(100 - grammarDeduction, 50);
  
  // Fluency score: based on filler word ratio
  const fillerRatio = wordCount > 0 ? totalFillers / wordCount : 0;
  const fluencyScore = Math.max(100 - (fillerRatio * 200), 50);
  
  // Confidence score: combination of factors
  const sentenceCount = (text.match(/[.!?]+/g) || []).length || 1;
  const avgWordsPerSentence = wordCount / sentenceCount;
  const hasGoodLength = avgWordsPerSentence >= 8 && avgWordsPerSentence <= 25;
  const confidenceBase = hasGoodLength ? 80 : 65;
  const confidenceScore = Math.min(confidenceBase + (wordCount > 50 ? 15 : 0), 95);
  
  return {
    grammar: Math.round(grammarScore),
    fluency: Math.round(fluencyScore),
    confidence: Math.round(confidenceScore),
  };
};

export const useSpeechAnalysis = (): UseSpeechAnalysisReturn => {
  const [analysis, setAnalysis] = useState<SpeechAnalysis>(DEFAULT_SPEECH_ANALYSIS);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const startTimeRef = useRef<number>(Date.now());

  const analyzeText = useCallback((text: string) => {
    if (!text.trim()) {
      setAnalysis(DEFAULT_SPEECH_ANALYSIS);
      return;
    }

    setIsAnalyzing(true);

    // Calculate duration since start
    const duration = (Date.now() - startTimeRef.current) / 1000;
    
    // Analyze text
    const wordCount = countWords(text);
    const fillerWords = detectFillerWords(text);
    const grammarMistakes = detectGrammarMistakes(text);
    const speed = calculateSpeed(wordCount, duration);
    const scores = calculateScores(text, fillerWords, grammarMistakes, wordCount);
    
    // Generate suggestions
    const suggestions: string[] = [];
    
    if (fillerWords.length > 0) {
      const topFillers = fillerWords.slice(0, 2).map(f => `"${f.word}"`).join(", ");
      suggestions.push(`Reduce filler words like ${topFillers}`);
    }
    
    if (grammarMistakes.length > 0) {
      suggestions.push(`Fix grammar: "${grammarMistakes[0].original}" → "${grammarMistakes[0].correction}"`);
    }
    
    if (speed > 160) {
      suggestions.push("Slow down your speaking pace for clarity");
    } else if (speed < 100 && speed > 0) {
      suggestions.push("Try to speak a bit faster for better flow");
    }
    
    if (wordCount < 30) {
      suggestions.push("Try to elaborate more on your points");
    }

    setAnalysis({
      transcript: text,
      grammarScore: scores.grammar,
      pronunciationScore: 85, // Estimated (needs audio analysis)
      fluencyScore: scores.fluency,
      confidenceScore: scores.confidence,
      speakingSpeed: speed,
      fillerWords,
      grammarMistakes,
      pauseCount: 0,
      totalPauseDuration: 0,
      suggestions,
    });

    setIsAnalyzing(false);
  }, []);

  const resetAnalysis = useCallback(() => {
    setAnalysis(DEFAULT_SPEECH_ANALYSIS);
    startTimeRef.current = Date.now();
  }, []);

  // Reset start time when component mounts
  useEffect(() => {
    startTimeRef.current = Date.now();
  }, []);

  return {
    analysis,
    analyzeText,
    resetAnalysis,
    isAnalyzing,
  };
};

export default useSpeechAnalysis;
