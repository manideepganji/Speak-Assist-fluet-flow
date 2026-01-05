import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MicButton from "@/components/MicButton";
import TranscriptPanel from "@/components/TranscriptPanel";
import SpeakingFeedback from "@/components/SpeakingFeedback";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import useSpeechAnalysis from "@/hooks/useSpeechAnalysis";
import { supabase } from "@/integrations/supabase/client";
import { SpeakAssistResponse, DEFAULT_RESPONSE } from "@/types/speakassist";
import { Lightbulb, TrendingUp, MessageCircle } from "lucide-react";

interface AssistantModeProps {
  settings?: {
    responseStyle: string;
    language: string;
  };
}

const AssistantMode = ({ settings }: AssistantModeProps) => {
  const [isListening, setIsListening] = useState(false);
  const [aiResponse, setAiResponse] = useState<SpeakAssistResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    transcript,
    interimTranscript,
    isListening: isSpeechListening,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({
    continuous: true,
    interimResults: true,
    lang: settings?.language || "en-US",
  });

  const { analysis, analyzeText, resetAnalysis } = useSpeechAnalysis();

  // Sync listening state
  useEffect(() => {
    setIsListening(isSpeechListening);
  }, [isSpeechListening]);

  // Analyze transcript in real-time
  useEffect(() => {
    if (transcript) {
      analyzeText(transcript);
    }
  }, [transcript, analyzeText]);

  // Generate AI suggestions when transcript has meaningful content
  useEffect(() => {
    const words = transcript.trim().split(/\s+/).filter(w => w).length;
    
    if (words >= 5 && isListening && !isProcessing) {
      const timeoutId = setTimeout(() => {
        generateAISuggestions();
      }, 2000); // Debounce for 2 seconds

      return () => clearTimeout(timeoutId);
    }
  }, [transcript, isListening]);

  const generateAISuggestions = async () => {
    if (!transcript.trim()) return;

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-response", {
        body: {
          transcript: transcript.trim(),
          recentHistory: [],
          responseStyle: settings?.responseStyle || "neutral",
          language: settings?.language || "en",
        },
      });

      if (error) throw error;

      if (data?.suggestions && Array.isArray(data.suggestions)) {
        setAiResponse(data);
      }
    } catch (error) {
      console.error("Failed to generate suggestions:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMicClick = useCallback(async () => {
    if (isListening) {
      stopListening();
      setAiResponse(null);
    } else {
      resetTranscript();
      resetAnalysis();
      setAiResponse(null);
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        startListening();
      } catch (error) {
        console.error("Microphone permission denied:", error);
      }
    }
  }, [isListening, startListening, stopListening, resetTranscript, resetAnalysis]);

  const getOpportunityColor = (opportunity: string) => {
    switch (opportunity) {
      case "good": return "text-green-400 bg-green-500/20";
      case "neutral": return "text-yellow-400 bg-yellow-500/20";
      default: return "text-muted-foreground bg-secondary";
    }
  };

  if (!isSupported) {
    return (
      <div className="text-center p-8">
        <p className="text-destructive">Speech recognition is not supported in your browser.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Description */}
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground">Real-Time Speaking Assistant</h3>
        <p className="text-sm text-muted-foreground">
          Get instant feedback on your speaking with AI-powered suggestions
        </p>
      </div>

      {/* Mic Button */}
      <div className="flex justify-center py-8">
        <MicButton
          isListening={isListening}
          isProcessing={isProcessing}
          onClick={handleMicClick}
        />
      </div>

      {/* Transcript Panel */}
      <TranscriptPanel
        transcript={transcript}
        interimTranscript={interimTranscript}
        grammarMistakes={analysis.grammarMistakes}
        showHighlights={true}
        onClear={() => {
          resetTranscript();
          resetAnalysis();
          setAiResponse(null);
        }}
      />

      {/* Real-time Feedback */}
      {transcript && (
        <SpeakingFeedback analysis={analysis} showDetails={!isListening} />
      )}

      {/* AI Suggestions */}
      <AnimatePresence>
        {aiResponse && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Analysis Header */}
            <div className="p-4 rounded-xl bg-card border border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">{aiResponse.assistive_cue}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full capitalize ${getOpportunityColor(aiResponse.speaking_opportunity)}`}>
                  {aiResponse.speaking_opportunity === "good" ? "Good time to speak" : 
                   aiResponse.speaking_opportunity === "neutral" ? "Neutral moment" : "Keep listening"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Topic:</span>
                  <p className="text-foreground font-medium">{aiResponse.topic}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Mood:</span>
                  <p className="text-foreground capitalize">{aiResponse.group_mood}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Intent:</span>
                  <p className="text-foreground capitalize">{aiResponse.intent}</p>
                </div>
              </div>
            </div>

            {/* Suggestions */}
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 space-y-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">Suggested Responses</span>
              </div>
              <div className="space-y-2">
                {aiResponse.suggestions.map((suggestion, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-3 rounded-lg bg-card/50 border border-border hover:border-primary/50 transition-colors cursor-pointer"
                  >
                    <p className="text-sm text-foreground">{suggestion}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tips when idle */}
      {!transcript && !isListening && (
        <div className="p-6 rounded-xl bg-card border border-border space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <span className="font-medium text-foreground">Quick Tips</span>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">1.</span>
              Tap the microphone to start speaking
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">2.</span>
              Get real-time grammar and fluency feedback
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">3.</span>
              Receive AI-powered conversation suggestions
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">4.</span>
              Track your filler words and speaking speed
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default AssistantMode;
