import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Sparkles, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useState } from "react";

export interface ConversationEntry {
  id: string;
  type: "user" | "ai";
  content: string;
  timestamp: Date;
}

interface ConversationHistoryProps {
  entries: ConversationEntry[];
  maxVisible?: number;
  onClear?: () => void;
}

const ConversationHistory = ({ entries, maxVisible = 6, onClear }: ConversationHistoryProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const visibleEntries = showAll ? entries : entries.slice(-maxVisible);
  const hasMore = entries.length > maxVisible;

  if (entries.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-3 h-3 rounded-full bg-orb-glow animate-pulse" />
          <span className="text-sm font-medium text-orb-text">
            Conversation History
          </span>
          <span className="text-xs text-orb-text-muted px-2 py-0.5 rounded-full bg-orb-surface/50">
            {entries.length}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-orb-text-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-orb-text-muted" />
          )}
        </button>
        {onClear && (
          <button
            onClick={onClear}
            className="p-2 rounded-lg hover:bg-orb-surface/50 text-orb-text-muted hover:text-red-400 transition-colors"
            title="Clear history"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 max-h-80 overflow-y-auto">
              {/* Show more button */}
              {hasMore && !showAll && (
                <button
                  onClick={() => setShowAll(true)}
                  className="w-full text-xs text-orb-text-muted hover:text-orb-text py-2 transition-colors"
                >
                  Show {entries.length - maxVisible} more...
                </button>
              )}

              {/* Entries */}
              <AnimatePresence mode="popLayout">
                {visibleEntries.map((entry, index) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: entry.type === "user" ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex gap-3 ${
                      entry.type === "ai" ? "flex-row-reverse" : ""
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                        entry.type === "user"
                          ? "bg-orb-surface/50"
                          : "bg-orb-glow/20"
                      }`}
                    >
                      {entry.type === "user" ? (
                        <MessageSquare className="w-3.5 h-3.5 text-orb-text-muted" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-orb-glow" />
                      )}
                    </div>

                    {/* Content */}
                    <div
                      className={`flex-1 p-3 rounded-xl text-sm leading-relaxed ${
                        entry.type === "user"
                          ? "bg-orb-surface/30 text-orb-text-muted"
                          : "bg-orb-glow/10 text-orb-text border border-orb-glow/20"
                      }`}
                    >
                      <p>{entry.content}</p>
                      <p className="text-[10px] text-orb-text-muted mt-1 opacity-60">
                        {formatTime(entry.timestamp)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Show less button */}
              {showAll && hasMore && (
                <button
                  onClick={() => setShowAll(false)}
                  className="w-full text-xs text-orb-text-muted hover:text-orb-text py-2 transition-colors"
                >
                  Show less
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default ConversationHistory;
