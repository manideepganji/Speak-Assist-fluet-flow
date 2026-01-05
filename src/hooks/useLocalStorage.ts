import { useState, useEffect, useCallback } from "react";
import { SessionHistory } from "@/types/fluent-flow";

const SESSIONS_KEY = "fluent-flow-sessions";
const SETTINGS_KEY = "fluent-flow-settings";
const MAX_SESSIONS = 50;

export const useLocalStorage = <T>(key: string, defaultValue: T) => {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error("Failed to save to localStorage:", error);
    }
  }, [key, value]);

  return [value, setValue] as const;
};

export const useSessionHistory = () => {
  const [sessions, setSessions] = useLocalStorage<SessionHistory[]>(SESSIONS_KEY, []);

  const addSession = useCallback((session: Omit<SessionHistory, "id" | "timestamp">) => {
    const newSession: SessionHistory = {
      ...session,
      id: `session-${Date.now()}`,
      timestamp: new Date(),
    };

    setSessions(prev => {
      const updated = [newSession, ...prev];
      return updated.slice(0, MAX_SESSIONS);
    });

    return newSession;
  }, [setSessions]);

  const clearSessions = useCallback(() => {
    setSessions([]);
  }, [setSessions]);

  const getSessionsByMode = useCallback((mode: SessionHistory["mode"]) => {
    return sessions.filter(s => s.mode === mode);
  }, [sessions]);

  return {
    sessions,
    addSession,
    clearSessions,
    getSessionsByMode,
  };
};

export default useLocalStorage;
