import { motion } from 'framer-motion'
import { ArrowDown, ArrowRight, Gamepad2, Sparkles, Zap } from 'lucide-react'

const userName = import.meta.env.VITE_USER_NAME || 'Friend'

export default function Home({ onReaction, onMemory }: { onReaction: () => void; onMemory: () => void }) {
  return (
    <main className="home-experience">
      <div className="home-atmosphere" aria-hidden="true" />
      <header className="home-header">
        <div className="home-brand"><span className="home-brand-icon"><Sparkles size={15} /></span><span>FOR {userName.toUpperCase()}</span></div>
        <span className="home-edition">A LITTLE SOMETHING</span>
      </header>

      <section className="home-hero" aria-labelledby="home-title">
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

        <motion.div className="artifact-scene" aria-hidden="true" initial={{ opacity: 0, scale: .88 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, delay: .18 }}>
          <div className="artifact-halo" />
          <div className="artifact-orbit orbit-one"><i /></div>
          <div className="artifact-orbit orbit-two"><i /></div>
          <div className="artifact-orb"><span className="orb-glint" /><span className="orb-core" /></div>
          <div className="artifact-chip chip-spark"><Sparkles size={15} /></div>
          <div className="artifact-chip chip-dot"><span /></div>
          <div className="artifact-ground" />
        </motion.div>

        <div className="hero-index"><span>01</span><i /> A FEW THINGS TO DISCOVER</div>
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
        </div>
        <p className="games-note">More little games will find their way here.</p>
      </section>
      <footer className="home-footer"><span>MADE FOR {userName.toUpperCase()}</span><span>TAKE YOUR TIME <span aria-hidden="true">✳</span></span></footer>
    </main>
  )
}
