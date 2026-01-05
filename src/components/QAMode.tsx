import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Mic, Loader2, BookOpen, Lightbulb, MessageSquare, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MicButton from "@/components/MicButton";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { supabase } from "@/integrations/supabase/client";
import { QAResponse } from "@/types/fluent-flow";

const QAMode = () => {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<QAResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceInput, setIsVoiceInput] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    transcript,
    isListening,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({ continuous: false, interimResults: true });

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
      setIsVoiceInput(true);
      resetTranscript();
      setResponse(null);
      setError(null);
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        startListening();
      } catch (error) {
        console.error("Microphone permission denied:", error);
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
        body: { question: questionText.trim() },
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAskQuestion();
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
          />
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
          </motion.div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm"
        >
          {error}
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
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-400 font-medium">Interview-Ready Answer</span>
              </div>
              <p className="text-foreground italic">"{response.interviewAnswer}"</p>
            </div>

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
