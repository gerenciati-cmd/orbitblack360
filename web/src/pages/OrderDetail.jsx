import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { StatusBadge } from './Orders'

const d = (v) => String(v).slice(0, 10)

export default function OrderDetail() {
  const { id } = useParams()
  const { can } = useAuth()
  const [o, setO] = useState(null)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => setO(await api(`/orders/${id}`)), [id])
  useEffect(() => { load().catch((e) => setError(e.message)) }, [load])

  async function run(fn) {
    setError('')
    try { await fn(); await load() } catch (e) { setError(e.message) }
  }
  const toggle = () => run(() => api(`/orders/${id}/${o.status === 'open' ? 'close' : 'reopen'}`, { method: 'POST' }))
  const addComment = (e) => {
    e.preventDefault()
    run(async () => { await api(`/orders/${id}/comments`, { method: 'POST', body: { comment } }); setComment('') })
  }

  if (!o) return <p className={error ? 'error' : 'muted'}>{error || 'Cargando…'}</p>

  return (
    <>
      <p><Link to="/ordenes">← Órdenes</Link></p>
      <div className="row">
        <h1>{o.code} <StatusBadge status={o.status} /></h1>
        {can('orders.close') && <button className="btn" onClick={toggle}>{o.status === 'open' ? 'Cerrar orden' : 'Reabrir orden'}</button>}
      </div>
      {error && <div className="error" role="alert">{error}</div>}

      <div className="card facts">
        <div><small>Aerolínea</small>{o.airline}</div>
        <div><small>Estación</small>{o.airport}</div>
        <div><small>Evento</small>{o.event}</div>
        <div><small>Vuelo</small>{o.flight || '—'}</div>
        <div><small>Entrada</small>{d(o.date_in)} {o.hour}</div>
        <div><small>Salida</small>{d(o.date_out)}</div>
        <div><small>Creada por</small>{o.created_by_name}</div>
      </div>

      <div className="card table-wrap">
        <table>
          <thead><tr><th>Hotel</th><th>Habitaciones</th><th>Disponibles</th></tr></thead>
          <tbody>
            {o.hotels.map((h) => <tr key={h.id}><td>{h.name}</td><td>{h.rooms}</td><td>{h.rooms_available}</td></tr>)}
            {!o.hotels.length && <tr><td colSpan="3" className="muted">Sin hoteles</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Comentarios</h3>
        {o.comments.map((c) => (
          <p key={c.id} className="comment"><strong>{c.user}</strong> <small className="muted">{String(c.created_at).slice(0, 16).replace('T', ' ')}</small><br />{c.comment}</p>
        ))}
        {!o.comments.length && <p className="muted">Sin comentarios</p>}
        <form onSubmit={addComment} className="comment-form">
          <input placeholder="Agregar comentario…" required maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} />
          <button className="btn">Enviar</button>
        </form>
      </div>
    </>
  )
}
