import { useState } from 'react'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler)

const weeklyData = {
  labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
  datasets: [
    { label: 'Produccion', data: [1420, 1680, 1540, 1810], backgroundColor: 'rgba(8, 145, 178, 0.7)', borderRadius: 6 },
    { label: 'Objetivo', data: [1600, 1600, 1600, 1600], backgroundColor: 'rgba(203, 213, 225, 0.7)', borderRadius: 6 },
  ],
}

const defectData = {
  labels: ['Dimensional', 'Superficie', 'Dureza', 'Composicion', 'Otro'],
  datasets: [{
    data: [35, 25, 15, 15, 10],
    backgroundColor: ['#0891b2', '#06b6d4', '#22d3ee', '#67e8f9', '#a5f3fc'],
    borderWidth: 0,
  }],
}

const trendData = {
  labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
  datasets: [
    {
      label: 'Eficiencia (%)',
      data: [78, 82, 79, 85, 88, 91],
      borderColor: '#0891b2',
      backgroundColor: 'rgba(8, 145, 178, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
    },
  ],
}

export default function Reportes() {
  const [period, setPeriod] = useState('semanal')

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-cyan-700">Analisis</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950 md:text-3xl">Reportes</h1>
          </div>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
          >
            <option value="semanal">Semanal</option>
            <option value="mensual">Mensual</option>
            <option value="trimestral">Trimestral</option>
          </select>
        </div>
      </header>

      <div className="p-4 md:p-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Produccion vs Objetivo</h2>
            <p className="text-sm text-slate-500">Comparativa {period}</p>
            <div className="mt-6 h-72">
              <Bar data={weeklyData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
            </div>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Defectos por tipo</h2>
            <p className="text-sm text-slate-500">Distribucion del ultimo periodo</p>
            <div className="mt-6 flex h-72 items-center justify-center">
              <Doughnut data={defectData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, cutout: '60%' }} />
            </div>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-semibold text-slate-950">Tendencia de eficiencia</h2>
            <p className="text-sm text-slate-500">Evolucion mensual de la eficiencia productiva</p>
            <div className="mt-6 h-72">
              <Line data={trendData} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { min: 60, max: 100 } }, plugins: { legend: { display: false } } }} />
            </div>
          </article>
        </div>
      </div>
    </>
  )
}
