import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, RotateCcw, Sparkles } from 'lucide-react'
import GameAmbience from '../components/GameAmbience'

type Mark = 'X' | 'O' | null
type Outcome = 'X' | 'O' | 'draw' | null
type GameState = 'ready' | 'playing' | 'done'
type Mode = 'computer' | 'two-player'

const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]]

function winnerOf(board: Mark[]): Mark {
  for (const [a, b, c] of lines) if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a]
  return null
}

function computerMove(board: Mark[]): number {
  const tacticalMove = (mark: Exclude<Mark, null>) => lines.find(line => line.filter(index => board[index] === mark).length === 2 && line.some(index => board[index] === null))?.find(index => board[index] === null)
  const winningMove = tacticalMove('O')
  if (winningMove !== undefined) return winningMove
  const blockingMove = tacticalMove('X')
  if (blockingMove !== undefined) return blockingMove
  if (board[4] === null) return 4
  const corners = [0, 2, 6, 8].filter(index => board[index] === null)
  if (corners.length) return corners[Math.floor(Math.random() * corners.length)]
  const open = board.flatMap((mark, index) => mark === null ? [index] : [])
  return open[Math.floor(Math.random() * open.length)]
}

export default function TicTacToe({ onBack }: { onBack: () => void }) {
  const [board, setBoard] = useState<Mark[]>(Array(9).fill(null))
  const [state, setState] = useState<GameState>('ready')
  const [turn, setTurn] = useState<'X' | 'O'>('X')
  const [mode, setMode] = useState<Mode>('computer')
  const [outcome, setOutcome] = useState<Outcome>(null)
  const [record, setRecord] = useState({ you: 0, computer: 0, playerOne: 0, playerTwo: 0, computerDraws: 0, playerDraws: 0 })

  function chooseMode(nextMode: Mode) {
    setMode(nextMode)
    setBoard(Array(9).fill(null))
    setOutcome(null)
    setTurn('X')
    setState('ready')
  }

  function startGame() {
    setBoard(Array(9).fill(null))
    setOutcome(null)
    setTurn('X')
    setState('playing')
  }

  function finish(nextBoard: Mark[], winner: Mark) {
    setBoard(nextBoard)
    setOutcome(winner ?? 'draw')
    setState('done')
    setRecord(current => mode === 'computer'
      ? winner === 'X' ? { ...current, you: current.you + 1 }
        : winner === 'O' ? { ...current, computer: current.computer + 1 }
          : { ...current, computerDraws: current.computerDraws + 1 }
      : winner === 'X' ? { ...current, playerOne: current.playerOne + 1 }
        : winner === 'O' ? { ...current, playerTwo: current.playerTwo + 1 }
          : { ...current, playerDraws: current.playerDraws + 1 })
  }

  function play(index: number) {
    if (state !== 'playing' || (mode === 'computer' && turn === 'O') || board[index]) return
    const nextBoard = [...board]
    nextBoard[index] = turn
    const winner = winnerOf(nextBoard)
    if (winner || nextBoard.every(Boolean)) finish(nextBoard, winner)
    else {
      setBoard(nextBoard)
      setTurn(turn === 'X' ? 'O' : 'X')
    }
  }

  useEffect(() => {
    if (state !== 'playing' || mode !== 'computer' || turn !== 'O') return
    const timer = window.setTimeout(() => {
      const index = computerMove(board)
      if (index === undefined) return
      const nextBoard = [...board]
      nextBoard[index] = 'O'
      const winner = winnerOf(nextBoard)
      if (winner || nextBoard.every(Boolean)) finish(nextBoard, winner)
      else {
        setBoard(nextBoard)
        setTurn('X')
      }
    }, 560)
    return () => window.clearTimeout(timer)
  }, [board, mode, state, turn])

  const status = state === 'ready' ? 'A little strategy.'
    : state === 'done' ? outcome === 'X' ? mode === 'computer' ? 'You got three.' : 'Player 1 got three.' : outcome === 'O' ? mode === 'computer' ? 'The computer got three.' : 'Player 2 got three.' : 'A neat little draw.'
      : mode === 'computer' ? turn === 'X' ? 'Your move.' : 'Computer is thinking…' : `Player ${turn === 'X' ? '1' : '2'}’s move.`

  return (
    <main className="explore-page game-page tic-page">
      <div className="explore-glow" aria-hidden="true" />
      <GameAmbience kind="tic-tac-toe" />
      <header className="explore-header">
        <button className="back-button" onClick={onBack} type="button"><ArrowLeft size={16} /><span>Back to games</span></button>
        <div className="brand-mark"><Sparkles size={14} /><span>PLAY / 04</span></div>
      </header>

      <section className="game-content tic-content" aria-labelledby="tic-title">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .4 }}>
          <div className="eyebrow"><span className="tic-mark-small">× ○</span> TIC-TAC-TOE</div>
          <h1 id="tic-title" className="game-title">Three in a row.<br /><span>A little game by the tide.</span></h1>
          <p className="explore-intro">Salt air, slow waves, one clever line. Take a turn and see what happens.</p>
          <div className="tic-mode-picker" role="group" aria-label="Choose who to play with">
            <span>PLAY WITH</span>
            <button type="button" aria-pressed={mode === 'computer'} className={mode === 'computer' ? 'is-selected' : ''} onClick={() => chooseMode('computer')}>Computer <small>DEFAULT</small></button>
            <button type="button" aria-pressed={mode === 'two-player'} className={mode === 'two-player' ? 'is-selected' : ''} onClick={() => chooseMode('two-player')}>Two players</button>
          </div>
          <p className="tic-beach-hint">On the shore, pick up an X or O and flick it skyward.</p>
        </motion.div>

        <div className="tic-layout">
          <div className="tic-board-wrap">
            <div className="tic-board" role="group" aria-label="Tic-tac-toe board" data-game-surface>
              {board.map((mark, index) => (
                <button key={index} type="button" className={`tic-cell ${mark ? `tic-cell-${mark.toLowerCase()}` : ''}`} onClick={() => play(index)} disabled={state !== 'playing' || (mode === 'computer' && turn === 'O') || Boolean(mark)} aria-label={`Row ${Math.floor(index / 3) + 1}, column ${index % 3 + 1}${mark ? `: ${mark}` : ': empty'}`}>
                  {mark && <span aria-hidden="true">{mark}</span>}
                </button>
              ))}
              {state !== 'playing' && (
                <div className="tic-overlay">
                  <span className="tic-orbit-mark" aria-hidden="true">{state === 'done' && outcome ? outcome === 'draw' ? '✦' : outcome : '×○'}</span>
                  <strong>{state === 'ready' ? 'Ready when you are?' : status}</strong>
                  <span>{state === 'ready' ? mode === 'computer' ? 'You are X. The computer is O.' : 'Player 1 is X. Player 2 is O.' : 'Want another round?'}</span>
                  <button type="button" onClick={startGame}>{state === 'ready' ? 'Start a round' : <><RotateCcw size={14} /> Play again</>}</button>
                </div>
              )}
            </div>
            <div className="tic-status" aria-live="polite"><span className={`turn-orb ${turn === 'X' ? 'turn-x' : 'turn-o'}`} />{status}<span className="tic-move-count">{board.filter(Boolean).length} / 9</span></div>
          </div>

          <aside className="score-panel tic-stats" aria-label="Match stats">
            <div className="score-heading">YOUR SERIES</div>
            <div className="tic-stat-main">{mode === 'computer' ? 'You vs computer' : 'Local two player'}</div>
            <div className="score-row"><span>{mode === 'computer' ? 'Your wins' : 'Player 1'}</span><strong>{mode === 'computer' ? record.you : record.playerOne}</strong></div>
            <div className="score-row"><span>{mode === 'computer' ? 'Computer' : 'Player 2'}</span><strong>{mode === 'computer' ? record.computer : record.playerTwo}</strong></div>
            <div className="score-row"><span>Draws</span><strong>{mode === 'computer' ? record.computerDraws : record.playerDraws}</strong></div>
            <p className="tic-tip">Pick up an X or O on the beach and toss it. Your pieces land with a little gravity.</p>
          </aside>
        </div>
        <p className="game-disclaimer">Just a small local match. Nothing is saved.</p>
      </section>
    </main>
  )
}
