import { motion } from "framer-motion";
import { TrendingUp, AlertTriangle, Zap, Clock, MessageSquare, Lightbulb } from "lucide-react";
import { SpeechAnalysis } from "@/types/fluent-flow";
import { Progress } from "@/components/ui/progress";

interface SpeakingFeedbackProps {
  analysis: SpeechAnalysis;
  showDetails?: boolean;
}

const ScoreCard = ({
  label,
  score,
  icon: Icon,
  color,
}: {
  label: string;
  score: number;
  icon: React.ElementType;
  color: string;
}) => (
  <div className="flex flex-col gap-2 p-4 rounded-xl bg-card border border-border">
    <div className="flex items-center gap-2">
      <Icon className={`w-4 h-4 ${color}`} />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
    <div className="flex items-center gap-3">
      <span className={`text-2xl font-bold ${color}`}>{score}%</span>
      <Progress value={score} className="flex-1 h-2" />
    </div>
  </div>
);

const SpeakingFeedback = ({ analysis, showDetails = true }: SpeakingFeedbackProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const totalFillers = analysis.fillerWords.reduce((sum, f) => sum + f.count, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Score Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ScoreCard
          label="Grammar"
          score={analysis.grammarScore}
          icon={MessageSquare}
          color={getScoreColor(analysis.grammarScore)}
        />
        <ScoreCard
          label="Fluency"
          score={analysis.fluencyScore}
          icon={Zap}
          color={getScoreColor(analysis.fluencyScore)}
        />
        <ScoreCard
          label="Pronunciation"
          score={analysis.pronunciationScore}
          icon={TrendingUp}
          color={getScoreColor(analysis.pronunciationScore)}
        />
        <ScoreCard
          label="Confidence"
          score={analysis.confidenceScore}
          icon={TrendingUp}
          color={getScoreColor(analysis.confidenceScore)}
        />
      </div>

      {/* Speed and Filler Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border">
          <Clock className="w-5 h-5 text-muted-foreground" />
          <div>
            <p className="text-2xl font-bold text-foreground">{analysis.speakingSpeed}</p>
            <p className="text-xs text-muted-foreground">Words per minute</p>
          </div>
          <span className={`ml-auto text-xs px-2 py-1 rounded-full ${
            analysis.speakingSpeed >= 120 && analysis.speakingSpeed <= 150
              ? "bg-green-500/20 text-green-500"
              : "bg-yellow-500/20 text-yellow-500"
          }`}>
            {analysis.speakingSpeed < 120 ? "Slow" : analysis.speakingSpeed > 150 ? "Fast" : "Good"}
          </span>
        </div>

        <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border">
          <AlertTriangle className={`w-5 h-5 ${totalFillers > 5 ? "text-yellow-500" : "text-muted-foreground"}`} />
          <div>
            <p className="text-2xl font-bold text-foreground">{totalFillers}</p>
            <p className="text-xs text-muted-foreground">Filler words</p>
          </div>
          {totalFillers > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">
              {analysis.fillerWords.slice(0, 2).map(f => f.word).join(", ")}
            </span>
          )}
        </div>
      </div>

      {showDetails && (
        <>
          {/* Grammar Mistakes */}
          {analysis.grammarMistakes.length > 0 && (
            <div className="p-4 rounded-xl bg-card border border-border space-y-3">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                Grammar Issues
              </h4>
              <div className="space-y-2">
                {analysis.grammarMistakes.map((mistake, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <span className="text-red-400 line-through">{mistake.original}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-green-400">{mistake.correction}</span>
                    <span className="text-xs text-muted-foreground ml-2">({mistake.explanation})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {analysis.suggestions.length > 0 && (
            <div className="p-4 rounded-xl bg-card border border-border space-y-3">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-primary" />
                Improvement Tips
              </h4>
              <ul className="space-y-2">
                {analysis.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-primary mt-1">•</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
};

export default SpeakingFeedback;
