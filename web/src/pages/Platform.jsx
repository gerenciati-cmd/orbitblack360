import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'

export const STATUS = { trialing: 'Prueba', active: 'Activa', past_due: 'Pago pendiente', canceled: 'Cancelada', suspended: 'Suspendida' }
export const KIND = { internal: 'Interna', customer: 'Cliente' }
export const day = (d) => (d ? String(d).slice(0, 10) : '—')
const okStatus = (s) => ['active', 'trialing'].includes(s)

const slugify = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
const emptyForm = { name: '', slug: '', kind: 'customer', plan: 'basic', trial: true, adminName: '', adminEmail: '', adminPassword: '' }

function NewTenant({ onCreated }) {
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  async function submit(e) {
    e.preventDefault()
    setError('')
    try {
      await api('/platform/tenants', { method: 'POST', body: { ...form, slug: form.slug || slugify(form.name) } })
      setForm(emptyForm)
      onCreated()
    } catch (err) { setError(err.message) }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h3>Nueva empresa</h3>
      <div className="grid">
        <input placeholder="Nombre de la empresa" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugify(e.target.value) })} />
        <input placeholder="Identificador (slug)" required pattern="[a-z0-9\-]{2,60}" value={form.slug} onChange={set('slug')} />
        <select value={form.kind} onChange={set('kind')}><option value="customer">Cliente (se vende)</option><option value="internal">Interna (tuya)</option></select>
        <select value={form.plan} onChange={set('plan')}><option value="basic">Plan Básico</option><option value="pro">Plan Pro</option><option value="enterprise">Plan Empresarial</option></select>
        <input placeholder="Nombre del administrador" required value={form.adminName} onChange={set('adminName')} />
        <input type="email" placeholder="Correo del administrador" required value={form.adminEmail} onChange={set('adminEmail')} />
        <input type="password" placeholder="Contraseña inicial (mín. 8)" minLength={8} required value={form.adminPassword} onChange={set('adminPassword')} />
        <label className="check"><input type="checkbox" checked={form.trial} onChange={set('trial')} /> Empezar con prueba de 14 días</label>
      </div>
      {error && <div className="error" role="alert">{error}</div>}
      <button className="btn" style={{ marginTop: '.75rem' }}>Crear empresa</button>
    </form>
  )
}

// Panel del dueño de la plataforma: todas las empresas (internas y clientes), su plan y su estado de cobro.
export default function Platform() {
  const { switchTenant } = useAuth()
  const nav = useNavigate()
  const [tenants, setTenants] = useState([])
  const [summary, setSummary] = useState(null)
  const [kind, setKind] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const [t, s] = await Promise.all([api(`/platform/tenants${kind ? `?kind=${kind}` : ''}`), api('/platform/summary')])
    setTenants(t)
    setSummary(s)
  }, [kind])
  useEffect(() => { load().catch((e) => setError(e.message)) }, [load])

  async function patch(t, body, confirmMsg) {
    if (confirmMsg && !confirm(confirmMsg)) return
    setError('')
    try { await api(`/platform/tenants/${t.id}`, { method: 'PATCH', body }); await load() } catch (e) { setError(e.message) }
  }
  async function enter(t) {
    try { await switchTenant(t.id); nav('/') } catch (e) { setError(e.message) }
  }

  const cards = summary && [
    ['Empresas', summary.total], ['Clientes', summary.customers], ['Internas', summary.internal],
    ['En prueba', summary.trialing], ['Pagando', summary.active], ['Pago pendiente', summary.past_due],
    ['Inactivas', summary.inactive], ['Usuarios', summary.users],
  ]

  return (
    <>
      <div className="row">
        <h1>Panel de plataforma</h1>
        <button className="btn" onClick={() => setShowNew(!showNew)}>{showNew ? 'Cerrar' : 'Nueva empresa'}</button>
      </div>
      {cards && <div className="stats">{cards.map(([l, n]) => <div key={l} className="card stat"><b>{n}</b><small>{l}</small></div>)}</div>}
      {showNew && <NewTenant onCreated={() => { setShowNew(false); load() }} />}
      <div className="tabs">
        {[['', 'Todas'], ['customer', 'Clientes'], ['internal', 'Internas']].map(([v, l]) => (
          <button key={v} className={`tab ${kind === v ? 'active' : ''}`} onClick={() => setKind(v)}>{l}</button>
        ))}
      </div>
      {error && <div className="error" role="alert">{error}</div>}
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Empresa</th><th>Tipo</th><th>Plan</th><th>Estado</th><th>Usuarios</th><th>Vence</th><th /></tr></thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id}>
                <td><Link to={`/plataforma/${t.id}`}>{t.name}</Link><br /><small className="muted">{t.slug}</small></td>
                <td>{KIND[t.kind]}</td>
                <td>
                  <select value={t.plan} onChange={(e) => patch(t, { plan: e.target.value })}>
                    <option value="basic">Básico</option><option value="pro">Pro</option><option value="enterprise">Empresarial</option>
                  </select>
                </td>
                <td><span className={`badge ${okStatus(t.status) ? 'open' : 'closed'}`}>{STATUS[t.status] || t.status}</span></td>
                <td>{t.users}</td>
                <td>{day(t.status === 'trialing' ? t.trial_ends_at : t.current_period_end)}</td>
                <td className="actions">
                  <button className="link" onClick={() => enter(t)}>Entrar</button>
                  <button className="link" onClick={() => patch(t, { extend_trial_days: 14 })}>+14 días</button>
                  {t.status === 'suspended'
                    ? <button className="link" onClick={() => patch(t, { subscription_status: 'active' })}>Reactivar</button>
                    : <button className="link danger" onClick={() => patch(t, { subscription_status: 'suspended' }, `¿Suspender a ${t.name}? No podrán usar la plataforma.`)}>Suspender</button>}
                </td>
              </tr>
            ))}
            {!tenants.length && <tr><td colSpan="7" className="muted">Sin empresas</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}
