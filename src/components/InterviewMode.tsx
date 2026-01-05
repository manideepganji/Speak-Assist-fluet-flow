import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, RotateCcw, CheckCircle, ChevronRight, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MicButton from "@/components/MicButton";
import TranscriptPanel from "@/components/TranscriptPanel";
import SpeakingFeedback from "@/components/SpeakingFeedback";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import useSpeechAnalysis from "@/hooks/useSpeechAnalysis";
import { supabase } from "@/integrations/supabase/client";
import { InterviewQuestion, InterviewFeedback, INTERVIEW_CATEGORIES } from "@/types/fluent-flow";

// Sample interview questions (fallback)
const SAMPLE_QUESTIONS: InterviewQuestion[] = [
  { id: "1", question: "Tell me about yourself.", category: "hr", difficulty: "easy" },
  { id: "2", question: "What are your strengths and weaknesses?", category: "hr", difficulty: "easy" },
  { id: "3", question: "Why do you want to work here?", category: "hr", difficulty: "medium" },
  { id: "4", question: "Describe a challenging situation you faced and how you handled it.", category: "behavioral", difficulty: "medium" },
  { id: "5", question: "Where do you see yourself in 5 years?", category: "hr", difficulty: "easy" },
  { id: "6", question: "What is Object-Oriented Programming?", category: "technical", difficulty: "easy" },
  { id: "7", question: "Explain the difference between SQL and NoSQL databases.", category: "technical", difficulty: "medium" },
  { id: "8", question: "What is a REST API?", category: "technical", difficulty: "easy" },
  { id: "9", question: "Tell me about a time you worked in a team.", category: "behavioral", difficulty: "easy" },
  { id: "10", question: "How do you handle pressure or tight deadlines?", category: "situational", difficulty: "medium" },
];

interface InterviewModeProps {
  onBack?: () => void;
}

const InterviewMode = ({ onBack }: InterviewModeProps) => {
  const [isStarted, setIsStarted] = useState(false);
  const [category, setCategory] = useState<keyof typeof INTERVIEW_CATEGORIES>("hr");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [isListening, setIsListening] = useState(false);

  const {
    transcript,
    interimTranscript,
    isListening: isSpeechListening,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({ continuous: true, interimResults: true });

  const { analysis, analyzeText, resetAnalysis } = useSpeechAnalysis();

  // Filter questions by category
  useEffect(() => {
    const filtered = SAMPLE_QUESTIONS.filter(q => q.category === category);
    setQuestions(filtered);
    setCurrentQuestionIndex(0);
  }, [category]);

  // Analyze transcript in real-time
  useEffect(() => {
    if (transcript) {
      analyzeText(transcript);
    }
  }, [transcript, analyzeText]);

  // Sync listening state
  useEffect(() => {
    setIsListening(isSpeechListening);
  }, [isSpeechListening]);

  const currentQuestion = questions[currentQuestionIndex];

  const handleStart = () => {
    setIsStarted(true);
    setShowSettings(false);
    setFeedback(null);
    resetTranscript();
    resetAnalysis();
  };

  const handleMicClick = async () => {
    if (isListening) {
      stopListening();
      // Generate AI feedback
      if (transcript.trim().length > 10) {
        await generateFeedback();
      }
    } else {
      setFeedback(null);
      resetTranscript();
      resetAnalysis();
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        startListening();
      } catch (error) {
        console.error("Microphone permission denied:", error);
      }
    }
  };

  const generateFeedback = async () => {
    if (!currentQuestion || !transcript.trim()) return;

    setIsLoadingFeedback(true);
    try {
      const { data, error } = await supabase.functions.invoke("interview-feedback", {
        body: {
          question: currentQuestion.question,
          answer: transcript,
          category: currentQuestion.category,
        },
      });

      if (error) throw error;

      if (data) {
        setFeedback(data);
      }
    } catch (error) {
      console.error("Failed to generate feedback:", error);
      // Use local analysis as fallback
      setFeedback({
        question: currentQuestion.question,
        userAnswer: transcript,
        grammarScore: analysis.grammarScore,
        fluencyScore: analysis.fluencyScore,
        confidenceScore: analysis.confidenceScore,
        keyPointsCovered: [],
        missedPoints: [],
        improvedAnswer: "",
        tips: analysis.suggestions,
      });
    } finally {
      setIsLoadingFeedback(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setFeedback(null);
      resetTranscript();
      resetAnalysis();
    }
  };

  const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setFeedback(null);
    resetTranscript();
    resetAnalysis();
    setShowSettings(true);
    setIsStarted(false);
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
      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-6 rounded-xl bg-card border border-border space-y-4"
          >
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Interview Settings</h3>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Category</label>
                <Select value={category} onValueChange={(v: keyof typeof INTERVIEW_CATEGORIES) => setCategory(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(INTERVIEW_CATEGORIES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button onClick={handleStart} className="w-full">
                  <Play className="w-4 h-4 mr-2" />
                  Start Interview
                </Button>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              {questions.length} questions available in this category
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interview Session */}
      {isStarted && currentQuestion && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* Progress */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
            <Button variant="ghost" size="sm" onClick={handleRestart}>
              <RotateCcw className="w-4 h-4 mr-1" />
              Restart
            </Button>
          </div>

          {/* Question Card */}
          <div className="p-6 rounded-xl bg-primary/10 border border-primary/30">
            <p className="text-xs text-primary mb-2 uppercase">{INTERVIEW_CATEGORIES[currentQuestion.category]}</p>
            <p className="text-lg font-medium text-foreground">{currentQuestion.question}</p>
          </div>

          {/* Mic Button */}
          <div className="flex justify-center py-6">
            <MicButton
              isListening={isListening}
              isProcessing={isLoadingFeedback}
              onClick={handleMicClick}
            />
          </div>

          {/* Transcript */}
          <TranscriptPanel
            transcript={transcript}
            interimTranscript={interimTranscript}
            grammarMistakes={analysis.grammarMistakes}
            showHighlights={true}
            onClear={resetTranscript}
          />

          {/* Real-time Feedback */}
          {transcript && !feedback && (
            <SpeakingFeedback analysis={analysis} showDetails={false} />
          )}

          {/* AI Feedback */}
          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="p-6 rounded-xl bg-card border border-border space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <h4 className="font-semibold text-foreground">Answer Feedback</h4>
                  </div>

                  {/* Scores */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 rounded-lg bg-secondary/50">
                      <p className="text-2xl font-bold text-foreground">{feedback.grammarScore}%</p>
                      <p className="text-xs text-muted-foreground">Grammar</p>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/50">
                      <p className="text-2xl font-bold text-foreground">{feedback.fluencyScore}%</p>
                      <p className="text-xs text-muted-foreground">Fluency</p>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/50">
                      <p className="text-2xl font-bold text-foreground">{feedback.confidenceScore}%</p>
                      <p className="text-xs text-muted-foreground">Confidence</p>
                    </div>
                  </div>

                  {/* Tips */}
                  {feedback.tips.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">Improvement Tips:</p>
                      <ul className="space-y-1">
                        {feedback.tips.map((tip, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-primary">•</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Improved Answer */}
                  {feedback.improvedAnswer && (
                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                      <p className="text-sm font-medium text-green-400 mb-2">Suggested Answer:</p>
                      <p className="text-sm text-foreground">{feedback.improvedAnswer}</p>
                    </div>
                  )}
                </div>

                {/* Next Question Button */}
                {currentQuestionIndex < questions.length - 1 && (
                  <Button onClick={handleNextQuestion} className="w-full">
                    Next Question
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};

export default InterviewMode;
