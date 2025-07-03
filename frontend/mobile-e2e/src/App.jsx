import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import SignUp from './pages/SignUp'
import Login from './pages/Login'
import Applications from './pages/Applications'
import ApplicationDetails from './pages/ApplicationDetails'
import { Toaster } from 'react-hot-toast';


import useAuthStore from './store/authStore'
import { useEffect } from 'react'

function AuthenticatedRoute({ children }) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const checkAuth = useAuthStore(state => state.checkAuth)

  useEffect(() => {
    const verifyAuth = async () => {
      await checkAuth()
    }
    verifyAuth()
  }, [checkAuth])


  return isAuthenticated ? children : <Navigate to="/login" />
}

function PublicRoute({ children }) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  return isAuthenticated ? <Navigate to="/" /> : children
}

function App() {
  const checkAuth = useAuthStore(state => state.checkAuth)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <Router>
      <Routes>
        {/* Public routes - no layout wrapper */}
        <Route 
          path="/signup" 
          element={
            <PublicRoute>
              <SignUp />
            </PublicRoute>
          } 
        />
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />

        {/* Protected routes - with layout wrapper */}
        <Route
          path="/"
          element={
            <AuthenticatedRoute>
              <Layout>
                <Home />
              </Layout>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/applications"
          element={
            <AuthenticatedRoute>
              <Layout>
                <Applications />
              </Layout>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/applications/:id"
          element={
            <AuthenticatedRoute>
              <Layout>
                <ApplicationDetails />
                <Toaster 
                  position="bottom-right"
                  reverseOrder={false}
                />
              </Layout>
            </AuthenticatedRoute>
          }
        />
      </Routes>
    </Router>
  )
}

export default App