import './App.css'
import Home from './pages/Home'
import { useEffect, useRef, useState } from 'react'
import ReactionTime from './pages/ReactionTime'
import MemoryCards from './pages/MemoryCards'

function App() {
  const [page, setPage] = useState<'home' | 'reaction' | 'memory'>('home')
  const returnToGames = useRef(false)

  useEffect(() => {
    if (page === 'home' && returnToGames.current) {
      returnToGames.current = false
      document.getElementById('games')?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [page])

  function backToGames() {
    returnToGames.current = true
    setPage('home')
  }

  return (
    <div className="app-shell">
      {page === 'home' && <Home onReaction={() => setPage('reaction')} onMemory={() => setPage('memory')} />}
      {page === 'reaction' && <ReactionTime onBack={backToGames} />}
      {page === 'memory' && <MemoryCards onBack={backToGames} />}
    </div>
  )
}

export default App
