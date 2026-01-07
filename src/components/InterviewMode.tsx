import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, RotateCcw, CheckCircle, ChevronRight, Settings, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MicButton from "@/components/MicButton";
import TranscriptPanel from "@/components/TranscriptPanel";
import SpeakingFeedback from "@/components/SpeakingFeedback";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import useSpeechAnalysis from "@/hooks/useSpeechAnalysis";
import { supabase } from "@/integrations/supabase/client";
import { InterviewQuestion, InterviewFeedback, INTERVIEW_CATEGORIES } from "@/types/fluent-flow";

// Dynamic question interface for API responses
interface DynamicQuestion {
  question: string;
  expectedKeywords: string[];
  idealAnswer: string;
}

// Fallback question generator for when API fails or is unavailable
// This ensures InterviewMode NEVER blocks or shows blank screens
const generateRandomInterviewQuestion = (category: string): DynamicQuestion => {
  // Pre-defined realistic interview questions with expected keywords and ideal answers
  const hrQuestions: DynamicQuestion[] = [
    {
      question: "Tell me about yourself and your background.",
      expectedKeywords: ["experience", "education", "skills", "goals", "background"],
      idealAnswer: "I have 3+ years of experience in software development, holding a Bachelor's degree in Computer Science. I've worked with React, Node.js, and cloud technologies. I'm passionate about creating user-friendly applications and continuously learning new technologies to deliver high-quality solutions."
    },
    {
      question: "What are your strengths and weaknesses?",
      expectedKeywords: ["strengths", "weaknesses", "improvement", "growth", "learning"],
      idealAnswer: "My strengths include strong problem-solving skills, attention to detail, and the ability to learn new technologies quickly. I'm working on improving my public speaking skills by taking courses and practicing regularly. I believe in continuous growth and welcome constructive feedback."
    },
    {
      question: "Why do you want to work here?",
      expectedKeywords: ["company", "values", "growth", "contribution", "culture"],
      idealAnswer: "I'm drawn to this company because of its innovative approach to technology and commitment to employee development. Your company's values align with my professional goals, and I believe my skills in full-stack development would allow me to contribute meaningfully to your team's success."
    },
    {
      question: "Where do you see yourself in 5 years?",
      expectedKeywords: ["growth", "leadership", "skills", "goals", "development"],
      idealAnswer: "In 5 years, I see myself as a senior developer with expertise in multiple technologies, possibly taking on leadership roles in guiding junior developers. I plan to deepen my knowledge in cloud architecture and contribute to strategic technical decisions."
    },
    {
      question: "Why did you leave your last job?",
      expectedKeywords: ["reasons", "growth", "opportunities", "change", "career"],
      idealAnswer: "I left my previous position to pursue new challenges and opportunities for professional growth. I was looking for a role that would allow me to work with cutting-edge technologies and contribute to larger-scale projects, which I believe this position offers."
    }
  ];

  const techQuestions: DynamicQuestion[] = [
    {
      question: "Explain the difference between SQL and NoSQL databases.",
      expectedKeywords: ["structure", "scalability", "relationships", "performance", "flexibility"],
      idealAnswer: "SQL databases use structured tables with predefined schemas and are excellent for complex queries with relationships. NoSQL databases offer more flexibility with dynamic schemas, better horizontal scalability, and are optimized for high-volume reads/writes with unstructured data."
    },
    {
      question: "What is React and why would you use it?",
      expectedKeywords: ["component", "state", "virtual DOM", "performance", "reusable"],
      idealAnswer: "React is a JavaScript library for building user interfaces using components. It uses a virtual DOM for efficient rendering, manages component state effectively, and allows for reusable UI components. I'd use it for building interactive web applications with complex user interfaces."
    },
    {
      question: "Explain RESTful API design principles.",
      expectedKeywords: ["stateless", "resources", "HTTP methods", "endpoints", "scalability"],
      idealAnswer: "RESTful APIs follow principles like being stateless, using HTTP methods (GET, POST, PUT, DELETE) appropriately, treating everything as resources with unique URIs, and providing consistent responses. This design ensures scalability, simplicity, and easy integration."
    },
    {
      question: "What is version control and why is it important?",
      expectedKeywords: ["collaboration", "history", "backup", "branches", "merge"],
      idealAnswer: "Version control systems like Git track changes to code over time, enabling collaboration among developers. It maintains a complete history of changes, allows branching for feature development, provides backup capabilities, and helps resolve conflicts when merging changes."
    },
    {
      question: "How do you handle errors in your applications?",
      expectedKeywords: ["try-catch", "logging", "user feedback", "graceful degradation", "monitoring"],
      idealAnswer: "I implement comprehensive error handling using try-catch blocks, proper logging for debugging, user-friendly error messages, and graceful degradation. I also use monitoring tools to track errors in production and implement fallback mechanisms to ensure application stability."
    }
  ];

  const questions = category === 'hr' ? hrQuestions : techQuestions;
  return questions[Math.floor(Math.random() * questions.length)];
};

// Fetch question from Gemini API with robust fallback
// CRITICAL: This function must NEVER throw or block - always returns a question
const fetchQuestionFromGemini = async (category: string): Promise<DynamicQuestion> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  // If no API key, immediately use fallback (no API call needed)
  if (!apiKey) {
    console.warn("Gemini API key not found, using local fallback questions");
    return generateRandomInterviewQuestion(category);
  }

  try {
    // Set a reasonable timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const prompt = `Generate one random ${category === 'hr' ? 'HR' : 'technical'} interview question. Return ONLY a JSON object with this exact format:
{
  "question": "The interview question here",
  "expectedKeywords": ["keyword1", "keyword2", "keyword3", "keyword4"],
  "idealAnswer": "A complete, professional answer that covers all key points"
}

Make the question appropriate for a job interview and ensure the idealAnswer demonstrates strong communication skills.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid API response format - missing candidates or content');
    }

    const text = data.candidates[0].content.parts[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No valid JSON found in API response');
    }

    const questionData = JSON.parse(jsonMatch[0]);

    // Validate the response format
    if (!questionData.question || !Array.isArray(questionData.expectedKeywords) || !questionData.idealAnswer) {
      throw new Error('Invalid question format from API - missing required fields');
    }

    console.log("Successfully fetched question from Gemini API");
    return {
      question: questionData.question,
      expectedKeywords: questionData.expectedKeywords,
      idealAnswer: questionData.idealAnswer
    };

  } catch (error) {
    // ANY error (network, CORS, timeout, parsing, etc.) falls back to local questions
    console.warn("Gemini API failed, using local fallback questions:", error);
    return generateRandomInterviewQuestion(category);
  }
};

interface InterviewModeProps {
  onBack?: () => void;
}

const InterviewMode = ({ onBack }: InterviewModeProps) => {
  const [isStarted, setIsStarted] = useState(false);
  const [category, setCategory] = useState<keyof typeof INTERVIEW_CATEGORIES>("hr");
  const [currentQuestion, setCurrentQuestion] = useState<DynamicQuestion | null>(null);
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const [questionError, setQuestionError] = useState<string | null>(null);

  const {
    transcript,
    interimTranscript,
    isListening: isSpeechListening,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({ continuous: true, interimResults: true });

  const { analysis, analyzeText, resetAnalysis } = useSpeechAnalysis();

  // Fetch next question from API
  const fetchNextQuestion = useCallback(async () => {
    setIsLoadingQuestion(true);
    setQuestionError(null);

    try {
      const question = await fetchQuestionFromGemini(category);
      setCurrentQuestion(question);
    } catch (error) {
      // This should never happen due to robust fallback, but just in case
      console.error("Unexpected error in fetchNextQuestion:", error);
      setQuestionError("Failed to load question. Please try again.");
      setCurrentQuestion(generateRandomInterviewQuestion(category));
    } finally {
      setIsLoadingQuestion(false);
    }
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

  const handleStart = async () => {
    setIsStarted(true);
    setShowSettings(false);
    setFeedback(null);
    setQuestionError(null);
    await fetchNextQuestion();
    resetTranscript();
    resetAnalysis();
  };

  const handleMicClick = async () => {
    if (isListening) {
      stopListening();
      // Check if user said "stop interview"
      if (transcript.toLowerCase().includes("stop interview")) {
        setIsStarted(false);
        setShowSettings(true);
        setCurrentQuestion(null);
        setFeedback(null);
        return;
      }
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
          category: category,
          expectedKeyPoints: currentQuestion.expectedKeywords,
          idealAnswer: currentQuestion.idealAnswer,
          apiKey: import.meta.env.GEMINI_API_KEY,
        },
      });

      if (error) throw error;

      if (data) {
        setFeedback(data);
        // Auto-fetch next question after showing feedback
        setTimeout(() => {
          fetchNextQuestion();
          setFeedback(null);
          resetTranscript();
          resetAnalysis();
        }, 5000); // Show feedback for 5 seconds then move to next question
      }
    } catch (error) {
      console.error("Failed to generate feedback:", error);
      // Use local analysis as fallback with key points
      const userAnswer = transcript.toLowerCase();
      const coveredPoints = currentQuestion.expectedKeywords?.filter(point => 
        userAnswer.includes(point.toLowerCase())
      ) || [];
      const missedPoints = currentQuestion.expectedKeywords?.filter(point => 
        !userAnswer.includes(point.toLowerCase())
      ) || [];

      setFeedback({
        question: currentQuestion.question,
        userAnswer: transcript,
        grammarScore: analysis.grammarScore,
        fluencyScore: analysis.fluencyScore,
        confidenceScore: analysis.confidenceScore,
        keyPointsCovered: coveredPoints,
        missedPoints: missedPoints,
        improvedAnswer: currentQuestion.idealAnswer,
        tips: analysis.suggestions,
      });

      // Auto-fetch next question after showing feedback
      setTimeout(() => {
        fetchNextQuestion();
        setFeedback(null);
        resetTranscript();
        resetAnalysis();
      }, 5000);
    } finally {
      setIsLoadingFeedback(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestion) {
      setAskedQuestions(prev => new Set([...prev, currentQuestion.id]));
    }
    const nextQuestion = getNextQuestion();
    setCurrentQuestion(nextQuestion);
    setFeedback(null);
    resetTranscript();
    resetAnalysis();
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

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-destructive">Speech recognition error: {error}</p>
        <p className="text-sm text-muted-foreground mt-2">Please check your microphone permissions and try again.</p>
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
              Dynamic questions will be generated based on your selected category
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interview Session */}
      {isStarted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* Progress */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Infinite Interview Mode - Say "stop interview" to end</span>
            <Button variant="ghost" size="sm" onClick={() => { setIsStarted(false); setShowSettings(true); setCurrentQuestion(null); }}>
              <RotateCcw className="w-4 h-4 mr-1" />
              Stop Interview
            </Button>
          </div>

          {/* Loading Question State */}
          {isLoadingQuestion && (
            <div className="p-6 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center space-x-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <p className="text-foreground">Generating your interview question...</p>
            </div>
          )}

          {/* Question Error State */}
          {questionError && !isLoadingQuestion && (
            <div className="p-6 rounded-xl bg-destructive/10 border border-destructive/30">
              <p className="text-sm font-medium text-destructive mb-2">Question Generation Error</p>
              <p className="text-sm text-muted-foreground">{questionError}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => fetchNextQuestion()}
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Question Card - Only show when we have a question and not loading */}
          {currentQuestion && !isLoadingQuestion && !questionError && (
            <div className="p-6 rounded-xl bg-primary/10 border border-primary/30">
              <p className="text-xs text-primary mb-2 uppercase">{INTERVIEW_CATEGORIES[category]}</p>
              <p className="text-lg font-medium text-foreground">{currentQuestion.question}</p>
            </div>
          )}

          {/* Mic Button - Show when we have a question or are in error state */}
          {(currentQuestion || questionError) && !isLoadingQuestion && (
            <div className="flex justify-center py-6">
              <MicButton
                isListening={isListening}
                isProcessing={isLoadingFeedback}
                onClick={handleMicClick}
              />
            </div>
          )}

          {/* Transcript - Show when we have a question */}
          {currentQuestion && !isLoadingQuestion && !questionError && (
            <TranscriptPanel
              transcript={transcript}
              interimTranscript={interimTranscript}
              grammarMistakes={analysis.grammarMistakes}
              showHighlights={true}
              onClear={resetTranscript}
            />
          )}

          {/* Real-time Feedback - Show when we have a question */}
          {currentQuestion && !isLoadingQuestion && !questionError && transcript && !feedback && (
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
                    <h4 className="font-semibold text-foreground">Interview Feedback</h4>
                  </div>

                  {/* Your Answer */}
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                    <p className="text-sm font-medium text-red-400 mb-2">Your Answer</p>
                    <p className="text-sm text-foreground">{feedback.userAnswer}</p>
                  </div>

                  {/* Correct Answer */}
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    <p className="text-sm font-medium text-blue-400 mb-2">Correct Answer</p>
                    <p className="text-sm text-foreground">{feedback.improvedAnswer}</p>
                  </div>

                  {/* How to Say This in an Interview */}
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                    <p className="text-sm font-medium text-green-400 mb-2">How to Say This in an Interview</p>
                    <p className="text-sm text-foreground italic">
                      Speak confidently, maintain eye contact, and use the suggested answer as a template.
                      Practice saying it out loud to build fluency.
                    </p>
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

                  {/* Key Points */}
                  {feedback.keyPointsCovered.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-green-400">Key Points Covered:</p>
                      <ul className="space-y-1">
                        {feedback.keyPointsCovered.map((point, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-green-400">✓</span>
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {feedback.missedPoints.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-red-400">Missed Key Points:</p>
                      <ul className="space-y-1">
                        {feedback.missedPoints.map((point, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-red-400">✗</span>
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Tips */}
                  {feedback.tips.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">Additional Tips:</p>
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
                </div>

                {/* Auto-progression message */}
                <div className="text-center text-sm text-muted-foreground">
                  Next question will appear in a few seconds...
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};

export default InterviewMode;
