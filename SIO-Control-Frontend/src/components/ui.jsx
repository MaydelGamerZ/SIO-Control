import { LoaderCircle } from 'lucide-react'
import { formatNumber } from '../utils/inventory'

export function Badge({ children, tone = 'slate' }) {
  const tones = {
    amber: 'bg-amber-50 text-amber-800 ring-amber-200',
    blue: 'bg-blue-50 text-blue-700 ring-blue-200',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    red: 'bg-rose-50 text-rose-700 ring-rose-200',
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  }

  return (
    <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold ring-1 ${tones[tone]}`}>
      {children}
    </span>
  )
}

export function Button({ children, className = '', tone = 'dark', type = 'button', ...props }) {
  const tones = {
    blue: 'bg-blue-600 text-white hover:bg-blue-700',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
    dark: 'bg-slate-950 text-white hover:bg-slate-800',
    light: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
  }

  return (
    <button
      className={`min-h-12 rounded-lg px-5 text-sm font-black shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${tones[tone]} ${className}`}
      type={type}
      {...props}
    >
      {children}
    </button>
  )
}

export function PageTitle({ action, children, eyebrow, title }) {
  return (
    <section className="mb-6 flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm xl:flex-row xl:items-center xl:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">{eyebrow}</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">{title}</h2>
        {children && <p className="mt-2 max-w-3xl text-base font-medium leading-7 text-slate-500">{children}</p>}
      </div>
      {action}
    </section>
  )
}

export function Kpi({ label, value, icon, tone = 'slate' }) {
  const IconComponent = icon
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-rose-50 text-rose-700',
    slate: 'bg-slate-100 text-slate-700',
  }

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-black uppercase tracking-wider text-slate-400">{label}</span>
        <div className={`grid h-10 w-10 place-items-center rounded-lg ${tones[tone] || tones.slate}`}>
          <IconComponent size={20} />
        </div>
      </div>
      <strong className="mt-3 block text-2xl font-black tracking-tight text-slate-950">{value}</strong>
    </article>
  )
}

export function Metric({ label, value, tone = 'slate' }) {
  const tones = {
    amber: 'text-amber-700',
    green: 'text-emerald-700',
    red: 'text-rose-700',
    slate: 'text-slate-950',
  }

  return (
    <div>
      <div className="text-xs font-black uppercase text-slate-400">{label}</div>
      <div className={`mt-1 text-lg font-black ${tones[tone]}`}>{typeof value === 'number' ? formatNumber(value) : value}</div>
    </div>
  )
}

export function LoadingState({ label = 'Cargando datos' }) {
  return (
    <div className="grid min-h-[360px] place-items-center rounded-lg border border-slate-200 bg-white">
      <div className="text-center">
        <LoaderCircle className="mx-auto animate-spin text-blue-600" size={34} />
        <p className="mt-3 font-black text-slate-700">{label}</p>
      </div>
    </div>
  )
}

export function ErrorState({ message }) {
  if (!message) return null
  return <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-4 font-bold text-rose-700">{message}</div>
}

export function EmptyState({ action, description, icon: Icon, title }) {
  return (
    <section className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      {Icon && <Icon className="mx-auto text-slate-400" size={38} />}
      <h3 className="mt-3 text-2xl font-black text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-2xl text-slate-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </section>
  )
}
