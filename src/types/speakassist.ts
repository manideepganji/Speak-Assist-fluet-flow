export interface PronunciationCorrection {
  word: string;
  phonetic_guide: string;
  tip: string;
}

export interface PronunciationFeedback {
  has_issues: boolean;
  corrections: PronunciationCorrection[];
  encouragement: string;
}

export interface SpeakAssistResponse {
  topic: string;
  intent: string;
  group_mood: string;
  speaking_opportunity: "good" | "neutral" | "listen";
  assistive_cue: string;
  pronunciation_feedback: PronunciationFeedback;
  suggestions: string[];
}

export const DEFAULT_RESPONSE: SpeakAssistResponse = {
  topic: "unknown",
  intent: "unclear",
  group_mood: "neutral",
  speaking_opportunity: "listen",
  assistive_cue: "Listening mode",
  pronunciation_feedback: {
    has_issues: false,
    corrections: [],
    encouragement: "Your pronunciation is clear and confident."
  },
  suggestions: ["Wait and listen for a moment."],
};
