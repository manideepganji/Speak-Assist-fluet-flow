import { useState } from "react";
import { motion } from "framer-motion";
import ModeSwitcher from "@/components/ModeSwitcher";
import AssistantMode from "@/components/AssistantMode";
import InterviewMode from "@/components/InterviewMode";
import LearningMode from "@/components/LearningMode";
import QAMode from "@/components/QAMode";
import { AppMode, DEFAULT_USER_SETTINGS } from "@/types/fluent-flow";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Settings, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [activeMode, setActiveMode] = useState<AppMode>("assistant");
  const [settings] = useLocalStorage("fluent-flow-settings", DEFAULT_USER_SETTINGS);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Fluent Flow</h1>
                <p className="text-xs text-muted-foreground">AI Speaking Assistant</p>
              </div>
            </div>
            <Button variant="ghost" size="icon">
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Mode Switcher */}
        <div className="mb-6">
          <ModeSwitcher activeMode={activeMode} onModeChange={setActiveMode} />
        </div>

        {/* Mode Content */}
        <motion.div
          key={activeMode}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeMode === "assistant" && (
            <AssistantMode settings={settings} />
          )}
          {activeMode === "interview" && (
            <InterviewMode />
          )}
          {activeMode === "learning" && (
            <LearningMode />
          )}
          {activeMode === "qa" && (
            <QAMode />
          )}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 mt-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground">
            Uses Web Speech API • Works best in Chrome/Edge • Privacy-first
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
