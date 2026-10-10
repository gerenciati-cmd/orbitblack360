import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth'

// Navegación: sidebar en escritorio, barra inferior en móvil. Cada módulo nuevo se registra aquí.
const NAV = [
  { to: '/', label: 'Inicio', icon: '🏠', module: 'dashboard', end: true },
  { to: '/ordenes', label: 'Órdenes', icon: '📋', module: 'orders', permission: 'orders.read' },
  { to: '/catalogos', label: 'Catálogos', icon: '🗂️', module: 'catalogs', permission: 'catalogs.read' },
  { to: '/usuarios', label: 'Usuarios', icon: '👥', module: 'users', permission: 'users.read' },
  { to: '/facturacion', label: 'Plan', icon: '💳', permission: 'tenant.manage' },
  { to: '/plataforma', label: 'Clientes', icon: '🏢', platform: true },
]

const BANNERS = {
  past_due: 'No pudimos cobrar tu último pago. Actualiza tu método de pago para evitar la suspensión.',
  canceled: 'Tu suscripción está cancelada.',
  suspended: 'Tu cuenta está suspendida. Contacta a soporte.',
  expired: 'Tu prueba gratuita terminó. Elige un plan para continuar.',
}

export default function Layout() {
  const { session, hasModule, can, logout, switchTenant } = useAuth()
  const sub = session.tenant.subscription
  const items = NAV.filter((n) => (n.platform ? session.user.isPlatformAdmin : (!n.module || hasModule(n.module)) && (!n.permission || can(n.permission)))
    && (sub.allowed || session.user.isPlatformAdmin || n.to === '/facturacion'))
  const daysLeft = sub.status === 'trialing' && sub.trialEndsAt ? Math.max(0, Math.ceil((new Date(sub.trialEndsAt) - Date.now()) / 864e5)) : null

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
      <main className="content">
        {BANNERS[sub.status] && <Link to="/facturacion" className="banner warn">{BANNERS[sub.status]}</Link>}
        {daysLeft !== null && <Link to="/facturacion" className="banner">Prueba gratuita: te quedan {daysLeft} día{daysLeft === 1 ? '' : 's'}. Elige un plan.</Link>}
        <Outlet />
      </main>
    </div>
  )
}
