import { Navigate, Route, Routes } from 'react-router-dom'
import Nav from './components/Nav'
import Home from './pages/Home'
import Receipts from './pages/Receipts'
import Upload from './pages/Upload'
import Items from './pages/Items'
import ReceiptDetail from './pages/ReceiptDetail'
import Profile from './pages/Profile'

function App() {
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
