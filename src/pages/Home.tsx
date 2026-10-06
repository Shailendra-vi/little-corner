import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowDown, ArrowRight, CircleDot, Gamepad2, Gem, Leaf, PawPrint, Sparkles, Star, Zap, Gauge } from 'lucide-react'
import HomeScene from '../components/HomeScene'
import { getHomeTimeTheme } from '../utils/homeTimeTheme'

const userName = import.meta.env.VITE_USER_NAME || 'Friend'

export default function Home({ onReaction, onMemory, onStars, onTicTacToe, onMonkeys, onFashion, onCat, onHillClimb, onCleanRoom }: { onReaction: () => void; onMemory: () => void; onStars: () => void; onTicTacToe: () => void; onMonkeys: () => void; onFashion: () => void; onCat: () => void; onHillClimb: () => void; onCleanRoom: () => void }) {
  const [timeTheme, setTimeTheme] = useState(getHomeTimeTheme)

  useEffect(() => {
    const interval = window.setInterval(() => setTimeTheme(getHomeTimeTheme()), 60_000)
    return () => window.clearInterval(interval)
  }, [])

  const timeLabel = timeTheme === 'dawn' ? 'FIRST LIGHT' : timeTheme === 'day' ? 'AFTERNOON GLOW' : timeTheme === 'sunset' ? 'SUNSET HOURS' : 'MOONLIT HOURS'

  return (
    <main className={`home-experience home-time-${timeTheme}`}>
      <div className="home-atmosphere" aria-hidden="true" />
      <header className="home-header">
        <div className="home-brand"><span className="home-brand-icon"><Sparkles size={15} /></span><span>FOR {userName.toUpperCase()}</span></div>
        <span className="home-edition">{timeLabel}</span>
      </header>

      <section className="home-hero" aria-labelledby="home-title">
        <HomeScene theme={timeTheme} />
        <div className="hero-copy">
          <motion.div className="hero-kicker" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .6 }}>
            <span className="kicker-line" /> A CORNER OF THE INTERNET <span className="kicker-line" />
          </motion.div>
          <motion.h1 id="home-title" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .75, delay: .08 }}>
            Hey, <span>{userName}.</span>
          </motion.h1>
          <motion.p className="hero-description" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .65, delay: .2 }}>
            A small place to play, make things, and see what happens. No agenda required.
          </motion.p>
          <motion.a className="scroll-prompt" href="#games" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .6 }}>
            <span>SCROLL TO WANDER</span><ArrowDown size={14} />
          </motion.a>
        </div>

      </section>

      <section className="games-section" id="games" aria-labelledby="games-title">
        <div className="games-heading">
          <div>
            <div className="eyebrow"><Gamepad2 size={14} /> THE PLAYROOM</div>
            <h2 id="games-title">A little friendly<br /><span>competition.</span></h2>
          </div>
          <p>Pick one, take your time.<br />There’s no score to prove.</p>
        </div>

        <div className="games-grid">
          <button className="game-card reaction-card" type="button" onClick={onReaction}>
            <span className="game-card-top"><span className="game-icon reaction-icon"><Zap size={18} /></span><span className="game-index">GAME 01</span></span>
            <span className="game-card-title">Reaction Time</span>
            <span className="game-card-description">Wait for the signal. Trust your reflexes.</span>
            <span className="game-card-bottom"><span>3 ROUNDS · QUICK PLAY</span><span className="game-arrow"><ArrowRight size={16} /></span></span>
          </button>
          <button className="game-card memory-card" type="button" onClick={onMemory}>
            <span className="game-card-top"><span className="game-icon memory-icon"><span className="mini-grid"><i /><i /><i /><i /></span></span><span className="game-index">GAME 02</span></span>
            <span className="game-card-title">Memory Cards</span>
            <span className="game-card-description">Find the pairs. See how many turns it takes.</span>
            <span className="game-card-bottom"><span>8 PAIRS · MATCH THEM ALL</span><span className="game-arrow"><ArrowRight size={16} /></span></span>
          </button>
          <button className="game-card stars-card" type="button" onClick={onStars}>
            <span className="game-card-top"><span className="game-icon stars-icon"><Star size={17} /></span><span className="game-index">GAME 03</span></span>
            <span className="game-card-title">Catch the Stars</span>
            <span className="game-card-description">Move the catcher. See how many you can collect.</span>
            <span className="game-card-bottom"><span>30 SECONDS · CATCH & COLLECT</span><span className="game-arrow"><ArrowRight size={16} /></span></span>
          </button>
          <button className="game-card tic-card" type="button" onClick={onTicTacToe}>
            <span className="game-card-top"><span className="game-icon tic-icon"><CircleDot size={18} /></span><span className="game-index">GAME 04</span></span>
            <span className="game-card-title">Tic-Tac-Toe</span>
            <span className="game-card-description">Line up three. Play solo or pass it across.</span>
            <span className="game-card-bottom"><span>ONE QUICK MATCH · X VS O</span><span className="game-arrow"><ArrowRight size={16} /></span></span>
          </button>
          <button className="game-card jungle-card" type="button" onClick={onMonkeys}>
            <span className="game-card-top"><span className="game-icon jungle-icon"><Leaf size={18} /></span><span className="game-index">GAME 05</span></span>
            <span className="game-card-title">Whack-a-Monkey</span>
            <span className="game-card-description">Catch the cheeky monkeys before they duck away.</span>
            <span className="game-card-bottom"><span>30 SECONDS · QUICK HANDS</span><span className="game-arrow"><ArrowRight size={16} /></span></span>
          </button>
          <button className="game-card fashion-card" type="button" onClick={onFashion}>
            <span className="game-card-top"><span className="game-icon fashion-icon"><Gem size={18} /></span><span className="game-index">GAME 06</span></span>
            <span className="game-card-title">Fashion Disaster</span>
            <span className="game-card-description">Catch the right pieces. Style the event. Face the verdict.</span>
            <span className="game-card-bottom"><span>60 SECONDS · DRESS THE BRIEF</span><span className="game-arrow"><ArrowRight size={16} /></span></span>
          </button>
          <button className="game-card cat-card" type="button" onClick={onCat}>
            <span className="game-card-top"><span className="game-icon cat-icon"><PawPrint size={18} /></span><span className="game-index">GAME 07</span></span>
            <span className="game-card-title">Cat vs Everything</span>
            <span className="game-card-description">One cat, nine hazards, and a very questionable cucumber.</span>
            <span className="game-card-bottom"><span>ENDLESS SURVIVAL · COLLECT FISH</span><span className="game-arrow"><ArrowRight size={16} /></span></span>
          </button>
          <button className="game-card hill-card" type="button" onClick={onHillClimb}>
            <span className="game-card-top"><span className="game-icon hill-icon"><Gauge size={18} /></span><span className="game-index">GAME 08</span></span>
            <span className="game-card-title">Hill Climb: Chaos Edition</span>
            <span className="game-card-description">Steep roads, ridiculous rides, and very questionable landings.</span>
            <span className="game-card-bottom"><span>ENDLESS DRIVE · COLLECT & UPGRADE</span><span className="game-arrow"><ArrowRight size={16} /></span></span>
          </button>
          <button className="game-card clean-room-card" type="button" onClick={onCleanRoom}>
            <span className="game-card-top"><span className="game-icon clean-room-icon"><Sparkles size={18} /></span><span className="game-index">GAME 09</span></span>
            <span className="game-card-title">Clean Your Room</span>
            <span className="game-card-description">Sort the chaos before Mom comes back.</span>
            <span className="game-card-bottom"><span>90 SECONDS · TIDY UP</span><span className="game-arrow"><ArrowRight size={16} /></span></span>
          </button>
        </div>
        <p className="games-note">More little games will find their way here.</p>
      </section>
      <footer className="home-footer"><span>MADE FOR {userName.toUpperCase()}</span><span>TAKE YOUR TIME <span aria-hidden="true">✳</span></span></footer>
    </main>
  )
}
