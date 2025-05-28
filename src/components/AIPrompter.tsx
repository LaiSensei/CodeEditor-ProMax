import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type * as monaco from 'monaco-editor';

const MODELS = [
  { label: 'GPT-4.1 Mini', value: 'gpt-4.1-mini' },
  { label: 'GPT-4o', value: 'gpt-4o' },
];

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

async function fetchOpenAICompletion(prompt: string, model: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a helpful coding assistant.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 512,
      temperature: 0.2,
    }),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'No response from AI.';
}

interface AIPrompterProps {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  onAISuggestion?: (suggestion: { type: 'insert' | 'replace', code: string, range?: monaco.Range }) => void;
  chat: { role: 'user' | 'assistant', content: string }[];
  setChat: React.Dispatch<React.SetStateAction<{ role: 'user' | 'assistant', content: string }[]>>;
}

export default function AIPrompter({ editor, onAISuggestion, chat, setChat }: AIPrompterProps) {
  const [model, setModel] = useState('gpt-4.1-mini');
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [width, setWidth] = useState(400); // px
  const minWidth = 320;
  const maxWidth = 700;
  const isResizing = useRef(false);
  const [atBottom, setAtBottom] = useState(true);
  const userPromptCount = chat.filter(msg => msg.role === 'user').length;
  const [selectionVersion, setSelectionVersion] = useState(0);

  // Handle drag to resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = Math.min(Math.max(window.innerWidth - e.clientX, minWidth), maxWidth);
      setWidth(newWidth);
    };
    const handleMouseUp = () => {
      isResizing.current = false;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleSend = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    // Add user message to chat
    setChat(prev => [...prev, { role: 'user', content: prompt }]);
    try {
      const result = await fetchOpenAICompletion(prompt, model);
      setChat(prev => [...prev, { role: 'assistant', content: result }]);
    } catch (err: any) {
      setChat(prev => [...prev, { role: 'assistant', content: 'Error: ' + (err?.message || 'Failed to fetch AI response.') }]);
    }
    setPrompt('');
    setIsLoading(false);
  };

  // Custom renderer for code blocks with copy button
  function CodeBlock({ node, inline, className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || '');
    const code = String(children).replace(/\n$/, '');
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    };
    return !inline && match ? (
      <div className="relative group">
        <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" {...props}>
          {code}
        </SyntaxHighlighter>
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 bg-gray-700 text-white text-xs px-2 py-1 rounded opacity-80 group-hover:opacity-100"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    ) : (
      <code className={className} {...props}>{children}</code>
    );
  }

  // Scroll to bottom when aiResponse changes
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
      // Show scroll button if content overflows
      setShowScrollButton(outputRef.current.scrollHeight > outputRef.current.clientHeight + 10);
    }
  }, [chat]);

  // Update atBottom state on scroll
  useEffect(() => {
    const ref = outputRef.current;
    if (!ref) return;
    const handleScroll = () => {
      setAtBottom(ref.scrollHeight - ref.scrollTop - ref.clientHeight < 10);
    };
    ref.addEventListener('scroll', handleScroll);
    return () => ref.removeEventListener('scroll', handleScroll);
  }, []);

  // Helper to extract the latest code block from the last AI message
  function getLastCodeBlock() {
    const lastAI = [...chat].reverse().find(msg => msg.role === 'assistant');
    if (!lastAI) return '';
    // Match all code blocks (robust)
    const matches = Array.from(lastAI.content.matchAll(/```(?:[a-zA-Z]*)\n([\s\S]*?)```/g));
    return matches.length > 0 ? matches[matches.length - 1][1].trim() : '';
  }

  // Insert code at cursor
  function handleInsert() {
    if (!editor) return;
    const code = getLastCodeBlock();
    if (!code) return;
    editor.trigger('ai', 'type', { text: code });
  }

  // Replace selected code
  function handleReplace() {
    if (!editor) return;
    const code = getLastCodeBlock();
    if (!code) return;
    const selection = editor.getSelection();
    if (!selection || selection.isEmpty()) return;
    editor.executeEdits('ai', [{ range: selection, text: code }]);
  }

  // Helper to check if there is a non-empty selection
  function hasNonEmptySelection() {
    if (!editor) return false;
    const selection = editor.getSelection();
    return selection && !selection.isEmpty();
  }

  useEffect(() => {
    if (!editor) return;
    const disposable = editor.onDidChangeCursorSelection(() => {
      setSelectionVersion(v => v + 1); // force re-render
    });
    return () => disposable && disposable.dispose();
  }, [editor]);

  return (
    <aside
      className="flex flex-col border-l bg-white p-4 fixed right-0 z-20 border-t"
      style={{
        width: width + 'px',
        top: '64px',
        height: 'calc(100vh - 64px)',
        borderTopWidth: '2px',
        borderTopColor: '#e5e7eb',
        transition: isResizing.current ? 'none' : 'width 0.1s',
        userSelect: isResizing.current ? 'none' : 'auto',
      }}
    >
      {/* Drag handle */}
      <div
        className="absolute left-0 top-0 h-full w-2 cursor-ew-resize z-30 bg-transparent hover:bg-gray-200"
        style={{ marginLeft: '-8px' }}
        onMouseDown={e => {
          e.preventDefault();
          isResizing.current = true;
        }}
      />
      <div className="flex items-center mb-4">
        <span className="font-semibold mr-2">AI Model:</span>
        <select
          value={model}
          onChange={e => setModel(e.target.value)}
          className="border rounded px-2 py-1"
        >
          {MODELS.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>
      <div className="flex-1 relative mb-4 bg-gray-50 rounded p-2 overflow-y-auto" ref={outputRef} style={{ maxHeight: 'calc(100vh - 220px)' }}>
        {/* Chat/response area */}
        {chat.length === 0 ? (
          <div className="text-gray-400">AI responses will appear here.</div>
        ) : (
          chat.map((msg, idx) => (
            <div key={idx} className={
              msg.role === 'user'
                ? 'mb-4 text-right'
                : 'mb-4 text-left'
            }>
              <div className={
                msg.role === 'user'
                  ? 'inline-block bg-indigo-100 text-indigo-900 px-3 py-2 rounded-lg'
                  : 'inline-block bg-white border px-3 py-2 rounded-lg shadow'
              }>
                {msg.role === 'user' ? (
                  <span className="font-semibold">You: </span>
                ) : (
                  <span className="font-semibold text-indigo-700">AI: </span>
                )}
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code: CodeBlock,
                    strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc ml-6" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal ml-6" {...props} />,
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>
            </div>
          ))
        )}
        {userPromptCount >= 3 && !atBottom && (
          <div className="absolute left-1/2 bottom-0 -translate-x-1/2 mb-2 flex justify-center w-full pointer-events-none">
            <button
              className="bg-gray-300 hover:bg-gray-400 text-xs px-3 py-1 rounded shadow pointer-events-auto"
              onClick={() => {
                if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
              }}
            >
              Scroll to bottom
            </button>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <textarea
          className="border rounded p-2 resize-none"
          rows={3}
          placeholder="Type your prompt for the AI..."
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
        />
        <button
          className="bg-indigo-600 text-white rounded px-4 py-2 hover:bg-indigo-700 disabled:opacity-50"
          onClick={handleSend}
          disabled={isLoading || !prompt.trim()}
        >
          {isLoading ? 'Thinking...' : 'Send'}
        </button>
        {/* Placeholder for Insert/Replace buttons */}
        <div className="flex gap-2 mt-2">
          <button
            className="bg-green-600 text-white rounded px-3 py-1"
            onClick={handleInsert}
            disabled={!editor || !getLastCodeBlock()}
          >
            Insert
          </button>
          <button
            className="bg-blue-600 text-white rounded px-3 py-1"
            onClick={handleReplace}
            disabled={!editor || !getLastCodeBlock() || !hasNonEmptySelection()}
          >
            Replace
          </button>
        </div>
      </div>
    </aside>
  );
} 