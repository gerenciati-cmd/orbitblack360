import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'

export const StatusBadge = ({ status }) => (
  <span className={`badge ${status === 'close' ? 'closed' : 'open'}`}>{status === 'close' ? 'Cerrada' : 'Abierta'}</span>
)

export default function Orders() {
  const { can } = useAuth()
  const [params, setParams] = useSearchParams()
  const status = params.get('status') || ''
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setOrders(await api(`/orders${status ? `?status=${status}` : ''}`))
  }, [status])

  useEffect(() => {
    load().catch((e) => setError(e.message))
  }, [load])

  async function close(o) {
    if (!confirm(`¿Cerrar la orden ${o.code}?`)) return
    try { await api(`/orders/${o.id}/close`, { method: 'POST' }); await load() } catch (e) { setError(e.message) }
  }

  return (
    <>
      <div className="row">
        <h1>Órdenes de servicio</h1>
        {can('orders.create') && <Link to="/ordenes/nueva" className="btn">Nueva orden</Link>}
      </div>
      <div className="tabs">
        {[['', 'Todas'], ['open', 'Abiertas'], ['close', 'Cerradas']].map(([v, l]) => (
          <button key={v} className={`tab ${status === v ? 'active' : ''}`} onClick={() => setParams(v ? { status: v } : {})}>{l}</button>
        ))}
      </div>
      {error && <div className="error" role="alert">{error}</div>}
      <div className="card table-wrap">
        <table>
          <thead><tr><th>#OS</th><th>Aerolínea</th><th>Estación</th><th>Vuelo</th><th>Entrada</th><th>Salida</th><th>Estatus</th><th /></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td><Link to={`/ordenes/${o.id}`}>{o.code}</Link></td>
                <td>{o.airline}</td><td>{o.airport}</td><td>{o.flight}</td>
                <td>{String(o.date_in).slice(0, 10)}</td><td>{String(o.date_out).slice(0, 10)}</td>
                <td><StatusBadge status={o.status} /></td>
                <td>{o.status === 'open' && can('orders.close') && <button className="link" onClick={() => close(o)}>Cerrar</button>}</td>
              </tr>
            ))}
            {!orders.length && <tr><td colSpan="8" className="muted">Sin órdenes</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}
