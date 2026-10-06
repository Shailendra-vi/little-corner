import { motion } from 'framer-motion'
import { ArrowLeft, Compass, Eye, Gamepad2, Palette, Sparkles, WandSparkles } from 'lucide-react'

const areas = [
  { number: '01', name: 'Play', description: 'Quick games for a change of pace.', icon: Gamepad2, accent: 'violet' },
  { number: '02', name: 'Discover', description: 'A few choices, a profile that takes shape.', icon: Eye, accent: 'blue' },
  { number: '03', name: 'Create', description: 'Make a small thing that feels like yours.', icon: Palette, accent: 'pink' },
  { number: '04', name: 'Vibe', description: 'Set the scene and see what turns up.', icon: WandSparkles, accent: 'amber' },
]

export default function Explore({ onHome, onPlay }: { onHome: () => void; onPlay: () => void }) {
  return (
    <main className="explore-page">
      <div className="explore-glow" aria-hidden="true" />
      <header className="explore-header">
        <button className="back-button" onClick={onHome} type="button">
          <ArrowLeft size={16} /> <span>Back</span>
        </button>
        <div className="brand-mark"><Sparkles size={15} /><span>A LITTLE CORNER</span></div>
      </header>

      <section className="explore-content" aria-labelledby="explore-title">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <div className="eyebrow"><Compass size={14} /> YOUR SPACE</div>
          <h1 id="explore-title">Where to<br /><span>first?</span></h1>
          <p className="explore-intro">A few little corners to wander into. Pick whatever catches your eye.</p>
        </motion.div>

        <div className="area-grid">
          {areas.map(({ number, name, description, icon: Icon, accent }, index) => (
            <motion.div
              className="area-motion"
              key={name}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08 * index }}
            >
              {name === 'Play' ? (
                <button className={`area-card area-card-button accent-${accent}`} onClick={onPlay} type="button" aria-label="Open Play: Reaction Time">
                  <div className="area-card-top"><div className="area-icon"><Icon size={19} strokeWidth={1.7} /></div><span className="area-number">{number}</span></div>
                  <div><h2>{name}</h2><p>{description}</p></div>
                  <span className="play-hint">PLAY REACTION TIME <span aria-hidden="true">↗</span></span>
                </button>
              ) : (
                <article className={`area-card accent-${accent}`}>
                  <div className="area-card-top"><div className="area-icon"><Icon size={19} strokeWidth={1.7} /></div><span className="area-number">{number}</span></div>
                  <div><h2>{name}</h2><p>{description}</p></div>
                </article>
              )}
            </motion.div>
          ))}
        </div>
        <p className="explore-footnote">No plan needed. You can always come back.</p>
      </section>
    </main>
  )
}
