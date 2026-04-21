import { useEffect, useMemo, useState } from 'react'
import {
  Boxes,
  ChevronRight,
  ClipboardList,
  History,
  Home,
  LoaderCircle,
  LogOut,
  Menu,
  PackagePlus,
  Plus,
  ShieldCheck,
  X,
} from 'lucide-react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import { auth, googleProvider } from './firebase'
import './App.css'

const defaultSections = [
  { id: 'inicio', label: 'Inicio', short: 'IN', icon: Home },
  { id: 'inventario-diario', label: 'Inventario Diario', short: 'ID', icon: ClipboardList },
  { id: 'historial', label: 'Historial de Inventarios', short: 'HI', icon: History },
  { id: 'productos', label: 'Productos / Categorias', short: 'PC', icon: Boxes },
]

const storageKey = 'sio-menu-sections'

function getInitials(user) {
  const name = user?.displayName || user?.email || 'Usuario'
  return name
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function Login({ onEmailLogin, onGoogleLogin, loading, error }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    onEmailLogin(email, password, 'sign-in')
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="status-pill">
          <ShieldCheck size={16} />
          Sistema activo
        </div>
        <div>
          <p className="eyebrow">SIO Control</p>
          <h1>Inventario seguro para tu operacion</h1>
          <p className="login-copy">
            Inicia sesion con tu correo o Google para entrar al panel principal y administrar las secciones del menu.
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Correo
            <input
              autoComplete="email"
              disabled={loading}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="correo@ejemplo.com"
              required
              type="email"
              value={email}
            />
          </label>
          <label>
            Contrasena
            <input
              autoComplete="current-password"
              disabled={loading}
              minLength={6}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimo 6 caracteres"
              required
              type="password"
              value={password}
            />
          </label>
          <div className="login-actions">
            <button className="email-button" disabled={loading} type="submit">
              {loading ? <LoaderCircle className="spin" size={20} /> : null}
              Iniciar sesion
            </button>
            <button
              className="create-button"
              disabled={loading}
              onClick={() => onEmailLogin(email, password, 'sign-up')}
              type="button"
            >
              Crear cuenta
            </button>
          </div>
        </form>

        <div className="login-divider">
          <span />
          <p>o</p>
          <span />
        </div>

        <button className="google-button" disabled={loading} onClick={onGoogleLogin} type="button">
          {loading ? <LoaderCircle className="spin" size={20} /> : <span className="google-mark">G</span>}
          {loading ? 'Conectando...' : 'Continuar con Google'}
        </button>
        {error && <p className="login-error">{error}</p>}
      </section>
    </main>
  )
}

function Sidebar({ activeSection, collapsed, onAddSection, onCollapse, onSelect, sections, user }) {
  const [newSection, setNewSection] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    onAddSection(newSection)
    setNewSection('')
  }

  return (
    <aside className={`sidebar ${collapsed ? 'is-collapsed' : ''}`}>
      <div className="sidebar-top">
        <div className="status-pill compact">
          <ShieldCheck size={16} />
          <span>{collapsed ? 'INV' : 'Sistema activo'}</span>
        </div>
        <button className="collapse-button" onClick={onCollapse} type="button" aria-label="Alternar menu">
          {collapsed ? <ChevronRight size={22} /> : <X size={22} />}
        </button>
      </div>

      <header className="brand-block">
        <h1>{collapsed ? 'INV' : 'INVENTARIO'}</h1>
        {!collapsed && <p>Panel principal</p>}
      </header>

      <nav className="nav-list" aria-label="Menu principal">
        {sections.map((section) => {
          const Icon = section.icon || PackagePlus
          const isActive = activeSection === section.id

          return (
            <button
              className={`nav-item ${isActive ? 'is-active' : ''}`}
              key={section.id}
              onClick={() => onSelect(section.id)}
              title={section.label}
              type="button"
            >
              <Icon size={24} />
              {!collapsed && <span>{section.label}</span>}
              {!collapsed && <ChevronRight className="nav-arrow" size={18} />}
            </button>
          )
        })}
      </nav>

      {!collapsed && (
        <form className="add-section" onSubmit={handleSubmit}>
          <label htmlFor="new-section">Agregar seccion</label>
          <div>
            <input
              id="new-section"
              onChange={(event) => setNewSection(event.target.value)}
              placeholder="Ej. Proveedores"
              value={newSection}
            />
            <button type="submit" aria-label="Agregar seccion">
              <Plus size={18} />
            </button>
          </div>
        </form>
      )}

      <footer className="user-card">
        <div className="avatar">{user?.photoURL ? <img src={user.photoURL} alt="" /> : getInitials(user)}</div>
        {!collapsed && (
          <div>
            <span>Usuario</span>
            <strong>{user?.displayName || 'Usuario'}</strong>
            <p>{user?.email}</p>
          </div>
        )}
      </footer>

      <button className="logout-button" onClick={() => signOut(auth)} type="button">
        <LogOut size={22} />
        {!collapsed && <span>Cerrar sesion</span>}
      </button>
    </aside>
  )
}

function Dashboard({ activeSection, sections }) {
  const section = sections.find((item) => item.id === activeSection) || sections[0]

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <p>Panel activo</p>
          <h2>{section?.label || 'Inicio'}</h2>
        </div>
        <div className="header-badge">Actualizable</div>
      </header>

      <section className="summary-grid">
        <article>
          <span>Inventarios hoy</span>
          <strong>24</strong>
          <p>8 pendientes por revisar</p>
        </article>
        <article>
          <span>Productos activos</span>
          <strong>148</strong>
          <p>12 con stock bajo</p>
        </article>
        <article>
          <span>Ultima captura</span>
          <strong>10:42</strong>
          <p>Guardado en Firebase</p>
        </article>
      </section>

      <section className="content-card">
        <div className="content-card-header">
          <div>
            <h3>{section?.label || 'Inicio'}</h3>
            <p>Esta area queda lista para conectar formularios, reportes o tablas.</p>
          </div>
          <button type="button">Nueva captura</button>
        </div>

        <div className="activity-list">
          {['Registro de entrada actualizado', 'Conteo rapido completado', 'Revision de categoria pendiente'].map(
            (item, index) => (
              <div className="activity-row" key={item}>
                <span>{index + 1}</span>
                <p>{item}</p>
                <strong>{index === 0 ? 'Ahora' : `${index + 1} h`}</strong>
              </div>
            ),
          )}
        </div>
      </section>
    </main>
  )
}

function App() {
  const [activeSection, setActiveSection] = useState(defaultSections[0].id)
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [sections, setSections] = useState(() => {
    const storedSections = JSON.parse(localStorage.getItem(storageKey) || '[]')
    return storedSections.length > 0 ? [...defaultSections, ...storedSections] : defaultSections
  })
  const [user, setUser] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setCheckingSession(false)
    })

    return unsubscribe
  }, [])

  const customSections = useMemo(
    () => sections.filter((section) => !defaultSections.some((defaultSection) => defaultSection.id === section.id)),
    [sections],
  )

  async function handleLogin() {
    setAuthError('')
    setAuthLoading(true)

    try {
      await signInWithPopup(auth, googleProvider)
    } catch (error) {
      const message =
        error.code === 'auth/unauthorized-domain'
          ? 'Este dominio aun no esta autorizado en Firebase Authentication.'
          : 'No se pudo iniciar sesion con Google. Revisa que el proveedor Google este habilitado en Firebase.'
      setAuthError(message)
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleEmailLogin(email, password, mode) {
    setAuthError('')
    setAuthLoading(true)

    try {
      if (mode === 'sign-up') {
        await createUserWithEmailAndPassword(auth, email, password)
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
    } catch (error) {
      const messages = {
        'auth/email-already-in-use': 'Ese correo ya tiene una cuenta. Usa Iniciar sesion.',
        'auth/invalid-credential': 'Correo o contrasena incorrectos.',
        'auth/invalid-email': 'El correo no tiene un formato valido.',
        'auth/missing-password': 'Escribe tu contrasena.',
        'auth/operation-not-allowed': 'El login con correo aun no esta habilitado en Firebase Authentication.',
        'auth/weak-password': 'La contrasena debe tener al menos 6 caracteres.',
      }

      setAuthError(messages[error.code] || 'No se pudo completar el acceso con correo.')
    } finally {
      setAuthLoading(false)
    }
  }

  function handleAddSection(label) {
    const cleanLabel = label.trim()
    if (!cleanLabel) return

    const newSection = {
      id: `${cleanLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
      label: cleanLabel,
      short: cleanLabel.slice(0, 2).toUpperCase(),
      icon: PackagePlus,
    }

    const nextCustomSections = [...customSections, newSection]
    localStorage.setItem(storageKey, JSON.stringify(nextCustomSections))
    setSections([...defaultSections, ...nextCustomSections])
    setActiveSection(newSection.id)
  }

  if (checkingSession) {
    return (
      <main className="loading-page">
        <LoaderCircle className="spin" size={28} />
      </main>
    )
  }

  if (!user) {
    return <Login error={authError} loading={authLoading} onEmailLogin={handleEmailLogin} onGoogleLogin={handleLogin} />
  }

  return (
    <div className="app-shell">
      <button className="mobile-menu-button" onClick={() => setCollapsed((value) => !value)} type="button">
        <Menu size={22} />
      </button>
      <Sidebar
        activeSection={activeSection}
        collapsed={collapsed}
        onAddSection={handleAddSection}
        onCollapse={() => setCollapsed((value) => !value)}
        onSelect={setActiveSection}
        sections={sections}
        user={user}
      />
      <Dashboard activeSection={activeSection} sections={sections} />
    </div>
  )
}

export default App
