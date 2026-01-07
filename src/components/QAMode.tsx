import { useState, useCallback, useEffect } from "react";
// Added useEffect import: file previously crashed with "useEffect is not defined"
// because the hook was used but not imported.
import { motion, AnimatePresence } from "framer-motion";
import { Search, Mic, Loader2, BookOpen, Lightbulb, MessageSquare, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MicButton from "@/components/MicButton";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import useSpeechAnalysis from "@/hooks/useSpeechAnalysis";
import { supabase } from "@/integrations/supabase/client";
import { QAResponse } from "@/types/fluent-flow";

const QAMode = () => {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<QAResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeakingAnswer, setIsSpeakingAnswer] = useState(false);
  const [speakAnswerFeedback, setSpeakAnswerFeedback] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isVoiceInput, setIsVoiceInput] = useState(false);

  const {
    transcript,
    interimTranscript,
    isListening,
    isSupported,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({ continuous: false, interimResults: true });
  // interimTranscript is provided by the speech hook and used to
  // determine when voice input has finished.

  const { analysis, analyzeText, resetAnalysis } = useSpeechAnalysis();

  console.log("Q&A Speech Recognition Status:", { isSupported, isListening, transcript, speechError });

  // Trigger question handling when transcript updates (for voice input)
  useEffect(() => {
    if (transcript && !isListening && !interimTranscript) {
      // Set question from voice input
      setQuestion(transcript.trim());
      // Auto-submit after voice input
      handleAskQuestion(transcript.trim());
    }
  }, [transcript, isListening, interimTranscript]);

  // Update question from voice
  const handleMicClick = async () => {
    if (isListening) {
      stopListening();
      if (transcript.trim()) {
        setQuestion(transcript.trim());
        setIsVoiceInput(false);
        // Auto-submit after voice input
        await handleAskQuestion(transcript.trim());
      }
    } else {
      if (!isSupported) {
        setError("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
        return;
      }
      setIsVoiceInput(true);
      resetTranscript();
      setResponse(null);
      setError(null);
      try {
        // Request microphone permission first
        await navigator.mediaDevices.getUserMedia({ audio: true });
        startListening();
      } catch (error) {
        console.error("Microphone permission denied:", error);
        setError("Microphone access is required for voice input. Please allow microphone permissions and try again.");
        setIsVoiceInput(false);
      }
    }
  };

  const handleAskQuestion = useCallback(async (q?: string) => {
    const questionText = q || question;
    if (!questionText.trim()) return;

    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("answer-question", {
        body: { 
          question: questionText.trim(),
          apiKey: "AIzaSyB8smWPHy1n84B_4ema_XOiwpfv2OKsNs8" // Temporary: send API key directly
        },
      });

      if (invokeError) throw invokeError;

      if (data) {
        setResponse(data);
      }
    } catch (err) {
      console.error("Failed to get answer:", err);
      setError("Failed to get an answer. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [question]);

  const handleSpeakAnswerMic = async () => {
    if (isListening) {
      stopListening();
      // Analyze the spoken answer
      if (transcript.trim()) {
        analyzeText(transcript);
        setTimeout(() => {
          setSpeakAnswerFeedback({
            grammarScore: analysis.grammarScore,
            fluencyScore: analysis.fluencyScore,
            confidenceScore: analysis.confidenceScore,
            improvedVersion: analysis.correctedTranscript || "Good job! Try speaking more confidently next time.",
          });
        }, 500);
      }
    } else {
      resetTranscript();
      resetAnalysis();
      setSpeakAnswerFeedback(null);
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        startListening();
      } catch (error) {
        console.error("Microphone permission denied:", error);
      }
    }
  };

  // Handle form submit from text input
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    await handleAskQuestion();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground">Ask Any Question</h3>
        <p className="text-sm text-muted-foreground">
          Get structured explanations for any topic, perfect for interview preparation
        </p>
      </div>

      {/* Input Section */}
      <div className="space-y-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={isListening ? transcript : question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., What is DSA? What is REST API?"
              className="pl-10 pr-4"
              disabled={isListening}
            />
          </div>
          <Button type="submit" disabled={isLoading || (!question.trim() && !isListening)}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ask"}
          </Button>
        </form>

        {/* Voice Input */}
        <div className="flex items-center justify-center gap-4">
          <span className="text-sm text-muted-foreground">or ask by voice:</span>
          <MicButton
            isListening={isListening}
            isProcessing={isLoading}
            size="md"
            onClick={handleMicClick}
            disabled={!isSupported}
          />
          {!isSupported && (
            <span className="text-xs text-destructive">Not supported in this browser</span>
          )}
        </div>

        {/* Voice Input Status */}
        {isVoiceInput && isListening && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center p-4 rounded-xl bg-primary/10 border border-primary/30"
          >
            <p className="text-sm text-primary">Listening... Speak your question</p>
            {transcript && (
              <p className="mt-2 text-foreground font-medium">{transcript}</p>
            )}
            {!transcript && (
              <p className="mt-2 text-muted-foreground text-sm">No speech detected yet...</p>
            )}
          </motion.div>
        )}
      </div>

      {/* Error Message */}
      {(error || speechError) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm"
        >
          {error || speechError}
        </motion.div>
      )}

      {/* Response */}
      <AnimatePresence>
        {response && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Question */}
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/30">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span className="text-sm text-primary font-medium">Your Question</span>
              </div>
              <p className="text-foreground font-medium">{response.question}</p>
            </div>

            {/* Definition */}
            <div className="p-4 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-blue-400 font-medium">Definition</span>
              </div>
              <p className="text-foreground">{response.definition}</p>
            </div>

            {/* Why Important */}
            <div className="p-4 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-yellow-400 font-medium">Why It's Important</span>
              </div>
              <p className="text-foreground">{response.importance}</p>
            </div>

            {/* Examples */}
            {response.examples && response.examples.length > 0 && (
              <div className="p-4 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-400 font-medium">Examples</span>
                </div>
                <ul className="space-y-2">
                  {response.examples.map((example, i) => (
                    <li key={i} className="text-foreground flex items-start gap-2">
                      <span className="text-green-400 mt-1">•</span>
                      {example}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Interview Answer */}
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-400 font-medium">Interview-Ready Answer</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSpeakingAnswer(true)}
                  disabled={isSpeakingAnswer}
                >
                  Speak This Answer
                </Button>
              </div>
              <p className="text-foreground italic">"{response.interviewAnswer}"</p>
            </div>

            {/* Speak Answer Feedback */}
            {isSpeakingAnswer && (
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                <p className="text-sm text-blue-400 font-medium mb-2">Practice Speaking the Answer</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Click the mic and speak the answer above. We'll analyze your delivery.
                </p>
                <MicButton
                  isListening={isListening}
                  isProcessing={false}
                  size="md"
                  onClick={handleSpeakAnswerMic}
                />
                {speakAnswerFeedback && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-foreground">Your Performance:</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded bg-secondary/50">
                        <p className="text-lg font-bold">{speakAnswerFeedback.grammarScore || 0}%</p>
                        <p className="text-xs">Grammar</p>
                      </div>
                      <div className="p-2 rounded bg-secondary/50">
                        <p className="text-lg font-bold">{speakAnswerFeedback.fluencyScore || 0}%</p>
                        <p className="text-xs">Fluency</p>
                      </div>
                      <div className="p-2 rounded bg-secondary/50">
                        <p className="text-lg font-bold">{speakAnswerFeedback.confidenceScore || 0}%</p>
                        <p className="text-xs">Confidence</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {speakAnswerFeedback.improvedVersion || "Keep practicing to improve your delivery!"}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Related Topics */}
            {response.relatedTopics && response.relatedTopics.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-muted-foreground">Related:</span>
                {response.relatedTopics.map((topic, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQuestion(topic);
                      handleAskQuestion(topic);
                    }}
                    className="text-xs"
                  >
                    {topic}
                  </Button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Example Questions */}
      {!response && !isLoading && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {[
              "What is DSA?",
              "Explain REST API",
              "What is Machine Learning?",
              "OOP concepts",
              "SQL vs NoSQL",
            ].map((q, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuestion(q);
                  handleAskQuestion(q);
                }}
              >
                {q}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QAMode;
