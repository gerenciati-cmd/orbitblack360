import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Catalogs from './pages/Catalogs'
import Orders from './pages/Orders'
import OrderNew from './pages/OrderNew'
import OrderDetail from './pages/OrderDetail'

function Protected() {
  const { session, loading } = useAuth()
  if (loading) return <div className="center muted">Cargando…</div>
  return session ? <Outlet /> : <Navigate to="/login" replace />
}

// Muestra la ruta solo si la empresa tiene el módulo y el usuario el permiso.
function Gate({ module, permission, children }) {
  const { hasModule, can } = useAuth()
  return hasModule(module) && can(permission) ? children : <Navigate to="/" replace />
}

export default function App() {
  const { session, loading } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={!loading && session ? <Navigate to="/" replace /> : <Login />} />
      <Route element={<Protected />}>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="usuarios" element={<Gate module="users" permission="users.read"><Users /></Gate>} />
          <Route path="catalogos/:entity?" element={<Gate module="catalogs" permission="catalogs.read"><Catalogs /></Gate>} />
          <Route path="ordenes" element={<Gate module="orders" permission="orders.read"><Orders /></Gate>} />
          <Route path="ordenes/nueva" element={<Gate module="orders" permission="orders.create"><OrderNew /></Gate>} />
          <Route path="ordenes/:id" element={<Gate module="orders" permission="orders.read"><OrderDetail /></Gate>} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
