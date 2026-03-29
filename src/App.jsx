import { useMemo, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Nav from './components/Nav'
import Home from './pages/Home'
import Receipts from './pages/Receipts'
import Upload from './pages/Upload'
import Items from './pages/Items'
import ReceiptDetail from './pages/ReceiptDetail'
import Profile from './pages/Profile'

const PASSWORD_KEY = 'grocery_tracker_password'
const AUTH_KEY = 'grocery_tracker_authed'

function App() {
  const hasPassword = useMemo(() => Boolean(localStorage.getItem(PASSWORD_KEY)), [])
  const [isAuthed, setIsAuthed] = useState(
    hasPassword && localStorage.getItem(AUTH_KEY) === 'true',
  )
  const [mode, setMode] = useState(hasPassword ? 'login' : 'setup')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [authError, setAuthError] = useState('')

  function completeAuth() {
    setIsAuthed(true)
    localStorage.setItem(AUTH_KEY, 'true')
    setAuthError('')
  }

  function handleSetupPassword() {
    if (!password || password.length < 4) {
      setAuthError('Use a password with at least 4 characters.')
      return
    }
    if (password !== confirmPassword) {
      setAuthError('Passwords do not match.')
      return
    }
    localStorage.setItem(PASSWORD_KEY, password)
    completeAuth()
  }

  function handleLogin() {
    const savedPassword = localStorage.getItem(PASSWORD_KEY)
    if (!savedPassword) {
      setMode('setup')
      return
    }
    if (password !== savedPassword) {
      setAuthError('Incorrect password.')
      return
    }
    completeAuth()
  }

  if (!isAuthed) {
    return (
      <div className="app-shell">
        <main className="app-content auth-wrap">
          <section className="panel auth-panel">
            <h1 className="page-title">grocery tracker</h1>
            <p className="empty-note">
              {mode === 'setup'
                ? 'Set a local password for this browser.'
                : 'Enter your password to unlock.'}
            </p>

            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            {mode === 'setup' && (
              <label className="field">
                <span>Confirm password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </label>
            )}

            {authError && <p className="inline-error">{authError}</p>}

            <button
              type="button"
              className="primary-button"
              onClick={mode === 'setup' ? handleSetupPassword : handleLogin}
            >
              {mode === 'setup' ? 'save password' : 'unlock'}
            </button>
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <main className="app-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/receipts" element={<Receipts />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/items" element={<Items />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/receipts/:id" element={<ReceiptDetail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Nav />
    </div>
  )
}

export default App
