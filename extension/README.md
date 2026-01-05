# SpeakAssist Browser Extension

A Chrome extension that provides real-time conversational assistance during live meetings.

## Installation

1. **Download/Clone the extension folder**
   - Export this project to GitHub via Lovable
   - Clone the repository to your local machine

2. **Add Extension Icons**
   Create an `icons` folder inside `extension/` with these files:
   - `icon16.png` (16x16 pixels)
   - `icon48.png` (48x48 pixels)  
   - `icon128.png` (128x128 pixels)
   
   You can use any mic/orb icon or generate them.

3. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `extension` folder

4. **Permissions**
   - The extension will ask for microphone access when you click the orb
   - Grant access to enable speech recognition

## Usage

1. Join a meeting on Google Meet, Zoom, MS Teams, or Webex
2. The SpeakAssist orb appears in the bottom-left corner
3. Click the orb to start listening
4. Speak or let others speak - the assistant analyzes the conversation
5. View suggestions in the popup panel
6. Click any suggestion to copy it to clipboard
7. Click the orb again to stop

## Customization

Click the extension icon in your browser toolbar to:
- Change response style (neutral, formal, casual, supportive)
- Select your preferred language

## Supported Meeting Platforms

- Google Meet (meet.google.com)
- Zoom (*.zoom.us)
- Microsoft Teams (teams.microsoft.com)
- Webex (*.webex.com)

## Troubleshooting

**Orb not appearing?**
- Make sure you're on a supported meeting site
- Refresh the page after installing the extension

**Speech recognition not working?**
- Check microphone permissions in browser settings
- Use Chrome, Edge, or another Chromium-based browser

**No suggestions appearing?**
- Ensure you're speaking clearly
- Wait for 10+ characters of speech before processing

## Privacy

- All audio is processed locally via Web Speech API
- Only transcribed text is sent to the AI for analysis
- No permanent storage of conversations
- Only you can see the suggestions
