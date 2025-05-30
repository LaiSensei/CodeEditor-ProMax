import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../config/firebase'
import { LiveError, LivePreview, LiveProvider } from 'react-live'
import { useAuth } from '../contexts/AuthContext'
import { useLoading } from '../contexts/LoadingContext'
import MonacoEditor from '@monaco-editor/react'
import AIPrompter from '../components/AIPrompter'
import { isCodeSafe, sanitizeCode } from '../utils/codeSanitizer'
import * as monaco from 'monaco-editor'

interface Problem {
  id: string
  title: string
  difficulty: string
  description: string
  initialCode: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function ProblemView() {
  const { id } = useParams<{ id: string }>()
  const [problem, setProblem] = useState<Problem | null>(null)
  const [code, setCode] = useState('')
  const { currentUser } = useAuth()
  const { setLoading, setLoadingMessage } = useLoading()
  const [submitStatus, setSubmitStatus] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [language, setLanguage] = useState('javascript')
  const [output, setOutput] = useState<string | null>(null)
  const [runError, setRunError] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [editorInstance, setEditorInstance] = useState<monaco.editor.IStandaloneCodeEditor | null>(null)
  const [pendingSuggestion, setPendingSuggestion] = useState<{
    type: 'insert' | 'replace',
    code: string,
    range?: monaco.Range
  } | null>(null)
  const [chat, setChat] = useState<Message[]>([])
  const [lastSuggestedCode, setLastSuggestedCode] = useState<string | null>(null)

  useEffect(() => {
    const fetchProblem = async () => {
      setLoading(true)
      setLoadingMessage('Loading problem...')
      try {
        if (!id) return
        const problemDoc = await getDoc(doc(db, 'problems', id))
        if (problemDoc.exists()) {
          const problemData = { id: problemDoc.id, ...problemDoc.data() } as Problem
          setProblem(problemData)
          setCode(problemData.initialCode)
        }
      } catch (error) {
        console.error('Error fetching problem:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchProblem()
  }, [id])

  // Only check code safety for warning, do not sanitize for live preview
  useEffect(() => {
    if (!isCodeSafe(code)) {
      setCodeError('Code contains potentially unsafe patterns and will not be rendered or submitted.')
    } else {
      setCodeError(null)
    }
  }, [code])

  const handleSubmit = async () => {
    if (!currentUser) {
      setSubmitStatus('You must be logged in to submit.')
      return
    }
    if (!isCodeSafe(code)) {
      setSubmitStatus('Submission blocked: code contains unsafe patterns.')
      return
    }
    try {
      setSubmitting(true)
      setSubmitStatus(null)
      // Only sanitize on submit
      const sanitizedCode = sanitizeCode(code, language)
      await addDoc(collection(db, 'submissions'), {
        userId: currentUser.uid,
        problemId: problem?.id,
        code: sanitizedCode,
        createdAt: serverTimestamp(),
      })
      setSubmitStatus('Submission saved!')
    } catch (error) {
      setSubmitStatus('Failed to save submission.')
      console.error(error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRun = async () => {
    setIsRunning(true)
    setOutput(null)
    setRunError(null)
    try {
      const JUDGE0_LANGUAGE_IDS: Record<string, number> = {
        javascript: 63,
        python: 71,
        java: 62,
        cpp: 54,
      }
      const language_id = JUDGE0_LANGUAGE_IDS[language]
      if (!language_id) {
        setRunError('Unsupported language')
        return
      }
      const response = await fetch('https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
          'X-RapidAPI-Key': import.meta.env.VITE_JUDGE0_API_KEY,
        },
        body: JSON.stringify({
          source_code: code,
          language_id,
        }),
      })
      const result = await response.json()
      if (result.stdout) setOutput(result.stdout)
      else if (result.stderr) setRunError(result.stderr)
      else if (result.compile_output) setRunError(result.compile_output)
      else if (result.message) setRunError(result.message)
      else setOutput('No output')
    } catch (err: any) {
      setRunError('Error running code')
    } finally {
      setIsRunning(false)
    }
  }

  // Handler to accept suggestion from AIPrompter
  function handleAISuggestion(suggestion: { type: 'insert' | 'replace', code: string, range?: monaco.Range }) {
    setPendingSuggestion(suggestion)
  }

  // Listen for new AI assistant messages and auto-trigger suggestion notification
  useEffect(() => {
    if (!editorInstance) return;
    if (chat.length === 0) return;
    const lastAI = [...chat].reverse().find((msg) => msg.role === 'assistant');
    if (!lastAI) return;
    // Extract code block
    const matches = Array.from(lastAI.content.matchAll(/```(?:[a-zA-Z]*)\n([\s\S]*?)```/g));
    if (matches.length === 0) return;
    const code = matches[matches.length - 1][1].trim();
    // Only trigger if not already pending and not already suggested
    if ((pendingSuggestion && pendingSuggestion.code === code) || lastSuggestedCode === code) return;
    // Determine intent: replace if selection, insert otherwise
    const selection = editorInstance.getSelection();
    if (selection && !selection.isEmpty()) {
      setPendingSuggestion({ type: 'replace', code, range: selection });
    } else {
      setPendingSuggestion({ type: 'insert', code });
    }
  }, [editorInstance, chat, pendingSuggestion, lastSuggestedCode]);

  if (!problem) {
    return <div className="text-center">Problem not found</div>
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <div className="flex-1 max-w-5xl ml-8 py-6 sm:px-4 lg:px-6">
        <div className="px-4 py-6 sm:px-0">
          {/* Description Card */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {problem.title}
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Difficulty: {problem.difficulty}
              </p>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
              <div className="prose max-w-none">
                <p>{problem.description}</p>
              </div>
            </div>
          </div>
          {/* Editor/Preview Grid */}
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Code Editor
                  </h3>
                  <div>
                    <label htmlFor="language-select" className="mr-2 font-medium">Language:</label>
                    <select
                      id="language-select"
                      value={language}
                      onChange={e => setLanguage(e.target.value)}
                      className="border rounded px-2 py-1"
                    >
                      <option value="javascript">JavaScript</option>
                      <option value="python">Python</option>
                      <option value="java">Java</option>
                      <option value="cpp">C++</option>
                    </select>
                  </div>
                </div>
                <MonacoEditor
                  height="500px"
                  language={language}
                  theme="vs-dark"
                  value={code}
                  onChange={(value) => setCode(value || '')}
                  options={{
                    fontSize: 14,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                  }}
                  onMount={(editor) => setEditorInstance(editor)}
                />
                {codeError && (
                  <div className="mt-2 text-red-600 text-sm">{codeError}</div>
                )}
                {/* Only show Run button for non-JS languages */}
                <div className="mt-4 flex flex-row">
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !!codeError}
                    className={`px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center justify-center ${submitting || codeError ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {submitting ? (
                      <>
                        <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span>
                        Submitting...
                      </>
                    ) : (
                      'Submit'
                    )}
                  </button>
                  <button
                    onClick={handleRun}
                    className="ml-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    disabled={isRunning}
                  >
                    {isRunning ? 'Running...' : 'Run'}
                  </button>
                </div>
                {submitStatus && (
                  <div className="mt-2 text-sm">
                    {submitStatus}
                  </div>
                )}
              </div>
            </div>
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Preview
                </h3>
                <div className="border rounded-lg p-4 min-h-[500px] flex flex-col">
                  {language === 'javascript' && (
                    <LiveProvider code={isCodeSafe(code) ? code : ''}>
                      <LivePreview />
                      <LiveError className="mt-2 text-red-600 whitespace-pre-wrap break-words w-full" />
                    </LiveProvider>
                  )}
                  {/* Always show output/error from Judge0 */}
                  {output && <pre className="whitespace-pre-wrap break-words">{output}</pre>}
                  {runError && <div className="text-red-600 whitespace-pre-wrap break-words">{runError}</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* AI Sidebar */}
      <div className="h-full">
        <AIPrompter
          editor={editorInstance}
          onAISuggestion={handleAISuggestion}
          chat={chat}
          setChat={setChat}
        />
      </div>
      {/* AI Suggestion Modal/Notification */}
      {pendingSuggestion && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full">
            <h2 className="text-lg font-semibold mb-2">AI Suggestion: {pendingSuggestion.type === 'insert' ? 'Insert' : 'Replace'}</h2>
            <pre className="bg-gray-900 text-white p-3 rounded mb-4 overflow-x-auto max-h-60 whitespace-pre-wrap break-words">
              {pendingSuggestion.code}
            </pre>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                onClick={() => {
                  if (!editorInstance) return;
                  if (pendingSuggestion.type === 'insert') {
                    editorInstance.trigger('ai', 'type', { text: pendingSuggestion.code });
                  } else if (pendingSuggestion.type === 'replace' && pendingSuggestion.range) {
                    editorInstance.executeEdits('ai', [{ range: pendingSuggestion.range, text: pendingSuggestion.code }]);
                  }
                  setLastSuggestedCode(pendingSuggestion.code);
                  setPendingSuggestion(null);
                }}
              >
                Accept
              </button>
              <button
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                onClick={() => {
                  setLastSuggestedCode(pendingSuggestion.code);
                  setPendingSuggestion(null);
                }}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 