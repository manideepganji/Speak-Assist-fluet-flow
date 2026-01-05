import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shuffle, Timer, CheckCircle, History, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MicButton from "@/components/MicButton";
import TranscriptPanel from "@/components/TranscriptPanel";
import SpeakingFeedback from "@/components/SpeakingFeedback";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import useSpeechAnalysis from "@/hooks/useSpeechAnalysis";
import { useSessionHistory } from "@/hooks/useLocalStorage";
import { LearningTopic, LEARNING_CATEGORIES } from "@/types/fluent-flow";

// Sample learning topics
const SAMPLE_TOPICS: LearningTopic[] = [
  {
    id: "1",
    title: "Introduce Yourself",
    description: "Share your background, education, and career goals",
    duration: 60,
    category: "introduction",
    prompts: ["What is your name and where are you from?", "What do you do professionally?", "What are your hobbies?"],
  },
  {
    id: "2",
    title: "Describe Your Dream Job",
    description: "Talk about your ideal work environment and role",
    duration: 90,
    category: "opinion",
    prompts: ["What kind of work excites you?", "What work culture do you prefer?", "What impact do you want to make?"],
  },
  {
    id: "3",
    title: "A Memorable Experience",
    description: "Share a significant experience that shaped you",
    duration: 120,
    category: "experience",
    prompts: ["What happened?", "How did it affect you?", "What did you learn?"],
  },
  {
    id: "4",
    title: "Technology in Daily Life",
    description: "Discuss how technology impacts your routine",
    duration: 90,
    category: "opinion",
    prompts: ["How do you use technology daily?", "What are the benefits?", "Any concerns?"],
  },
  {
    id: "5",
    title: "Explain Your Favorite App",
    description: "Describe an app you use frequently and why",
    duration: 60,
    category: "technical",
    prompts: ["What does the app do?", "Why do you like it?", "How has it helped you?"],
  },
  {
    id: "6",
    title: "Handle a Disagreement",
    description: "Describe a situation where you disagreed with someone",
    duration: 90,
    category: "situational",
    prompts: ["What was the disagreement?", "How did you handle it?", "What was the outcome?"],
  },
];

const LearningMode = () => {
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof LEARNING_CATEGORIES>("introduction");
  const [currentTopic, setCurrentTopic] = useState<LearningTopic | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);

  const {
    transcript,
    interimTranscript,
    isListening,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({ continuous: true, interimResults: true });

  const { analysis, analyzeText, resetAnalysis } = useSpeechAnalysis();
  const { sessions, addSession, getSessionsByMode, clearSessions } = useSessionHistory();

  const learningSessions = getSessionsByMode("learning");

  // Timer countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSessionActive && timeRemaining > 0 && isListening) {
      timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            stopListening();
            setSessionComplete(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isSessionActive, timeRemaining, isListening, stopListening]);

  // Analyze transcript in real-time
  useEffect(() => {
    if (transcript) {
      analyzeText(transcript);
    }
  }, [transcript, analyzeText]);

  // Get topics for selected category
  const filteredTopics = SAMPLE_TOPICS.filter(t => t.category === selectedCategory);

  const getRandomTopic = useCallback(() => {
    const topics = filteredTopics.length > 0 ? filteredTopics : SAMPLE_TOPICS;
    const randomIndex = Math.floor(Math.random() * topics.length);
    return topics[randomIndex];
  }, [filteredTopics]);

  const handleStartSession = (topic: LearningTopic) => {
    setCurrentTopic(topic);
    setTimeRemaining(topic.duration);
    setIsSessionActive(true);
    setSessionComplete(false);
    resetTranscript();
    resetAnalysis();
  };

  const handleMicClick = async () => {
    if (isListening) {
      stopListening();
      if (transcript.trim().length > 10) {
        setSessionComplete(true);
      }
    } else {
      setSessionComplete(false);
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        startListening();
      } catch (error) {
        console.error("Microphone permission denied:", error);
      }
    }
  };

  const handleSaveSession = () => {
    if (currentTopic && transcript) {
      addSession({
        mode: "learning",
        transcript,
        analysis,
        learningTopic: currentTopic,
      });
    }
  };

  const handleNewTopic = () => {
    handleStartSession(getRandomTopic());
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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
      {/* Topic Selection */}
      {!isSessionActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground">Daily Speaking Practice</h3>
              <p className="text-sm text-muted-foreground">Choose a topic and practice speaking fluently</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="w-4 h-4 mr-2" />
              History ({learningSessions.length})
            </Button>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-4">
            <Select value={selectedCategory} onValueChange={(v: keyof typeof LEARNING_CATEGORIES) => setSelectedCategory(v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LEARNING_CATEGORIES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={handleNewTopic} variant="outline">
              <Shuffle className="w-4 h-4 mr-2" />
              Random Topic
            </Button>
          </div>

          {/* Topics Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {filteredTopics.map(topic => (
              <motion.div
                key={topic.id}
                whileHover={{ scale: 1.02 }}
                className="p-4 rounded-xl bg-card border border-border cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => handleStartSession(topic)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-foreground">{topic.title}</h4>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Timer className="w-3 h-3" />
                    {topic.duration}s
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{topic.description}</p>
                <div className="flex flex-wrap gap-1">
                  {topic.prompts.map((prompt, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                      {prompt.slice(0, 30)}...
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Session History */}
          <AnimatePresence>
            {showHistory && learningSessions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 rounded-xl bg-card border border-border"
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-foreground">Past Sessions</h4>
                  <Button variant="ghost" size="sm" onClick={clearSessions}>
                    <Trash2 className="w-4 h-4 mr-1" />
                    Clear All
                  </Button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {learningSessions.slice(0, 10).map(session => (
                    <div key={session.id} className="p-3 rounded-lg bg-secondary/50 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-foreground">{session.learningTopic?.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(session.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      {session.analysis && (
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>Grammar: {session.analysis.grammarScore}%</span>
                          <span>Fluency: {session.analysis.fluencyScore}%</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Active Session */}
      {isSessionActive && currentTopic && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* Topic Header */}
          <div className="p-6 rounded-xl bg-primary/10 border border-primary/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-primary uppercase">
                {LEARNING_CATEGORIES[currentTopic.category]}
              </span>
              <div className="flex items-center gap-2">
                <Timer className={`w-4 h-4 ${timeRemaining < 10 ? "text-destructive" : "text-muted-foreground"}`} />
                <span className={`text-lg font-mono font-bold ${timeRemaining < 10 ? "text-destructive" : "text-foreground"}`}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
            </div>
            <h3 className="text-lg font-medium text-foreground mb-3">{currentTopic.title}</h3>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Speaking points:</p>
              <ul className="space-y-1">
                {currentTopic.prompts.map((prompt, i) => (
                  <li key={i} className="text-sm text-foreground flex items-start gap-2">
                    <span className="text-primary">•</span>
                    {prompt}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Mic Button */}
          <div className="flex justify-center py-6">
            <MicButton
              isListening={isListening}
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

          {/* Session Complete Feedback */}
          {sessionComplete && transcript && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Session Complete!</span>
              </div>

              <SpeakingFeedback analysis={analysis} showDetails={true} />

              <div className="flex gap-4">
                <Button onClick={handleSaveSession} variant="outline" className="flex-1">
                  Save Session
                </Button>
                <Button onClick={handleNewTopic} className="flex-1">
                  <Shuffle className="w-4 h-4 mr-2" />
                  New Topic
                </Button>
              </div>
            </motion.div>
          )}

          {/* Live Feedback */}
          {isListening && transcript && !sessionComplete && (
            <SpeakingFeedback analysis={analysis} showDetails={false} />
          )}

          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => {
              stopListening();
              setIsSessionActive(false);
              setCurrentTopic(null);
            }}
          >
            ← Back to Topics
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default LearningMode;
