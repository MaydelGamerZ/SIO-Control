import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="flex min-h-screen">
        <Sidebar />
        <section className="flex min-w-0 flex-1 flex-col">
          <Outlet />
        </section>
      </div>
    </main>
  )
}
