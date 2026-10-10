import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { KIND, STATUS, day } from './Platform'

// Ficha de una empresa: datos, módulos activables, usuarios y actividad reciente.
export default function PlatformTenant() {
  const { id } = useParams()
  const { switchTenant } = useAuth()
  const nav = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => setData(await api(`/platform/tenants/${id}`)), [id])
  useEffect(() => { load().catch((e) => setError(e.message)) }, [load])

  async function patch(body) {
    setError('')
    try { await api(`/platform/tenants/${id}`, { method: 'PATCH', body }); await load() } catch (e) { setError(e.message) }
  }
  async function enter() {
    try { await switchTenant(Number(id)); nav('/') } catch (e) { setError(e.message) }
  }

  if (!data) return <p className={error ? 'error' : 'muted'}>{error || 'Cargando…'}</p>
  const { tenant: t, users, modules, activity } = data

  return (
    <>
      <p><Link to="/plataforma">← Panel de plataforma</Link></p>
      <div className="row">
        <h1>{t.name}</h1>
        <button className="btn" onClick={enter}>Entrar como soporte</button>
      </div>
      {error && <div className="error" role="alert">{error}</div>}

      <div className="card facts">
        <div><small>Tipo</small>
          <select value={t.kind} onChange={(e) => patch({ kind: e.target.value })}>
            {Object.entries(KIND).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
        <div><small>Plan</small>
          <select value={t.plan} onChange={(e) => patch({ plan: e.target.value })}>
            <option value="basic">Básico</option><option value="pro">Pro</option><option value="enterprise">Empresarial</option>
          </select>
        </div>
        <div><small>Estado</small>{STATUS[t.status] || t.status}</div>
        <div><small>{t.status === 'trialing' ? 'La prueba termina' : 'Renovación'}</small>{day(t.status === 'trialing' ? t.trial_ends_at : t.current_period_end)}</div>
        <div><small>Alta</small>{day(t.created_at)}</div>
        <div><small>Stripe</small>{t.stripe_customer_id ? 'Conectado' : '—'}</div>
      </div>

      <div className="card">
        <h3>Módulos</h3>
        <p className="muted">Cambiar el plan restablece los módulos a los del plan.</p>
        <div className="mods">
          {modules.map((m) => (
            <label key={m.key} className="check">
              <input type="checkbox" checked={m.enabled} disabled={m.key === 'dashboard'} onChange={(e) => patch({ modules: { [m.key]: e.target.checked } })} /> {m.label}
            </label>
          ))}
        </div>
      </div>

      <div className="card table-wrap">
        <table>
          <thead><tr><th>Usuario</th><th>Correo</th><th>Rol</th><th>Último acceso</th></tr></thead>
          <tbody>
            {users.map((u) => <tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{u.role}</td><td>{day(u.last_login_at)}</td></tr>)}
          </tbody>
        </table>
      </div>

      <div className="card table-wrap">
        <table>
          <thead><tr><th>Fecha</th><th>Quién</th><th>Módulo</th><th>Acción</th><th>Detalle</th></tr></thead>
          <tbody>
            {activity.map((a) => (
              <tr key={a.id}><td>{String(a.created_at).slice(0, 16).replace('T', ' ')}</td><td>{a.user || '—'}</td><td>{a.module}</td><td>{a.action}</td><td className="muted">{String(a.detail ?? '').slice(0, 80)}</td></tr>
            ))}
            {!activity.length && <tr><td colSpan="5" className="muted">Sin actividad</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}
