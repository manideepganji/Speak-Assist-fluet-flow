import { motion } from "framer-motion";
import { FileText, Trash2, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GrammarMistake } from "@/types/fluent-flow";

interface TranscriptPanelProps {
  transcript: string;
  interimTranscript?: string;
  grammarMistakes?: GrammarMistake[];
  showHighlights?: boolean;
  onClear?: () => void;
}

const TranscriptPanel = ({
  transcript,
  interimTranscript = "",
  grammarMistakes = [],
  showHighlights = true,
  onClear,
}: TranscriptPanelProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(transcript + interimTranscript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Highlight grammar mistakes in transcript
  const getHighlightedText = () => {
    if (!showHighlights || grammarMistakes.length === 0) {
      return transcript;
    }

    let highlightedText = transcript;
    grammarMistakes.forEach(mistake => {
      const regex = new RegExp(`\\b${mistake.original}\\b`, "gi");
      highlightedText = highlightedText.replace(
        regex,
        `<mark class="bg-yellow-500/30 text-yellow-300 px-1 rounded">${mistake.original}</mark>`
      );
    });

    return highlightedText;
  };

  const hasContent = transcript.length > 0 || interimTranscript.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-xl bg-card border border-border overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Live Transcript</span>
          {hasContent && (
            <span className="text-xs text-muted-foreground">
              ({transcript.trim().split(/\s+/).filter(w => w).length} words)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasContent && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-8 px-2"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
              {onClear && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClear}
                  className="h-8 px-2 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 min-h-[120px] max-h-[300px] overflow-y-auto">
        {hasContent ? (
          <div className="text-foreground leading-relaxed">
            {showHighlights && grammarMistakes.length > 0 ? (
              <p
                dangerouslySetInnerHTML={{ __html: getHighlightedText() }}
              />
            ) : (
              <p>{transcript}</p>
            )}
            {interimTranscript && (
              <span className="text-muted-foreground italic ml-1">
                {interimTranscript}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">Start speaking to see your transcript here...</p>
          </div>
        )}
      </div>

      {/* Grammar hint */}
      {showHighlights && grammarMistakes.length > 0 && (
        <div className="px-4 py-2 border-t border-border bg-yellow-500/5">
          <p className="text-xs text-yellow-500">
            ⚠️ {grammarMistakes.length} grammar issue{grammarMistakes.length > 1 ? "s" : ""} detected
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default TranscriptPanel;
