import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STYLE_INSTRUCTIONS: Record<string, string> = {
  neutral: "Use a balanced, professional tone.",
  formal: "Use corporate, polished language. Avoid slang and casual expressions.",
  casual: "Use friendly, conversational style. Be approachable but still helpful.",
  supportive: "Use empathetic, encouraging tone. Be warm and reassuring.",
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  pt: "Portuguese",
  hi: "Hindi",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  ar: "Arabic",
};

const buildSystemPrompt = (responseStyle: string, language: string): string => {
  const styleInstruction = STYLE_INSTRUCTIONS[responseStyle] || STYLE_INSTRUCTIONS.neutral;
  const languageName = LANGUAGE_NAMES[language] || "English";
  
  return `You are SpeakAssist, a private, real-time conversational assistant designed to support an introverted user during live group conversations.

Your role is NOT to speak on behalf of the user.
Your role is to analyze the conversation and provide discreet, actionable conversational cues that help the user participate confidently and naturally.

You operate ONLY when the user has explicitly enabled listening.
You must respect privacy:
- Do not store conversations permanently
- Do not reveal analysis to anyone except the user
- Output is private and advisory only

RESPONSE STYLE: ${styleInstruction}
OUTPUT LANGUAGE: Generate all responses in ${languageName}.

INPUT:
You will receive short segments of transcribed group conversation text involving multiple speakers.

TASKS:
For each conversation segment, perform the following analysis:

1. Conversation Understanding
   - Identify the main topic being discussed
   - Identify the dominant conversational intent (e.g., question, concern, suggestion, agreement, explanation)
   - Detect the emotional tone of the group (e.g., supportive, neutral, tense, confused, enthusiastic)

2. Participation Timing
   - Decide whether this is a good moment for the user to speak, a neutral moment, or a better moment to listen
   - Base this on turn-taking, openness of the discussion, and conversational flow

3. Pronunciation Analysis
   - Analyze the user's speech for common pronunciation issues in English
   - Focus on words that are commonly mispronounced by non-native speakers
   - Identify specific words or sounds that may benefit from correction
   - Provide gentle, encouraging pronunciation corrections
   - Use simple phonetic guides (e.g., "pro-NUN-see-AY-shun")
   - Include brief, positive tips for improvement
   - Only provide corrections when there are actual pronunciation issues
   - If pronunciation is clear, provide positive reinforcement
   - Limit to 2-3 corrections maximum to avoid overwhelming the user

4. Conversational Cue Generation
   - Generate 2–3 short, natural response suggestions the user could say aloud
   - Suggestions must be:
     • Polite
     • Context-aware
     • Non-intrusive
     • Easy to glance and remember
   - Do NOT use long sentences
   - Do NOT force the user to speak
   - Apply the specified response style above

5. Assistive Feedback
   - Provide a brief cue describing the current conversational state (e.g., "Supportive group", "Open discussion", "Clarification expected")
   - Include pronunciation encouragement when appropriate

IMPORTANT RULES:
- Never impersonate the user
- Never generate offensive or dominating responses
- Never override user choice
- Focus on confidence-building and inclusion
- If context is unclear, provide safe, neutral suggestions or advise listening
- All text content MUST be in ${languageName}

Your goal is to enable confident, inclusive human–AI collaboration during real-time conversations without disrupting natural interaction.`;
};

// Tool definition for structured output
const speakAssistTool = {
  type: "function",
  function: {
    name: "provide_conversation_analysis",
    description: "Provide conversation analysis and suggestions for the user",
    parameters: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "The main topic being discussed"
        },
        intent: {
          type: "string",
          description: "The dominant conversational intent (e.g., question, concern, suggestion, agreement, explanation)"
        },
        group_mood: {
          type: "string",
          description: "The emotional tone of the group (e.g., supportive, neutral, tense, confused, enthusiastic)"
        },
        speaking_opportunity: {
          type: "string",
          enum: ["good", "neutral", "listen"],
          description: "Whether this is a good moment to speak, neutral, or better to listen"
        },
        assistive_cue: {
          type: "string",
          description: "A brief cue describing the current conversational state"
        },
        pronunciation_feedback: {
          type: "object",
          description: "Pronunciation analysis and gentle corrections",
          properties: {
            has_issues: {
              type: "boolean",
              description: "Whether there are pronunciation issues to address"
            },
            corrections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  word: {
                    type: "string",
                    description: "The word that may need pronunciation correction"
                  },
                  phonetic_guide: {
                    type: "string",
                    description: "Simple phonetic guide (e.g., 'pro-nun-see-AY-shun')"
                  },
                  tip: {
                    type: "string",
                    description: "Brief, encouraging tip for pronunciation"
                  }
                }
              },
              description: "List of pronunciation corrections (max 2-3)"
            },
            encouragement: {
              type: "string",
              description: "Positive reinforcement for pronunciation efforts"
            }
          }
        },
        suggestions: {
          type: "array",
          items: { type: "string" },
          description: "2-3 short, natural response suggestions the user could say"
        }
      },
      required: ["topic", "intent", "group_mood", "speaking_opportunity", "assistive_cue", "pronunciation_feedback", "suggestions"],
      additionalProperties: false
    }
  }
};

const DEFAULT_RESPONSE = {
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
  suggestions: ["Wait and listen for a moment."]
};

// Helper to clean markdown code blocks from AI response
function cleanJsonResponse(content: string): string {
  let cleaned = content.trim();
  
  // Remove markdown code block wrapper if present
  const codeBlockMatch = cleaned.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }
  
  return cleaned;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, recentHistory, responseStyle = "neutral", language = "en", apiKey } = await req.json();
    
    if (!transcript || typeof transcript !== "string" || transcript.trim().length < 3) {
      return new Response(
        JSON.stringify(DEFAULT_RESPONSE),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = apiKey || Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not configured");
      throw new Error("AI service not configured");
    }

    // Build dynamic system prompt based on settings
    const systemPrompt = buildSystemPrompt(responseStyle, language);

    // Build context message with history if available
    const historyContext = recentHistory && recentHistory.length > 0
      ? `recent_history:\n${recentHistory.map((h: string, i: number) => `${i + 1}. "${h}"`).join("\n")}\n\n`
      : "";
    
    const userMessage = `Analyze this conversation and provide suggestions:\n\n${historyContext}current_transcript: "${transcript}"`;

    console.log("Processing transcript:", transcript, "| Style:", responseStyle, "| Language:", language);

    // Use tool calling for guaranteed structured output
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: systemPrompt + "\n\n" + userMessage
              }
            ]
          }
        ],
        tools: [
          {
            function_declarations: [
              {
                name: "provide_conversation_analysis",
                description: speakAssistTool.function.description,
                parameters: speakAssistTool.function.parameters
              }
            ]
          }
        ],
        tool_config: {
          function_calling_config: {
            mode: "ANY",
            allowed_function_names: ["provide_conversation_analysis"]
          }
        },
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.7
        }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limited");
        return new Response(
          JSON.stringify({ error: "Rate limited. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        console.error("Payment required");
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    console.log("AI response data:", JSON.stringify(data, null, 2));

    // Try to extract from tool call first (preferred method)
    const functionCall = data.candidates?.[0]?.content?.parts?.[0]?.functionCall;
    if (functionCall?.args) {
      try {
        const parsed = functionCall.args;
        console.log("Parsed tool call response:", parsed);
        
        // Validate required fields
        if (parsed.topic && parsed.suggestions && Array.isArray(parsed.suggestions)) {
          return new Response(
            JSON.stringify(parsed),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (parseError) {
        console.error("Failed to parse tool call arguments:", parseError);
      }
    }

    // Fallback: try to parse from message content (for models that don't support tools well)
    const aiContent = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    if (aiContent) {
      console.log("Raw AI content fallback:", aiContent);
      try {
        const cleanedContent = cleanJsonResponse(aiContent);
        const parsed = JSON.parse(cleanedContent);
        console.log("Parsed content response:", parsed);
        
        if (parsed.topic && parsed.suggestions && Array.isArray(parsed.suggestions)) {
          return new Response(
            JSON.stringify(parsed),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (parseError) {
        console.error("Failed to parse content:", parseError);
      }
    }

    // Return default response if all parsing fails
    console.log("All parsing methods failed, returning default response");
    return new Response(
      JSON.stringify(DEFAULT_RESPONSE),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-response:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
