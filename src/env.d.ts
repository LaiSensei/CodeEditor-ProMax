/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  readonly VITE_JUDGE0_API_KEY: string
  readonly VITE_OPENAI_API_KEY: string
  readonly VITE_OPENAI_MODEL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module 'react-syntax-highlighter';
declare module 'react-syntax-highlighter/dist/esm/styles/prism'; 