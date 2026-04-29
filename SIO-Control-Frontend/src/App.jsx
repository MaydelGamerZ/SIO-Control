import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Ordenes from './pages/Ordenes'
import Inventario from './pages/Inventario'
import Reportes from './pages/Reportes'
import Equipo from './pages/Equipo'
import Juego from './pages/Juego'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="ordenes" element={<Ordenes />} />
        <Route path="inventario" element={<Inventario />} />
        <Route path="reportes" element={<Reportes />} />
        <Route path="equipo" element={<Equipo />} />
        <Route path="juego" element={<Juego />} />
      </Route>
    </Routes>
  )
}

export default App
