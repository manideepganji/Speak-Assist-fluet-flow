import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export type ResponseStyle = "formal" | "casual" | "supportive" | "neutral";
export type Language = "en" | "es" | "fr" | "de" | "pt" | "hi" | "zh" | "ja" | "ko" | "ar";

export interface OrbSettingsData {
  responseStyle: ResponseStyle;
  language: Language;
}

const STYLE_OPTIONS: { value: ResponseStyle; label: string; description: string }[] = [
  { value: "neutral", label: "Neutral", description: "Balanced, professional tone" },
  { value: "formal", label: "Formal", description: "Corporate, polished language" },
  { value: "casual", label: "Casual", description: "Friendly, conversational style" },
  { value: "supportive", label: "Supportive", description: "Empathetic, encouraging tone" },
];

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "pt", label: "Português" },
  { value: "hi", label: "हिन्दी" },
  { value: "zh", label: "中文" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
  { value: "ar", label: "العربية" },
];

interface OrbSettingsProps {
  settings: OrbSettingsData;
  onSettingsChange: (settings: OrbSettingsData) => void;
}

const OrbSettings = ({ settings, onSettingsChange }: OrbSettingsProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Settings toggle button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 w-10 h-10 rounded-full glass flex items-center justify-center orb-glow z-40"
      >
        <Settings className="w-5 h-5 text-orb-text-muted" />
      </motion.button>

      {/* Settings panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-80 glass border-l border-orb-border z-50 p-6 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-orb-text">Settings</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-orb-surface/50 transition-colors"
                >
                  <X className="w-4 h-4 text-orb-text-muted" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Response Style */}
                <div className="space-y-2">
                  <Label className="text-orb-text">Response Style</Label>
                  <Select
                    value={settings.responseStyle}
                    onValueChange={(value: ResponseStyle) =>
                      onSettingsChange({ ...settings, responseStyle: value })
                    }
                  >
                    <SelectTrigger className="glass border-orb-border text-orb-text">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass border-orb-border">
                      {STYLE_OPTIONS.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          className="text-orb-text focus:bg-orb-surface/50"
                        >
                          <div>
                            <div>{option.label}</div>
                            <div className="text-xs text-orb-text-muted">
                              {option.description}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Language */}
                <div className="space-y-2">
                  <Label className="text-orb-text">Language</Label>
                  <Select
                    value={settings.language}
                    onValueChange={(value: Language) =>
                      onSettingsChange({ ...settings, language: value })
                    }
                  >
                    <SelectTrigger className="glass border-orb-border text-orb-text">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass border-orb-border">
                      {LANGUAGE_OPTIONS.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          className="text-orb-text focus:bg-orb-surface/50"
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Info */}
                <div className="pt-4 border-t border-orb-border">
                  <p className="text-xs text-orb-text-muted leading-relaxed">
                    These settings affect how the AI generates speaking suggestions.
                    Changes apply immediately to new responses.
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default OrbSettings;
