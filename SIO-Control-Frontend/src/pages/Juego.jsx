import { useState, useEffect, useCallback, useRef } from 'react'
import { RotateCcw, Trophy, Play } from 'lucide-react'

const GRID = 20
const CELL = 20
const SPEED_INITIAL = 150
const SPEED_MIN = 60

const initialSnake = [{ x: 10, y: 10 }]
const initialFood = { x: 15, y: 10 }

function randomFood(snake) {
  let pos
  do {
    pos = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) }
  } while (snake.some((s) => s.x === pos.x && s.y === pos.y))
  return pos
}

const Direction = { UP: 'UP', DOWN: 'DOWN', LEFT: 'LEFT', RIGHT: 'RIGHT' }

export default function Juego() {
  const [snake, setSnake] = useState(initialSnake)
  const [food, setFood] = useState(initialFood)
  const [dir, setDir] = useState(Direction.RIGHT)
  const [gameOver, setGameOver] = useState(false)
  const [running, setRunning] = useState(false)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem('sio-snake-hs') || 0))
  const [speed, setSpeed] = useState(SPEED_INITIAL)

  const dirRef = useRef(dir)
  const snakeRef = useRef(snake)
  const foodRef = useRef(food)
  const gameOverRef = useRef(gameOver)

  dirRef.current = dir
  snakeRef.current = snake
  foodRef.current = food
  gameOverRef.current = gameOver

  const reset = useCallback(() => {
    setSnake(initialSnake)
    setFood(randomFood(initialSnake))
    setDir(Direction.RIGHT)
    setGameOver(false)
    setRunning(false)
    setScore(0)
    setSpeed(SPEED_INITIAL)
  }, [])

  const tick = useCallback(() => {
    if (gameOverRef.current) return

    const s = [...snakeRef.current]
    const head = { ...s[0] }
    const d = dirRef.current

    if (d === Direction.UP) head.y -= 1
    if (d === Direction.DOWN) head.y += 1
    if (d === Direction.LEFT) head.x -= 1
    if (d === Direction.RIGHT) head.x += 1

    if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
      setGameOver(true)
      setRunning(false)
      setHighScore((prev) => {
        const newHS = Math.max(prev, score)
        localStorage.setItem('sio-snake-hs', String(newHS))
        return newHS
      })
      return
    }

    if (s.some((seg) => seg.x === head.x && seg.y === head.y)) {
      setGameOver(true)
      setRunning(false)
      setHighScore((prev) => {
        const newHS = Math.max(prev, score)
        localStorage.setItem('sio-snake-hs', String(newHS))
        return newHS
      })
      return
    }

    s.unshift(head)

    if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
      setScore((prev) => prev + 10)
      setFood(randomFood(s))
      setSpeed((prev) => Math.max(SPEED_MIN, prev - 3))
    } else {
      s.pop()
    }

    setSnake(s)
  }, [score])

  useEffect(() => {
    if (!running) return
    const id = setInterval(tick, speed)
    return () => clearInterval(id)
  }, [running, speed, tick])

  useEffect(() => {
    const handleKey = (e) => {
      const key = e.key
      if (key === 'ArrowUp' && dirRef.current !== Direction.DOWN) { e.preventDefault(); setDir(Direction.UP) }
      if (key === 'ArrowDown' && dirRef.current !== Direction.UP) { e.preventDefault(); setDir(Direction.DOWN) }
      if (key === 'ArrowLeft' && dirRef.current !== Direction.RIGHT) { e.preventDefault(); setDir(Direction.LEFT) }
      if (key === 'ArrowRight' && dirRef.current !== Direction.LEFT) { e.preventDefault(); setDir(Direction.RIGHT) }
      if (key === ' ' && gameOverRef.current) { e.preventDefault(); reset() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [reset])

  const handleSwipe = (newDir) => {
    if (!running && !gameOver) { setRunning(true) }
    if (newDir === Direction.UP && dirRef.current !== Direction.DOWN) setDir(newDir)
    if (newDir === Direction.DOWN && dirRef.current !== Direction.UP) setDir(newDir)
    if (newDir === Direction.LEFT && dirRef.current !== Direction.RIGHT) setDir(newDir)
    if (newDir === Direction.RIGHT && dirRef.current !== Direction.LEFT) setDir(newDir)
  }

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-cyan-700">Recreacion</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950 md:text-3xl">Snake SIO</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm font-medium text-amber-700">
              <Trophy size={16} /> Record: {highScore}
            </div>
            <div className="rounded-md bg-cyan-50 border border-cyan-200 px-3 py-2 text-sm font-medium text-cyan-700">
              Puntos: {score}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-col items-center gap-6 p-4 md:p-8">
        <div className="relative rounded-lg border-2 border-slate-300 bg-slate-950 p-1 shadow-lg">
          <svg width={GRID * CELL} height={GRID * CELL} className="block">
            {snake.map((seg, i) => (
              <rect
                key={i}
                x={seg.x * CELL + 1}
                y={seg.y * CELL + 1}
                width={CELL - 2}
                height={CELL - 2}
                rx={3}
                fill={i === 0 ? '#22d3ee' : '#0891b2'}
                opacity={1 - i * 0.02}
              />
            ))}
            <rect
              x={food.x * CELL + 2}
              y={food.y * CELL + 2}
              width={CELL - 4}
              height={CELL - 4}
              rx={4}
              fill="#f59e0b"
            />
          </svg>

          {(!running && !gameOver) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-lg">
              <p className="text-2xl font-bold text-white mb-4">Snake SIO</p>
              <button
                onClick={() => setRunning(true)}
                className="flex items-center gap-2 rounded-md bg-cyan-500 px-5 py-3 text-sm font-medium text-white hover:bg-cyan-600 transition-colors"
              >
                <Play size={18} /> Jugar
              </button>
              <p className="mt-3 text-xs text-slate-300">Usa las flechas o los botones</p>
            </div>
          )}

          {gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-lg">
              <p className="text-3xl font-bold text-red-400">Game Over</p>
              <p className="mt-2 text-lg text-white">Puntos: {score}</p>
              {score >= highScore && score > 0 && (
                <p className="mt-1 text-sm font-semibold text-amber-400">Nuevo record!</p>
              )}
              <button
                onClick={reset}
                className="mt-4 flex items-center gap-2 rounded-md bg-cyan-500 px-5 py-3 text-sm font-medium text-white hover:bg-cyan-600 transition-colors"
              >
                <RotateCcw size={18} /> Reintentar
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 sm:hidden">
          <div />
          <button onClick={() => handleSwipe(Direction.UP)} className="flex size-14 items-center justify-center rounded-lg bg-slate-200 text-slate-700 text-xl font-bold active:bg-slate-300">&#9650;</button>
          <div />
          <button onClick={() => handleSwipe(Direction.LEFT)} className="flex size-14 items-center justify-center rounded-lg bg-slate-200 text-slate-700 text-xl font-bold active:bg-slate-300">&#9664;</button>
          <button onClick={() => handleSwipe(Direction.DOWN)} className="flex size-14 items-center justify-center rounded-lg bg-slate-200 text-slate-700 text-xl font-bold active:bg-slate-300">&#9660;</button>
          <button onClick={() => handleSwipe(Direction.RIGHT)} className="flex size-14 items-center justify-center rounded-lg bg-slate-200 text-slate-700 text-xl font-bold active:bg-slate-300">&#9654;</button>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm max-w-md w-full">
          <h3 className="text-sm font-semibold text-slate-950">Como jugar</h3>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            <li>Usa las <strong>flechas del teclado</strong> para mover la serpiente</li>
            <li>Come los <strong>cuadros amarillos</strong> para crecer y sumar puntos</li>
            <li>No choques con los <strong>bordes</strong> ni contigo mismo</li>
            <li>La velocidad <strong>aumenta</strong> conforme comes</li>
            <li>Presiona <strong>Espacio</strong> para reiniciar tras perder</li>
          </ul>
        </div>
      </div>
    </>
  )
}
