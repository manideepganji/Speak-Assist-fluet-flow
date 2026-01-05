// SpeakAssist Background Service Worker

const SUPABASE_URL = "https://vraaiqcogqbdswuczawi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyYWFpcWNvZ3FiZHN3dWN6YXdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyNjc5OTQsImV4cCI6MjA4Mjg0Mzk5NH0.Y8L5w8OHM1dE4sS0DbDGB-rYfH7pIZ22AwxGWPX6IRY";

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GENERATE_RESPONSE") {
    generateResponse(message.data)
      .then(sendResponse)
      .catch((error) => sendResponse({ error: error.message }));
    return true; // Keep channel open for async response
  }
  
  if (message.type === "GET_SETTINGS") {
    chrome.storage.local.get(["settings"], (result) => {
      sendResponse(result.settings || { responseStyle: "neutral", language: "en" });
    });
    return true;
  }
  
  if (message.type === "SAVE_SETTINGS") {
    chrome.storage.local.set({ settings: message.data }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Call edge function to generate AI response
async function generateResponse(data) {
  const { transcript, recentHistory, responseStyle, language } = data;
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-response`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "apikey": SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        transcript,
        recentHistory,
        responseStyle,
        language,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("SpeakAssist: Error generating response:", error);
    return {
      topic: "Unknown",
      intent: "unclear",
      group_mood: "neutral",
      speaking_opportunity: "listen",
      assistive_cue: "Unable to analyze",
      suggestions: ["Wait and listen for a moment."],
    };
  }
}

// Log when extension is installed/updated
chrome.runtime.onInstalled.addListener((details) => {
  console.log("SpeakAssist installed:", details.reason);
  
  // Set default settings
  chrome.storage.local.get(["settings"], (result) => {
    if (!result.settings) {
      chrome.storage.local.set({
        settings: { responseStyle: "neutral", language: "en" }
      });
    }
  });
});
