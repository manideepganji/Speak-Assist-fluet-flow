import { motion } from "framer-motion";
import { Mic, MessageSquareText, GraduationCap, HelpCircle } from "lucide-react";
import { AppMode } from "@/types/fluent-flow";

interface ModeSwitcherProps {
  activeMode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

const modes: { id: AppMode; label: string; icon: React.ElementType; description: string }[] = [
  {
    id: "assistant",
    label: "Assistant",
    icon: Mic,
    description: "Real-time speaking guidance",
  },
  {
    id: "interview",
    label: "Interview",
    icon: MessageSquareText,
    description: "Practice HR & Technical interviews",
  },
  {
    id: "learning",
    label: "Fluency",
    icon: GraduationCap,
    description: "Daily speaking practice",
  },
  {
    id: "qa",
    label: "Q&A",
    icon: HelpCircle,
    description: "Ask any question",
  },
];

const ModeSwitcher = ({ activeMode, onModeChange }: ModeSwitcherProps) => {
  return (
    <div className="flex flex-wrap gap-2 p-1 rounded-xl bg-card border border-border">
      {modes.map(mode => {
        const isActive = activeMode === mode.id;
        const Icon = mode.icon;

        return (
          <motion.button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            className={`
              relative flex-1 min-w-[100px] flex flex-col items-center gap-1 px-4 py-3 rounded-lg
              transition-colors duration-200
              ${isActive
                ? "text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }
            `}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isActive && (
              <motion.div
                layoutId="active-mode"
                className="absolute inset-0 bg-primary rounded-lg"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <Icon className={`relative z-10 w-5 h-5 ${isActive ? "text-primary-foreground" : ""}`} />
            <span className={`relative z-10 text-sm font-medium ${isActive ? "text-primary-foreground" : ""}`}>
              {mode.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
};

export default ModeSwitcher;
