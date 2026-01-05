import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Square } from "lucide-react";

interface MicButtonProps {
  isListening: boolean;
  isProcessing?: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  onClick: () => void;
}

const MicButton = ({
  isListening,
  isProcessing = false,
  disabled = false,
  size = "lg",
  onClick,
}: MicButtonProps) => {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-20 h-20",
  };

  const iconSizes = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Pulse rings when listening */}
      <AnimatePresence>
        {isListening && !isProcessing && (
          <>
            <motion.div
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 2.5, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeOut",
              }}
              className={`absolute rounded-full bg-primary/30 ${sizeClasses[size]}`}
            />
            <motion.div
              initial={{ scale: 1, opacity: 0.4 }}
              animate={{ scale: 2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeOut",
                delay: 0.5,
              }}
              className={`absolute rounded-full bg-primary/20 ${sizeClasses[size]}`}
            />
          </>
        )}
      </AnimatePresence>

      {/* Processing spinner */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, rotate: 360 }}
            exit={{ opacity: 0 }}
            transition={{
              rotate: { duration: 1, repeat: Infinity, ease: "linear" },
            }}
            className={`absolute rounded-full border-2 border-transparent border-t-primary ${sizeClasses[size]}`}
            style={{ width: "calc(100% + 8px)", height: "calc(100% + 8px)" }}
          />
        )}
      </AnimatePresence>

      {/* Main button */}
      <motion.button
        onClick={onClick}
        disabled={disabled}
        whileHover={{ scale: disabled ? 1 : 1.05 }}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
        className={`
          relative ${sizeClasses[size]} rounded-full flex items-center justify-center
          transition-all duration-300 shadow-lg
          ${isListening
            ? "bg-primary text-primary-foreground shadow-primary/50"
            : "bg-card text-muted-foreground hover:text-foreground hover:bg-card/80"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          border-2 ${isListening ? "border-primary" : "border-border"}
        `}
      >
        <motion.div
          animate={{
            scale: isListening ? [1, 1.15, 1] : 1,
          }}
          transition={{
            duration: 1,
            repeat: isListening ? Infinity : 0,
            ease: "easeInOut",
          }}
        >
          {isProcessing ? (
            <div className={`${iconSizes[size]} rounded-full border-2 border-current border-t-transparent animate-spin`} />
          ) : isListening ? (
            <Square className={iconSizes[size]} />
          ) : disabled ? (
            <MicOff className={iconSizes[size]} />
          ) : (
            <Mic className={iconSizes[size]} />
          )}
        </motion.div>
      </motion.button>

      {/* Status text */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap"
      >
        <span className={`text-xs font-medium ${isListening ? "text-primary" : "text-muted-foreground"}`}>
          {isProcessing ? "Processing..." : isListening ? "Tap to stop" : "Tap to speak"}
        </span>
      </motion.div>
    </div>
  );
};

export default MicButton;
