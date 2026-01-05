# Fluent Flow Speak Assist

A real-time conversational assistant for live meetings that analyzes group discussions and provides discreet, context-aware speaking cues.

## Features

- Real-time speech analysis
- Multiple conversation modes (Assistant, Interview, Learning, Q&A)
- Floating orb interface for discreet feedback
- Conversation history tracking
- Browser extension for popular meeting platforms (Google Meet, Zoom, Teams, Webex)

## Technologies Used

- **Frontend**: React, TypeScript, Vite
- **UI**: shadcn/ui, Tailwind CSS
- **Backend**: Supabase Edge Functions
- **AI**: Google Gemini 1.5 Flash
- **Speech Recognition**: Web Speech API
- **Extension**: Chrome Extension Manifest V3

## Setup

### Prerequisites

- Node.js & npm
- Supabase account
- Google Gemini API key

### Installation

1. Clone the repository
```sh
git clone <repository-url>
cd fluent-flow-speak-assist
```

2. Install dependencies
```sh
npm install
```

3. Set up environment variables

Create a `.env.local` file in the root directory:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

For Supabase functions, set environment variables in your Supabase dashboard:
```
GEMINI_API_KEY=your_gemini_api_key
```

4. Start the development server
```sh
npm run dev
```

### Building the Extension

1. Build the project
```sh
npm run build
```

2. Load the extension in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

## Usage

1. Install the browser extension
2. Join a meeting on supported platforms
3. Click the extension to open the interface
4. Select your preferred mode and start speaking
5. Receive real-time feedback through the floating orb

## Deployment

### Frontend
Deploy to Vercel, Netlify, or any static hosting service.

### Backend
Supabase functions are deployed automatically when pushed to the repository.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License
