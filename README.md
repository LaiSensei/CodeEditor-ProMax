# Online Code Editor Platform

A modern web application for practicing coding problems with live code execution, multi-language support, and an AI-powered assistant.

## Features

- User authentication with Firebase (register, login, logout, email verification, password reset)
- View and solve coding problems
- Live code editor with Monaco Editor
- **Multi-language support:** JavaScript, Python, Java, C++ (syntax highlighting and execution)
- **Backend code execution:** Securely run code in multiple languages using Judge0 API
- **AI Prompter sidebar:** Chat with an AI assistant (OpenAI GPT-4.1 Mini or GPT-4o) for code generation, analysis, and debugging
- **Markdown and code block rendering:** AI output supports markdown, syntax-highlighted code blocks, and copy-to-clipboard for code
- **Chat history:** Full chat history with user and AI messages, styled for clarity
- Problem difficulty levels
- Real-time code execution and error display
- Submission storage (save your code for each problem)
- Responsive UI with Tailwind CSS

## Tech Stack

- React with TypeScript
- Firebase (Authentication & Firestore)
- Tailwind CSS for styling
- Monaco Editor for code editing
- Judge0 API for backend code execution
- OpenAI API for AI assistant
- react-markdown, react-syntax-highlighter for markdown/code rendering
- Vite for build tooling

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase account
- OpenAI account (for AI features)
- RapidAPI account (for Judge0 API key)

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd CodeEditor-ProMax
```

2. Install dependencies:
```bash
npm install
```

3. Create a Firebase project and enable:
   - Authentication (Email/Password)
   - Firestore Database

4. Create a `.env` file in the root directory with your configuration:
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_JUDGE0_API_KEY=your_judge0_rapidapi_key
VITE_OPENAI_API_KEY=sk-...your_openai_api_key...
```

5. Start the development server:
```bash
npm run dev
```

## Project Structure

```
src/
  ├── components/     # Reusable components (Layout, PrivateRoute, AIPrompter)
  ├── contexts/       # React contexts (AuthContext)
  ├── pages/          # Page components (Login, Register, ForgotPassword, Dashboard, ProblemView)
  ├── config/         # Firebase configuration
  ├── App.tsx         # Main App component
  └── main.tsx        # Entry point
```

## Key Features & Implementation

- **Authentication:** Register, login, logout, email verification, and password reset (forgot password) using Firebase Auth.
- **Problem Viewing:** Problems are stored in Firestore and displayed in a dashboard. Each problem has a title, difficulty, description, and starter code.
- **Code Editor & Multi-Language Execution:** Uses Monaco Editor for a professional editing experience. Supports JavaScript, Python, Java, and C++ with syntax highlighting and backend execution via Judge0.
- **AI Prompter Sidebar:** Chat with an AI assistant (OpenAI GPT-4.1 Mini or GPT-4o). Supports code generation, analysis, and debugging. Output is rendered with markdown, code blocks, and copy buttons.
- **Markdown & Code Rendering:** AI output supports markdown formatting, syntax-highlighted code blocks, and copy-to-clipboard for code.
- **Chat History:** Full chat history is displayed in the sidebar, showing both user prompts and AI responses.
- **Error Handling:** Syntax and runtime errors are displayed in the preview window. Monaco provides inline syntax error highlighting.
- **Submission Storage:** User code submissions are saved to Firestore with user, problem, code, and timestamp.
- **Password Reset:** Users can request a password reset email from the login page.

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT