import { useState } from 'react'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { Navigate, Route, Routes, matchPath, useLocation } from 'react-router-dom'
import Nav from './components/Nav'
import Home from './pages/Home'
import Receipts from './pages/Receipts'
import Upload from './pages/Upload'
import Items from './pages/Items'
import GroceryList from './pages/GroceryList'
import ReceiptDetail from './pages/ReceiptDetail'
import Profile from './pages/Profile'
import { isSupabaseConfigured, supabase } from './supabase'

const AUTH_KEY = 'grocery_tracker_authed'
const CACHED_TAB_ROUTES = [
  { path: '/', Component: Home },
  { path: '/receipts', Component: Receipts },
  { path: '/upload', Component: Upload },
  { path: '/items', Component: Items },
  { path: '/grocery-list', Component: GroceryList },
]

function isCachedTabPath(pathname) {
  return CACHED_TAB_ROUTES.some(({ path }) => matchPath({ path, end: true }, pathname))
}

function CachedTabViews({ pathname }) {
  return (
    <>
      {CACHED_TAB_ROUTES.map((route) => {
        const isActive = Boolean(matchPath({ path: route.path, end: true }, pathname))
        return (
          <div
            key={route.path}
            style={{ display: isActive ? 'block' : 'none' }}
            aria-hidden={!isActive}
          >
            <route.Component />
          </div>
        )
      })}
    </>
  )
}

function App() {
  const location = useLocation()
  const [isAuthed, setIsAuthed] = useState(localStorage.getItem(AUTH_KEY) === 'true')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [unlocking, setUnlocking] = useState(false)

  async function handleUnlock(event) {
    event?.preventDefault()
    if (!isSupabaseConfigured) {
      setAuthError(
        'Supabase config missing. For local dev, restart after setting .env. For GitHub Pages, add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY as Actions secrets and redeploy.',
      )
      return
    }

    const normalizedPassword = password.trim()
    if (!normalizedPassword) {
      setAuthError('Enter your password.')
      return
    }

    setUnlocking(true)
    setAuthError('')
    try {
      const { data, error } = await supabase.functions.invoke('check-app-password', {
        body: { password: normalizedPassword },
      })

      if (error) {
        if (error instanceof FunctionsHttpError) {
          const details = await error.context.json().catch(() => ({}))
          setAuthError(details?.error || `Password check failed (HTTP ${error.context.status}).`)
        } else {
          setAuthError(error.message || 'Password check failed.')
        }
        return
      }

      if (!data?.valid) {
        setAuthError('Incorrect password.')
        return
      }

      localStorage.setItem(AUTH_KEY, 'true')
      setIsAuthed(true)
      setPassword('')
    } catch (unlockError) {
      setAuthError(
        unlockError instanceof Error && unlockError.message
          ? unlockError.message
          : 'Unable to verify password right now.',
      )
    } finally {
      setUnlocking(false)
    }
  }

  if (!isAuthed) {
    return (
      <div className="app-shell">
        <main className="app-content auth-wrap">
          <section className="panel auth-panel">
            <h1 className="page-title">grocery tracker</h1>
            <p className="empty-note">Enter your app password to unlock.</p>

            <form onSubmit={handleUnlock}>
              <label className="field">
                <span>Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>

              {authError && <p className="inline-error">{authError}</p>}

              <button type="submit" className="primary-button" disabled={unlocking}>
                {unlocking ? 'unlocking...' : 'unlock'}
              </button>
            </form>
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <main className="app-content">
        {isCachedTabPath(location.pathname) ? (
          <CachedTabViews pathname={location.pathname} />
        ) : (
          <Routes>
            <Route path="/profile" element={<Profile />} />
            <Route path="/receipts/:id" element={<ReceiptDetail />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>
      <Nav />
    </div>
  )
}

export default App
