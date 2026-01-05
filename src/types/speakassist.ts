export interface SpeakAssistResponse {
  topic: string;
  intent: string;
  group_mood: string;
  speaking_opportunity: "good" | "neutral" | "listen";
  assistive_cue: string;
  suggestions: string[];
}

export const DEFAULT_RESPONSE: SpeakAssistResponse = {
  topic: "unknown",
  intent: "unclear",
  group_mood: "neutral",
  speaking_opportunity: "listen",
  assistive_cue: "Listening mode",
  suggestions: ["Wait and listen for a moment."],
};
