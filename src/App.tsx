import './App.css'
import { useEffect, useRef, useState } from 'react'
import Home from './pages/Home'
import ReactionTime from './pages/ReactionTime'
import MemoryCards from './pages/MemoryCards'
import CatchStars from './pages/CatchStars'
import TicTacToe from './pages/TicTacToe'
import JungleWhackAMole from './pages/JungleWhackAMole'
import FashionDisaster from './pages/FashionDisaster'
import CatVsEverything from './pages/CatVsEverything'
import HillClimbChaos from './pages/HillClimbChaos'

type Page = 'home' | 'reaction' | 'memory' | 'stars' | 'tic-tac-toe' | 'monkeys' | 'fashion' | 'cat' | 'hill-climb'

const paths: Record<Page, string> = {
  home: '/',
  reaction: '/games/reaction-time',
  memory: '/games/memory-cards',
  stars: '/games/catch-the-stars',
  'tic-tac-toe': '/games/tic-tac-toe',
  monkeys: '/games/whack-a-monkey',
  fashion: '/games/fashion-disaster',
  cat: '/games/cat-vs-everything',
  'hill-climb': '/games/hill-climb-chaos',
}

function pageFromPath(pathname: string): Page {
  const match = (Object.keys(paths) as Page[]).find(page => paths[page] === pathname.replace(/\/$/, '') || paths[page] === pathname)
  return match ?? 'home'
}

function App() {
  const [page, setPage] = useState<Page>(() => pageFromPath(window.location.pathname))
  const currentPage = useRef(page)
  const returnToGames = useRef(false)

  useEffect(() => {
    if (!window.history.state?.presentPage) {
      window.history.replaceState({ presentPage: page, internal: false }, '', window.location.href)
    }
    const handlePopState = () => {
      const nextPage = pageFromPath(window.location.pathname)
      if (currentPage.current !== 'home' && nextPage === 'home') returnToGames.current = true
      currentPage.current = nextPage
      setPage(nextPage)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (page === 'home' && returnToGames.current) {
      returnToGames.current = false
      requestAnimationFrame(() => document.getElementById('games')?.scrollIntoView({ behavior: 'smooth' }))
    }
  }, [page])

  function navigate(nextPage: Page) {
    if (nextPage === currentPage.current) return
    window.history.pushState({ presentPage: nextPage, internal: true }, '', paths[nextPage])
    currentPage.current = nextPage
    setPage(nextPage)
  }

  function backToGames() {
    returnToGames.current = true
    if (window.history.state?.internal) {
      window.history.back()
      return
    }
    window.history.replaceState({ presentPage: 'home', internal: false }, '', paths.home)
    currentPage.current = 'home'
    setPage('home')
  }

  return (
    <div className="app-shell">
      {page === 'home' && <Home onReaction={() => navigate('reaction')} onMemory={() => navigate('memory')} onStars={() => navigate('stars')} onTicTacToe={() => navigate('tic-tac-toe')} onMonkeys={() => navigate('monkeys')} onFashion={() => navigate('fashion')} onCat={() => navigate('cat')} onHillClimb={() => navigate('hill-climb')} />}
      {page === 'reaction' && <ReactionTime onBack={backToGames} />}
      {page === 'memory' && <MemoryCards onBack={backToGames} />}
      {page === 'stars' && <CatchStars onBack={backToGames} />}
      {page === 'tic-tac-toe' && <TicTacToe onBack={backToGames} />}
      {page === 'monkeys' && <JungleWhackAMole onBack={backToGames} />}
      {page === 'fashion' && <FashionDisaster onBack={backToGames} />}
      {page === 'cat' && <CatVsEverything onBack={backToGames} />}
      {page === 'hill-climb' && <HillClimbChaos onBack={backToGames} />}
    </div>
  )
}

export default App
