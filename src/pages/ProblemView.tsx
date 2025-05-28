import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../config/firebase'
import { LiveProvider, LiveError, LivePreview } from 'react-live'
import { useAuth } from '../contexts/AuthContext'
import MonacoEditor from '@monaco-editor/react'

interface Problem {
  id: string
  title: string
  difficulty: string
  description: string
  initialCode: string
}

// Judge0 language IDs for supported languages
const JUDGE0_LANGUAGE_IDS: Record<string, number> = {
  javascript: 63, // JavaScript (Node.js)
  python: 71,     // Python (3.8.1)
  java: 62,       // Java (OpenJDK 13.0.1)
  cpp: 54,        // C++ (GCC 9.2.0)
}

const JUDGE0_API_KEY = import.meta.env.VITE_JUDGE0_API_KEY

async function runCodeWithJudge0(code: string, language: string): Promise<{ stdout?: string, stderr?: string, compile_output?: string, message?: string }> {
  const language_id = JUDGE0_LANGUAGE_IDS[language]
  if (!language_id) return { message: 'Unsupported language' }

  // Submit code for execution
  const response = await fetch('https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
      'X-RapidAPI-Key': JUDGE0_API_KEY,
    },
    body: JSON.stringify({
      source_code: code,
      language_id,
    }),
  })
  const result = await response.json()
  return result
}

export default function ProblemView() {
  const { id } = useParams<{ id: string }>()
  const [problem, setProblem] = useState<Problem | null>(null)
  const [loading, setLoading] = useState(true)
  const [code, setCode] = useState('')
  const { currentUser } = useAuth()
  const [submitStatus, setSubmitStatus] = useState<string | null>(null)
  const [language, setLanguage] = useState('javascript')
  const [output, setOutput] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    async function fetchProblem() {
      if (!id) return

      try {
        const problemDoc = await getDoc(doc(db, 'problems', id))
        if (problemDoc.exists()) {
          const problemData = { id: problemDoc.id, ...problemDoc.data() } as Problem
          setProblem(problemData)
          setCode(problemData.initialCode)
        }
      } catch (error) {
        console.error('Error fetching problem:', error)
      }
      setLoading(false)
    }

    fetchProblem()
  }, [id])

  const handleSubmit = async () => {
    if (!currentUser) {
      setSubmitStatus('You must be logged in to submit.')
      return
    }
    try {
      await addDoc(collection(db, 'submissions'), {
        userId: currentUser.uid,
        problemId: problem?.id,
        code,
        createdAt: serverTimestamp(),
      })
      setSubmitStatus('Submission saved!')
    } catch (error) {
      setSubmitStatus('Failed to save submission.')
      console.error(error)
    }
  }

  const handleRun = async () => {
    setIsRunning(true)
    setOutput(null)
    try {
      const result = await runCodeWithJudge0(code, language)
      if (result.stdout) setOutput(result.stdout)
      else if (result.stderr) setOutput(result.stderr)
      else if (result.compile_output) setOutput(result.compile_output)
      else if (result.message) setOutput(result.message)
      else setOutput('No output')
    } catch (err) {
      setOutput('Error running code')
    }
    setIsRunning(false)
  }

  if (loading) {
    return <div className="text-center">Loading problem...</div>
  }

  if (!problem) {
    return <div className="text-center">Problem not found</div>
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
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

          <LiveProvider code={code}>
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
                  />
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={handleSubmit}
                      className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                    >
                      Submit
                    </button>
                    <button
                      onClick={handleRun}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
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
                  <div className="border rounded-lg p-4 min-h-[500px]">
                    {language === 'javascript' && (
                      <>
                        <LivePreview />
                        <LiveError className="mt-2 text-red-600" />
                      </>
                    )}
                    {output && (
                      <div className="mt-4 p-3 bg-gray-900 text-white rounded">
                        <div className="font-semibold mb-1">Output:</div>
                        <pre className="whitespace-pre-wrap break-words">{output}</pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </LiveProvider>
        </div>
      </div>
    </div>
  )
} 