import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'

const STATUS = { trialing: 'Prueba', active: 'Activa', past_due: 'Pago pendiente', canceled: 'Cancelada', suspended: 'Suspendida' }
const day = (d) => (d ? String(d).slice(0, 10) : '—')

// Panel del dueño de la plataforma: todos los clientes, su plan y su estado de cobro.
export default function Platform() {
  const [tenants, setTenants] = useState([])
  const [error, setError] = useState('')

  const load = useCallback(async () => setTenants(await api('/platform/tenants')), [])
  useEffect(() => { load().catch((e) => setError(e.message)) }, [load])

  async function patch(t, body, confirmMsg) {
    if (confirmMsg && !confirm(confirmMsg)) return
    setError('')
    try { await api(`/platform/tenants/${t.id}`, { method: 'PATCH', body }); await load() } catch (e) { setError(e.message) }
  }

  return (
    <>
      <h1>Clientes</h1>
      <p className="muted">{tenants.length} empresas en la plataforma</p>
      {error && <div className="error" role="alert">{error}</div>}
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Empresa</th><th>Plan</th><th>Estado</th><th>Usuarios</th><th>Vence</th><th>Stripe</th><th /></tr></thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id}>
                <td>{t.name}<br /><small className="muted">{t.slug}</small></td>
                <td>
                  <select value={t.plan} onChange={(e) => patch(t, { plan: e.target.value })}>
                    <option value="basic">Básico</option><option value="pro">Pro</option><option value="enterprise">Empresarial</option>
                  </select>
                </td>
                <td><span className={`badge ${['active', 'trialing'].includes(t.status) ? 'open' : 'closed'}`}>{STATUS[t.status] || t.status}</span></td>
                <td>{t.users}</td>
                <td>{day(t.status === 'trialing' ? t.trial_ends_at : t.current_period_end)}</td>
                <td>{t.stripe_customer_id ? 'Sí' : '—'}</td>
                <td className="actions">
                  <button className="link" onClick={() => patch(t, { extend_trial_days: 14 })}>+14 días</button>
                  {t.status === 'suspended'
                    ? <button className="link" onClick={() => patch(t, { subscription_status: 'active' })}>Reactivar</button>
                    : <button className="link danger" onClick={() => patch(t, { subscription_status: 'suspended' }, `¿Suspender a ${t.name}? No podrán usar la plataforma.`)}>Suspender</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
