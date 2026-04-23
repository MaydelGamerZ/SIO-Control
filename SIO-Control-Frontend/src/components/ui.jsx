import { LoaderCircle } from 'lucide-react'
import { formatNumber } from '../utils/inventory'

export function Badge({ children, tone = 'slate' }) {
  const tones = {
    amber: 'bg-amber-400/10 text-amber-200 ring-amber-300/25',
    blue: 'bg-blue-500/10 text-blue-200 ring-blue-300/25',
    green: 'bg-emerald-400/10 text-emerald-200 ring-emerald-300/25',
    red: 'bg-rose-500/10 text-rose-200 ring-rose-300/25',
    slate: 'bg-slate-700/70 text-slate-200 ring-white/10',
  }

  return (
    <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold ring-1 ${tones[tone]}`}>
      {children}
    </span>
  )
}

export function Button({ children, className = '', tone = 'dark', type = 'button', ...props }) {
  const tones = {
    blue: 'bg-blue-600 text-white hover:bg-blue-500 focus-visible:ring-blue-300/40',
    danger: 'bg-rose-600 text-white hover:bg-rose-500 focus-visible:ring-rose-300/40',
    dark: 'border border-white/10 bg-slate-800 text-white hover:bg-slate-700 focus-visible:ring-white/20',
    light: 'border border-white/10 bg-white/10 text-slate-100 hover:bg-white/15 focus-visible:ring-white/20',
  }

  return (
    <button
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-4 text-center text-sm font-black shadow-sm transition focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60 sm:px-5 ${tones[tone]} ${className}`}
      type={type}
      {...props}
    >
      {children}
    </button>
  )
}

export function PageTitle({ action, children, eyebrow, title }) {
  return (
    <section className="mb-5 flex flex-col gap-4 rounded-xl border border-white/10 bg-slate-900/80 p-4 shadow-xl shadow-black/20 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">{eyebrow}</p>
        <h2 className="mt-2 break-words text-2xl font-black tracking-tight text-slate-50 sm:text-3xl md:text-4xl">{title}</h2>
        {children && <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-300 sm:text-base sm:leading-7">{children}</p>}
      </div>
      {action}
    </section>
  )
}

export function Kpi({ label, value, icon, tone = 'slate' }) {
  const IconComponent = icon
  const tones = {
    blue: 'bg-blue-500/10 text-blue-200 ring-1 ring-blue-300/15',
    green: 'bg-emerald-400/10 text-emerald-200 ring-1 ring-emerald-300/15',
    red: 'bg-rose-500/10 text-rose-200 ring-1 ring-rose-300/15',
    slate: 'bg-slate-800 text-slate-200 ring-1 ring-white/10',
  }

  return (
    <article className="rounded-xl border border-white/10 bg-slate-900/80 p-4 shadow-xl shadow-black/15">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-black uppercase tracking-wider text-slate-400">{label}</span>
        <div className={`grid h-10 w-10 place-items-center rounded-lg ${tones[tone] || tones.slate}`}>
          <IconComponent size={20} />
        </div>
      </div>
      <strong className="mt-3 block break-words text-2xl font-black tracking-tight text-slate-50">{value}</strong>
    </article>
  )
}

export function Metric({ label, value, tone = 'slate' }) {
  const tones = {
    amber: 'text-amber-200',
    green: 'text-emerald-200',
    red: 'text-rose-200',
    slate: 'text-slate-50',
  }

  return (
    <div className="min-w-0">
      <div className="text-xs font-black uppercase text-slate-400">{label}</div>
      <div className={`mt-1 break-words text-lg font-black ${tones[tone]}`}>{typeof value === 'number' ? formatNumber(value) : value}</div>
    </div>
  )
}

export function LoadingState({ label = 'Cargando datos' }) {
  return (
    <div className="grid min-h-[360px] place-items-center rounded-xl border border-white/10 bg-slate-900/80">
      <div className="text-center">
        <LoaderCircle className="mx-auto animate-spin text-blue-600" size={34} />
        <p className="mt-3 font-black text-slate-200">{label}</p>
      </div>
    </div>
  )
}

export function ErrorState({ message }) {
  if (!message) return null
  return <div className="mb-4 rounded-xl border border-rose-400/25 bg-rose-500/10 p-4 font-bold text-rose-100">{message}</div>
}

export function RealtimeIndicator({ status = 'synced' }) {
  const states = {
    connecting: 'bg-blue-500/10 text-blue-200 ring-blue-300/20',
    offline: 'bg-amber-400/10 text-amber-200 ring-amber-300/25',
    synced: 'bg-emerald-400/10 text-emerald-200 ring-emerald-300/20',
  }
  const labels = {
    connecting: 'Conectando',
    offline: 'Sin conexion',
    synced: 'Sincronizado',
  }

  return (
    <span className={`inline-flex min-h-9 items-center rounded-lg px-3 text-xs font-black uppercase tracking-[0.14em] ring-1 ${states[status] || states.synced}`}>
      {labels[status] || labels.synced}
    </span>
  )
}

export function EmptyState({ action, description, icon: Icon, title }) {
  return (
    <section className="rounded-xl border border-dashed border-white/15 bg-slate-900/60 p-6 text-center sm:p-8">
      {Icon && <Icon className="mx-auto text-slate-400" size={38} />}
      <h3 className="mt-3 text-2xl font-black text-slate-50">{title}</h3>
      <p className="mx-auto mt-2 max-w-2xl text-slate-300">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </section>
  )
}
