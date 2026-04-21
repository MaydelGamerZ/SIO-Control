import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom'
import AppShell from './components/AppShell'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'
import CountPage from './pages/CountPage'
import HistoryPage from './pages/HistoryPage'
import InventoryDetailPage from './pages/InventoryDetailPage'
import LoginPage from './pages/LoginPage'
import SummaryPage from './pages/SummaryPage'
import UploadInventoryPage from './pages/UploadInventoryPage'

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <Navigate replace to="/inventario/resumen" /> },
          { path: '/inventario/resumen', element: <SummaryPage /> },
          { path: '/inventario/cargar', element: <UploadInventoryPage /> },
          { path: '/inventario/conteo', element: <CountPage /> },
          { path: '/inventario/historial', element: <HistoryPage /> },
          { path: '/inventario/:id', element: <InventoryDetailPage /> },
          { path: '/inventario/:id/editar', element: <CountPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate replace to="/inventario/resumen" /> },
])

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
