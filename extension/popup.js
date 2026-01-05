// SpeakAssist Popup Script

document.addEventListener("DOMContentLoaded", () => {
  const responseStyleSelect = document.getElementById("responseStyle");
  const languageSelect = document.getElementById("language");

  // Load settings
  chrome.runtime.sendMessage({ type: "GET_SETTINGS" }, (settings) => {
    if (settings) {
      responseStyleSelect.value = settings.responseStyle || "neutral";
      languageSelect.value = settings.language || "en";
    }
  });

  // Save settings on change
  function saveSettings() {
    const settings = {
      responseStyle: responseStyleSelect.value,
      language: languageSelect.value,
    };
    
    chrome.runtime.sendMessage({ 
      type: "SAVE_SETTINGS", 
      data: settings 
    });
  }

  responseStyleSelect.addEventListener("change", saveSettings);
  languageSelect.addEventListener("change", saveSettings);
});
