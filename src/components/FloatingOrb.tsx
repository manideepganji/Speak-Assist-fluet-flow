import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2, AlertCircle } from "lucide-react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { supabase } from "@/integrations/supabase/client";
import { OrbSettingsData } from "@/components/OrbSettings";
import { SpeakAssistResponse, DEFAULT_RESPONSE } from "@/types/speakassist";

type OrbState = "idle" | "listening" | "processing" | "suggesting";

interface FloatingOrbProps {
  onTranscriptChange?: (transcript: string) => void;
  onSuggestion?: (response: SpeakAssistResponse, spokenText?: string) => void;
  settings?: OrbSettingsData;
}

// Call AI edge function to generate response with conversation history and settings
const generateAIResponse = async (
  transcript: string, 
  recentHistory: string[],
  settings?: OrbSettingsData
): Promise<SpeakAssistResponse> => {
  try {
    const { data, error } = await supabase.functions.invoke("generate-response", {
      body: { 
        transcript, 
        recentHistory,
        responseStyle: settings?.responseStyle || "neutral",
        language: settings?.language || "en",
      },
    });

    if (error) {
      console.error("Edge function error:", error);
      throw error;
    }

    if (data?.error) {
      console.error("AI error:", data.error);
      throw new Error(data.error);
    }

    // Validate the response structure
    if (data?.suggestions && Array.isArray(data.suggestions)) {
      return data as SpeakAssistResponse;
    }

    return DEFAULT_RESPONSE;
  } catch (error) {
    console.error("Failed to generate AI response:", error);
    return DEFAULT_RESPONSE;
  }
};

const FloatingOrb = ({ 
  onTranscriptChange, 
  onSuggestion,
  settings,
}: FloatingOrbProps) => {
  const [state, setState] = useState<OrbState>("idle");
  const [currentResponse, setCurrentResponse] = useState<SpeakAssistResponse | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const lastProcessedTranscript = useRef("");
  const conversationHistory = useRef<string[]>([]);

  const {
    transcript,
    interimTranscript,
    isListening,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({
    continuous: true,
    interimResults: true,
    lang: "en-US",
  });

  const isActive = state !== "idle";
  const showSuggestion = state === "suggesting" && currentResponse;
  const currentTranscript = transcript + (interimTranscript ? " " + interimTranscript : "");

  // Notify parent of transcript changes
  useEffect(() => {
    onTranscriptChange?.(currentTranscript);
  }, [currentTranscript, onTranscriptChange]);

  // Process transcript and generate suggestions - ONLY use latest input
  useEffect(() => {
    const trimmedTranscript = transcript.trim();
    
    // Extract only the NEW portion of transcript (ignore history)
    const previousText = lastProcessedTranscript.current;
    const newContent = previousText 
      ? trimmedTranscript.slice(previousText.length).trim()
      : trimmedTranscript;
    
    // Process with lower threshold - infer from partial input
    if (
      state === "listening" && 
      newContent.length > 5 && 
      trimmedTranscript !== lastProcessedTranscript.current
    ) {
      lastProcessedTranscript.current = trimmedTranscript;
      
      // Clear previous suggestion immediately when new input arrives
      setCurrentResponse(null);
      setState("processing");

      const process = async () => {
        try {
          // Use the latest segment for current topic
          const latestInput = newContent || trimmedTranscript;
          
          // Keep last 2-3 history items for context
          const recentHistory = conversationHistory.current.slice(-3);
          
          // Use AI-powered response generation with history and settings
          const response = await generateAIResponse(latestInput, recentHistory, settings);
          
          // Add current input to history after processing
          conversationHistory.current.push(latestInput);
          // Keep only last 5 items
          if (conversationHistory.current.length > 5) {
            conversationHistory.current = conversationHistory.current.slice(-5);
          }

          setCurrentResponse(response);
          onSuggestion?.(response, latestInput);
          setState("suggesting");

          // Return to listening after showing suggestion
          setTimeout(() => {
            if (isListening) {
              setState("listening");
            }
          }, 6000); // Extended for more content
        } catch (error) {
          console.error("Error generating suggestion:", error);
          setState("listening");
        }
      };

      process();
    }
  }, [transcript, state, isListening, onSuggestion, settings]);

  // Sync state with listening status
  useEffect(() => {
    if (isListening && state === "idle") {
      setState("listening");
    } else if (!isListening && state !== "idle" && state !== "processing" && state !== "suggesting") {
      setState("idle");
    }
  }, [isListening, state]);

  const handleClick = useCallback(async () => {
    if (state === "idle") {
      try {
        // Request microphone permission
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setPermissionDenied(false);
        resetTranscript();
        startListening();
        setState("listening");
      } catch (error) {
        console.error("Microphone permission denied:", error);
        setPermissionDenied(true);
      }
    } else {
      stopListening();
      setState("idle");
      setCurrentResponse(null);
      lastProcessedTranscript.current = "";
      conversationHistory.current = [];
    }
  }, [state, startListening, stopListening, resetTranscript]);

  // Helper to get speaking opportunity color
  const getOpportunityColor = (opportunity: string) => {
    switch (opportunity) {
      case "good": return "bg-green-500";
      case "neutral": return "bg-yellow-500";
      case "listen": return "bg-orb-text-muted";
      default: return "bg-orb-text-muted";
    }
  };

  if (!isSupported) {
    return (
      <div
        ref={constraintsRef}
        className="fixed inset-0 pointer-events-none z-50"
      >
        <motion.div
          initial={{ x: 20, y: typeof window !== 'undefined' ? window.innerHeight - 120 : 500 }}
          className="absolute pointer-events-auto"
        >
          <div className="glass rounded-2xl px-4 py-3 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <p className="text-sm text-foreground">
              Speech recognition not supported in this browser.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      ref={constraintsRef}
      className="fixed inset-0 pointer-events-none z-50"
    >
      <motion.div
        drag
        dragConstraints={constraintsRef}
        dragElastic={0.1}
        dragMomentum={false}
        initial={{ x: 20, y: typeof window !== 'undefined' ? window.innerHeight - 120 : 500 }}
        className="absolute pointer-events-auto cursor-grab active:cursor-grabbing"
        whileDrag={{ scale: 1.1 }}
      >
        <div className="relative">
          {/* Pulse rings when listening */}
          <AnimatePresence>
            {state === "listening" && (
              <>
                <motion.div
                  initial={{ scale: 1, opacity: 0.6 }}
                  animate={{ scale: 2, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeOut",
                  }}
                  className="absolute inset-0 rounded-full bg-orb-glow/30"
                />
                <motion.div
                  initial={{ scale: 1, opacity: 0.4 }}
                  animate={{ scale: 1.8, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeOut",
                    delay: 0.5,
                  }}
                  className="absolute inset-0 rounded-full bg-orb-glow/20"
                />
              </>
            )}
          </AnimatePresence>

          {/* Processing spinner */}
          <AnimatePresence>
            {state === "processing" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, rotate: 360 }}
                exit={{ opacity: 0 }}
                transition={{
                  rotate: { duration: 1, repeat: Infinity, ease: "linear" },
                }}
                className="absolute inset-[-4px] rounded-full border-2 border-transparent border-t-orb-glow"
              />
            )}
          </AnimatePresence>

          {/* Main orb button */}
          <motion.button
            onClick={handleClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              relative w-16 h-16 rounded-full glass flex items-center justify-center
              transition-all duration-300
              ${isActive ? "orb-glow-intense" : "orb-glow"}
              ${permissionDenied ? "border-destructive/50" : ""}
            `}
          >
            <motion.div
              animate={{
                scale: state === "listening" ? [1, 1.1, 1] : 1,
              }}
              transition={{
                duration: 1.5,
                repeat: state === "listening" ? Infinity : 0,
                ease: "easeInOut",
              }}
            >
              {state === "idle" && !permissionDenied && (
                <Mic className="w-6 h-6 text-orb-text-muted" />
              )}
              {state === "idle" && permissionDenied && (
                <MicOff className="w-6 h-6 text-destructive" />
              )}
              {state === "listening" && (
                <Mic className="w-6 h-6 text-orb-glow" />
              )}
              {state === "processing" && (
                <div className="w-5 h-5 rounded-full border-2 border-orb-glow border-t-transparent animate-spin" />
              )}
              {state === "suggesting" && (
                <Volume2 className="w-6 h-6 text-orb-glow" />
              )}
            </motion.div>
          </motion.button>

          {/* Permission denied tooltip */}
          <AnimatePresence>
            {permissionDenied && state === "idle" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute left-full top-1/2 -translate-y-1/2 ml-4 max-w-xs"
              >
                <div className="glass rounded-xl px-3 py-2 border border-destructive/30">
                  <p className="text-xs text-destructive">
                    Microphone access denied. Click to retry.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Live transcript indicator */}
          <AnimatePresence>
            {state === "listening" && interimTranscript && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute left-full top-1/2 -translate-y-1/2 ml-4 max-w-xs"
              >
                <div className="glass rounded-xl px-3 py-2">
                  <p className="text-xs text-orb-text-muted italic truncate max-w-[200px]">
                    {interimTranscript}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Enhanced suggestion panel with SpeakAssist data */}
          <AnimatePresence>
            {showSuggestion && currentResponse && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, x: 0 }}
                animate={{ opacity: 1, scale: 1, x: 10 }}
                exit={{ opacity: 0, scale: 0.8, x: 0 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                className="absolute left-full top-1/2 -translate-y-1/2 ml-4 w-72"
              >
                <div className="glass rounded-2xl p-4 orb-glow space-y-3">
                  {/* Assistive cue and timing */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-orb-glow">
                      {currentResponse.assistive_cue}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${getOpportunityColor(currentResponse.speaking_opportunity)}`} />
                      <span className="text-xs text-orb-text-muted capitalize">
                        {currentResponse.speaking_opportunity}
                      </span>
                    </div>
                  </div>

                  {/* Topic and mood */}
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-orb-surface/50 text-orb-text-muted">
                      {currentResponse.topic}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-orb-surface/50 text-orb-text-muted">
                      {currentResponse.group_mood}
                    </span>
                  </div>

                  {/* Suggestions */}
                  <div className="space-y-2">
                    {currentResponse.suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="p-2 rounded-lg bg-orb-surface/30 border border-orb-glow/20 hover:border-orb-glow/40 transition-colors cursor-pointer"
                      >
                        <p className="text-sm text-orb-text leading-relaxed">
                          {suggestion}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-orb-surface rotate-45 glass" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* State indicator dot */}
          <motion.div
            animate={{
              backgroundColor:
                state === "idle"
                  ? permissionDenied
                    ? "hsl(var(--destructive))"
                    : "hsl(var(--orb-text-muted))"
                  : state === "listening"
                  ? "hsl(var(--orb-glow))"
                  : state === "processing"
                  ? "hsl(var(--orb-glow-secondary))"
                  : "hsl(var(--orb-glow))",
            }}
            className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-orb-bg"
          />
        </div>
      </motion.div>
    </div>
  );
};

export default FloatingOrb;
