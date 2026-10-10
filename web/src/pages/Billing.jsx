import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'

const STATUS = {
  trialing: 'Prueba gratuita', active: 'Activa', past_due: 'Pago pendiente',
  canceled: 'Cancelada', suspended: 'Suspendida', expired: 'Prueba vencida',
}
const fmt = (d) => (d ? new Date(d).toLocaleDateString('es-MX', { dateStyle: 'long' }) : '—')

export default function Billing() {
  const { can, session, reload } = useAuth()
  const [params] = useSearchParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const manage = can('tenant.manage')

  useEffect(() => {
    if (!manage) return
    // Al volver de Stripe, el webhook puede tardar unos segundos: se refresca el estado.
    const load = () => Promise.all([api('/billing').then(setData), reload()]).catch((e) => setError(e.message))
    load()
    if (params.get('ok')) { const t = setTimeout(load, 3000); return () => clearTimeout(t) }
  }, [manage, params, reload])

  async function go(path, body, key) {
    setBusy(key)
    setError('')
    try {
      const { url } = await api(path, { method: 'POST', body })
      window.location.assign(url)
    } catch (err) {
      setError(err.message)
      setBusy('')
    }
  }

  const sub = session.tenant.subscription
  if (!manage) {
    return (
      <>
        <h1>Suscripción</h1>
        <div className="card">
          Estado: <strong>{STATUS[sub.status] || sub.status}</strong>.
          {!sub.allowed && ' Pide al administrador de tu empresa que renueve el plan.'}
        </div>
      </>
    )
  }
  if (!data) return <p className={error ? 'error' : 'muted'}>{error || 'Cargando…'}</p>

  return (
    <>
      <h1>Facturación</h1>
      {params.get('ok') && <div className="card ok">¡Gracias! Estamos confirmando tu pago…</div>}
      {error && <div className="error" role="alert">{error}</div>}
      {!data.configured && <div className="card muted">El cobro en línea aún no está configurado en este servidor.</div>}

      <div className="card facts">
        <div><small>Plan actual</small>{data.plan.name}</div>
        <div><small>Estado</small>{STATUS[sub.status] || sub.status}</div>
        {sub.status === 'trialing' && <div><small>La prueba termina</small>{fmt(sub.trialEndsAt)}</div>}
        {sub.currentPeriodEnd && <div><small>Próxima renovación</small>{fmt(sub.currentPeriodEnd)}</div>}
        <div><small>Usuarios</small>{data.usage.users} / {data.plan.maxUsers ?? '∞'}</div>
      </div>

      <h3 style={{ marginTop: '1.5rem' }}>Planes</h3>
      <div className="plans">
        {data.plans.map((p) => (
          <div key={p.key} className={`card plan ${p.key === data.plan.key ? 'current' : ''}`}>
            <h3>{p.name}</h3>
            <p className="muted">{p.maxUsers ? `Hasta ${p.maxUsers} usuarios` : 'Usuarios ilimitados'}</p>
            <button
              className="btn"
              disabled={!data.configured || !p.available || busy === p.key || (p.key === data.plan.key && sub.status === 'active')}
              onClick={() => go('/billing/checkout', { plan: p.key }, p.key)}
            >
              {p.key === data.plan.key && sub.status === 'active' ? 'Plan actual' : p.available ? 'Contratar' : 'Próximamente'}
            </button>
          </div>
        ))}
      </div>

      <button className="link" style={{ marginTop: '1rem' }} disabled={!data.configured || busy === 'portal'} onClick={() => go('/billing/portal', undefined, 'portal')}>
        Administrar método de pago, facturas y cancelación
      </button>
    </>
  )
}
