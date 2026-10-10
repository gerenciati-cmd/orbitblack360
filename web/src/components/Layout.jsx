import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth'

// Navegación: sidebar en escritorio, barra inferior en móvil. Cada módulo nuevo se registra aquí.
const NAV = [
  { to: '/', label: 'Inicio', icon: '🏠', module: 'dashboard', end: true },
  { to: '/usuarios', label: 'Usuarios', icon: '👥', module: 'users', permission: 'users.read' },
]

export default function Layout() {
  const { session, hasModule, can, logout, switchTenant } = useAuth()
  const items = NAV.filter((n) => hasModule(n.module) && (!n.permission || can(n.permission)))

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">Orbit<span>Black</span>360</div>
        {session.tenants.length > 1 ? (
          <select className="tenant" value={session.tenant.id} onChange={(e) => switchTenant(Number(e.target.value))}>
            {session.tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        ) : (
          <div className="tenant-name">{session.tenant.name}</div>
        )}
        <nav>
          {items.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className="nav-item">
              <span className="ico">{n.icon}</span>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="me">
          <div>{session.user.name}</div>
          <small>{session.role}</small>
          <button className="link" onClick={logout}>Cerrar sesión</button>
        </div>
      </aside>
      <main className="content"><Outlet /></main>
    </div>
  )
}
