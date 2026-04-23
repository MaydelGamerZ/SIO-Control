import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { LoaderCircle, ShieldCheck } from 'lucide-react'
import { Button } from '../components/ui'
import { useAuth } from '../hooks/useAuth'

function getAuthMessage(error) {
  const messages = {
    'auth/email-already-in-use': 'Ese correo ya tiene una cuenta. Usa iniciar sesion.',
    'auth/invalid-credential': 'Correo o contrasena incorrectos.',
    'auth/invalid-email': 'El correo no tiene un formato valido.',
    'auth/missing-password': 'Escribe tu contrasena.',
    'auth/operation-not-allowed': 'Ese metodo de acceso no esta habilitado en Firebase Authentication.',
    'auth/unauthorized-domain': 'Este dominio aun no esta autorizado en Firebase Authentication.',
    'auth/weak-password': 'La contrasena debe tener al menos 6 caracteres.',
  }
  return messages[error?.code] || 'No se pudo completar el acceso.'
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [password, setPassword] = useState('')
  const { loading: authLoading, loginWithEmail, loginWithGoogle, registerWithEmail, user } = useAuth()
  const location = useLocation()
  const redirectTo = location.state?.from?.pathname || '/inventario/resumen'

  if (!authLoading && user) return <Navigate replace to={redirectTo} />

  async function submitEmail(mode) {
    setError('')
    setLoading(true)
    try {
      if (mode === 'register') {
        await registerWithEmail(email, password)
      } else {
        await loginWithEmail(email, password)
      }
    } catch (authError) {
      setError(getAuthMessage(authError))
    } finally {
      setLoading(false)
    }
  }

  async function submitGoogle() {
    setError('')
    setLoading(true)
    try {
      await loginWithGoogle()
    } catch (authError) {
      setError(getAuthMessage(authError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="safe-x safe-bottom min-h-app grid place-items-center bg-slate-950 py-6 text-white">
      <section className="w-full max-w-[460px] rounded-xl border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-black/30 sm:p-7">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-2 text-sm font-bold text-blue-200">
          <ShieldCheck size={16} />
          Sistema activo
        </div>
        <p className="mt-8 text-xs font-black uppercase tracking-[0.22em] text-slate-400">SIO-Control</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Acceso a inventario</h1>
        <p className="mt-3 text-base font-medium leading-7 text-slate-300">
          Inicia sesion para cargar PDF, capturar conteos y consultar historiales guardados en Firestore.
        </p>

        <form
          className="mt-7 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            submitEmail('login')
          }}
        >
          <label className="grid gap-2 text-xs font-black uppercase tracking-wider text-slate-400">
            Correo
            <input
              autoComplete="email"
              className="min-h-13 rounded-lg border border-white/10 bg-slate-900 px-4 text-base font-bold normal-case tracking-normal text-white outline-none focus:border-blue-400"
              disabled={loading}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="correo@empresa.com"
              required
              type="email"
              value={email}
            />
          </label>
          <label className="grid gap-2 text-xs font-black uppercase tracking-wider text-slate-400">
            Contrasena
            <input
              autoComplete="current-password"
              className="min-h-13 rounded-lg border border-white/10 bg-slate-900 px-4 text-base font-bold normal-case tracking-normal text-white outline-none focus:border-blue-400"
              disabled={loading}
              minLength={6}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimo 6 caracteres"
              required
              type="password"
              value={password}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-[1fr_0.78fr]">
            <Button className="min-h-13" disabled={loading} tone="blue" type="submit">
              {loading && <LoaderCircle className="mr-2 inline animate-spin" size={18} />}
              Iniciar sesion
            </Button>
            <Button className="min-h-13" disabled={loading} onClick={() => submitEmail('register')} tone="light">
              Crear cuenta
            </Button>
          </div>
        </form>

        <div className="my-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-xs font-black uppercase text-slate-500">
          <span className="h-px bg-white/10" />
          <span>o</span>
          <span className="h-px bg-white/10" />
        </div>

        <Button className="w-full min-h-13" disabled={loading} onClick={submitGoogle} tone="light">
          <span className="mr-2 inline-grid h-6 w-6 place-items-center rounded-full bg-white font-black text-blue-600">G</span>
          Continuar con Google
        </Button>

        {error && <div className="mt-5 rounded-lg border border-rose-400/30 bg-rose-500/10 p-4 font-bold text-rose-100">{error}</div>}
      </section>
    </main>
  )
}
