import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { LoadingProvider } from './contexts/LoadingContext'
import PrivateRoute from './components/PrivateRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import Dashboard from './pages/Dashboard'
import ProblemView from './pages/ProblemView'

function App() {
  return (
    <Router>
      <AuthProvider>
        <LoadingProvider>
          <div className="min-h-screen bg-gray-100">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/problem/:id"
                element={
                  <PrivateRoute>
                    <Layout>
                      <ProblemView />
                    </Layout>
                  </PrivateRoute>
                }
              />
            </Routes>
          </div>
        </LoadingProvider>
      </AuthProvider>
    </Router>
  )
}

export default App 