# TextEdit Pro - AI-Powered Document Editor

A specialized text editor for prompt development with advanced document handling and collaborative workflow tools.

## Features

- 📝 **Rich Text Editing** with Monaco Editor
- 🤖 **AI-Powered Editing** (OpenAI GPT-4o and Google Gemini)
- 📄 **DOCX Import/Export** support
- 🔍 **Metaphor Detection** - Identify repeated figurative language
- 🎨 **Multiple Export Formats** (TXT, HTML, Markdown, DOCX)
- 📊 **Change Tracking** with accept/reject functionality
- 🔄 **Version Management** with revision history
- 💾 **Real-time Saving** and document persistence

## Tech Stack

- **Frontend**: React, TypeScript, Monaco Editor, Tailwind CSS
- **Backend**: Express.js, Node.js
- **AI Services**: OpenAI GPT-4o, Google Gemini
- **File Processing**: Mammoth.js for DOCX handling
- **UI Components**: Radix UI, shadcn/ui

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd texteditor-pro
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Add your API keys to `.env`:
```
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser to `http://localhost:5000`

## Usage

### Document Management
- **Upload**: Click "Upload DOCX" to import Word documents
- **Create**: Use "New" to start a fresh document
- **Save**: Documents auto-save as you edit

### AI Features
- **Developmental Editing**: High-level content structure improvements
- **Line Editing**: Detailed grammar and style corrections
- **Metaphor Analysis**: Find and analyze repeated figurative language
- **Prompt Suggestions**: Get AI-generated editing prompts

### Export Options
- Plain Text (.txt)
- Markdown (.md) 
- HTML (.html)
- Word Document (.docx)

### Change Management
- Review proposed changes in the Changes panel
- Accept or reject individual edits
- Track revision history

## API Keys Setup

### OpenAI API Key
1. Visit https://platform.openai.com/account/api-keys
2. Create a new API key
3. Add to your `.env` file as `OPENAI_API_KEY`

### Google AI API Key
1. Visit https://makersuite.google.com/app/apikey
2. Create a new API key
3. Add to your `.env` file as `GOOGLE_AI_API_KEY`

## Development

### Project Structure
```
├── client/src/          # React frontend
│   ├── components/      # UI components
│   ├── pages/          # Route components
│   ├── hooks/          # Custom React hooks
│   └── lib/            # Utilities
├── server/             # Express backend
│   ├── routes.ts       # API endpoints
│   ├── ai-services.ts  # AI integration
│   └── storage.ts      # Data persistence
├── shared/             # Shared types/schemas
└── components.json     # UI component config
```

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run type-check` - Run TypeScript checks

## Troubleshooting

### Common Issues

**API Key Errors**: Ensure your API keys are valid and have sufficient quota
- OpenAI: Check your billing and usage at platform.openai.com
- Google AI: Verify key permissions at makersuite.google.com

**File Upload Issues**: Ensure DOCX files are valid Microsoft Word documents

**Monaco Editor Warnings**: These are cosmetic and don't affect functionality

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details