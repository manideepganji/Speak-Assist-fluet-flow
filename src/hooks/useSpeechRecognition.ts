import { useState, useEffect, useCallback, useRef } from "react";

interface UseSpeechRecognitionOptions {
  continuous?: boolean;
  interimResults?: boolean;
  lang?: string;
}

interface UseSpeechRecognitionReturn {
  transcript: string;
  interimTranscript: string;
  isListening: boolean;
  isSupported: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

export const useSpeechRecognition = (
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn => {
  const { continuous = true, interimResults = true, lang = "en-US" } = options;

  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Single shared SpeechRecognition instance stored on window.
  // Important: The Web Speech API maintains internal state inside the
  // recognition instance. Creating multiple instances across React
  // components can lead to InvalidStateError (already started). To
  // avoid that, we keep exactly one instance on the window and reuse it
  // everywhere. Components must call safeStart/safeStop instead of
  // calling recognition.start() directly.
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(
    // @ts-ignore - read/write helper on window
    (window as any).__sharedSpeechRecognition || null
  );

  // Use a ref to track the live listening state reported by the
  // browser events. Do NOT rely on React state to decide whether to
  // call start() - use this ref which is updated in recognition.onstart/onend.
  const isListeningRef = useRef<boolean>(
    // @ts-ignore
    (window as any).__sharedIsListening || false
  );
  const [sharedIsListening, setSharedIsListening] = useState<boolean>(isListeningRef.current);

  useEffect(() => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognitionAPI) {
      setIsSupported(true);

      // If a shared instance doesn't exist, create it and attach
      // event handlers that update the ref-only listening state. We
      // intentionally rely on the recognition's onstart/onend events
      // to determine whether the microphone is active.
      // @ts-ignore
      if (!(window as any).__sharedSpeechRecognition) {
        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = continuous;
        recognition.interimResults = interimResults;
        recognition.lang = lang;

        recognition.onstart = () => {
          // Browser reports recognition started. Update ref and shared state.
          isListeningRef.current = true;
          // @ts-ignore
          (window as any).__sharedIsListening = true;
          setSharedIsListening(true);
          setIsListening(true);
          window.dispatchEvent(new CustomEvent("__speech_start"));
        };

        recognition.onresult = (event: any) => {
          let finalTranscript = "";
          let interim = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              finalTranscript += result[0].transcript;
            } else {
              interim += result[0].transcript;
            }
          }

          if (finalTranscript) {
            // Append final transcript to the shared store
            // using a custom field on the instance so all hooks
            // can read the same value.
            // @ts-ignore
            recognition.__lastFinal = (recognition.__lastFinal || "") + " " + finalTranscript;
          }
          // @ts-ignore
          recognition.__lastInterim = interim;

          // Fire a global event so React hooks can pick it up.
          window.dispatchEvent(new CustomEvent("__speech_result_updated"));
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error || event);
          setError((event && event.error) || "Speech recognition error");
          // Update listening state conservatively
          isListeningRef.current = false;
          // @ts-ignore
          (window as any).__sharedIsListening = false;
          setSharedIsListening(false);
          setIsListening(false);
          window.dispatchEvent(new CustomEvent("__speech_error", { detail: event }));
        };

        recognition.onend = () => {
          // Browser reports recognition ended. Update ref and shared state.
          isListeningRef.current = false;
          // @ts-ignore
          (window as any).__sharedIsListening = false;
          setSharedIsListening(false);
          setIsListening(false);
          window.dispatchEvent(new CustomEvent("__speech_end"));
        };

        // store shared instance
        // @ts-ignore
        window.__sharedSpeechRecognition = recognition;
      }

      // assign the shared instance to our ref
      // @ts-ignore
      recognitionRef.current = (window as any).__sharedSpeechRecognition;
    }

    return () => {
      // Do not forcibly stop the shared recognition on unmount of a
      // single consumer. The recognition is global and other components
      // might be using it. We only remove event listeners via cleanup
      // in the other effects below.
    };
  }, [continuous, interimResults, lang, isListening]);

  // Public API: safeStart / safeStop
  // These methods ensure we never call recognition.start() when the
  // browser already has an active recognition session. We rely on the
  // recognition.onstart/onend events (which update isListeningRef) to
  // determine the true running state.
  const safeStart = useCallback(() => {
    setError(null);
    const r = recognitionRef.current;
    if (!r) return;
    if (isListeningRef.current) {
      // Already running according to browser events - do nothing.
      console.log("safeStart: recognition already running - skip start");
      return;
    }

    // Reset stored transcripts on the shared instance so consumers
    // read a fresh transcript after starting.
    // @ts-ignore
    r.__lastFinal = "";
    // @ts-ignore
    r.__lastInterim = "";

    try {
      r.start();
      // Do NOT set isListeningRef here; wait for onstart event from browser
      // to guarantee the recognition actually began. This prevents
      // InvalidStateError race conditions where multiple components call
      // start around the same time.
    } catch (err: any) {
      console.warn("safeStart failed:", err);
      // If it's already started, ignore. onstart will fire for the
      // running instance and update refs accordingly.
      if (err && err.name === 'InvalidStateError') {
        console.log("safeStart: InvalidStateError - recognition already started (ignored)");
      } else {
        setError("Failed to start speech recognition");
      }
    }
  }, []);

  const safeStop = useCallback(() => {
    const r = recognitionRef.current;
    if (!r) return;
    if (!isListeningRef.current) {
      // Not running, nothing to stop
      return;
    }
    try {
      r.stop();
      // Do not set isListeningRef here; wait for onend event to update
      // the true state.
    } catch (err: any) {
      console.warn("safeStop failed:", err);
      // ignore
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
  }, []);

  // Listen to shared result events and update local transcript state
  useEffect(() => {
    const onUpdate = () => {
      if (!recognitionRef.current) return;
      // @ts-ignore
      const r: any = recognitionRef.current;
      const finalText = (r.__lastFinal || "").trim();
      const interim = (r.__lastInterim || "").trim();
      if (finalText) setTranscript(finalText);
      setInterimTranscript(interim);
    };

    const onError = (e: any) => {
      console.error("Shared speech error:", e.detail || e);
      setError(e.detail?.error || "Speech recognition error");
      // Update listening state conservatively; browser onend/onerror
      // handlers will also run and keep refs consistent.
      isListeningRef.current = false;
      // @ts-ignore
      (window as any).__sharedIsListening = false;
      setSharedIsListening(false);
      setIsListening(false);
    };

    const onStart = () => {
      // Keep React state in sync when a shared onstart fires
      setSharedIsListening(true);
      setIsListening(true);
      isListeningRef.current = true;
    };

    const onEnd = () => {
      setSharedIsListening(false);
      setIsListening(false);
      isListeningRef.current = false;
    };

    window.addEventListener("__speech_result_updated", onUpdate as EventListener);
    window.addEventListener("__speech_error", onError as EventListener);
    window.addEventListener("__speech_start", onStart as EventListener);
    window.addEventListener("__speech_end", onEnd as EventListener);

    return () => {
      window.removeEventListener("__speech_result_updated", onUpdate as EventListener);
      window.removeEventListener("__speech_error", onError as EventListener);
      window.removeEventListener("__speech_start", onStart as EventListener);
      window.removeEventListener("__speech_end", onEnd as EventListener);
    };
  }, []);

  // Sync local isListening with shared state
  useEffect(() => {
    setIsListening(sharedIsListening);
    isListeningRef.current = sharedIsListening;
  }, [sharedIsListening]);

  return {
    transcript,
    interimTranscript,
    isListening,
    isSupported,
    error,
    // Expose safeStart/safeStop so consumers don't directly call
    // recognition.start()/stop() and cause InvalidStateError races.
    startListening: safeStart,
    stopListening: safeStop,
    resetTranscript,
  };
};

// Type declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionClass {
  new (): SpeechRecognitionInstance;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionClass;
    webkitSpeechRecognition: SpeechRecognitionClass;
  }
}