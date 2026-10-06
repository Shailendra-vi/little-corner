import './App.css'
import Home from './pages/Home'
import Explore from './pages/Explore'
import { useState } from 'react'
import ReactionTime from './pages/ReactionTime'

function App() {
  const [page, setPage] = useState<'home' | 'explore' | 'reaction'>('home')

  return (
    <div className="app-shell">
      {page === 'home' && <Home onExplore={() => setPage('explore')} />}
      {page === 'explore' && <Explore onHome={() => setPage('home')} onPlay={() => setPage('reaction')} />}
      {page === 'reaction' && <ReactionTime onBack={() => setPage('explore')} />}
    </div>
  )
}

export default App
