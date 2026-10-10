import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

const today = () => new Date().toISOString().slice(0, 10)

export default function OrderNew() {
  const nav = useNavigate()
  const [lists, setLists] = useState(null)
  const [form, setForm] = useState({ airport_id: '', airline_id: '', event_type_id: '', flight: '', date_in: today(), date_out: today(), hour: '' })
  const [rooms, setRooms] = useState({}) // hotel_id -> habitaciones
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Promise.all(['airports', 'airline-airports', 'hotels', 'event-types'].map((k) => api(`/catalogs/${k}`)))
      .then(([airports, links, hotels, events]) => setLists({ airports, links, hotels, events }))
      .catch((e) => setError(e.message))
  }, [])

  const airportId = Number(form.airport_id)
  // Solo se ofrecen aerolíneas y hoteles de la estación elegida.
  const airlines = useMemo(() => (lists?.links || []).filter((l) => l.airport_id === airportId), [lists, airportId])
  const hotels = useMemo(() => (lists?.hotels || []).filter((h) => h.airport_id === airportId && h.active), [lists, airportId])
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  function pickAirport(e) {
    setForm({ ...form, airport_id: e.target.value, airline_id: '' })
    setRooms({})
  }

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await api('/orders', {
        method: 'POST',
        body: {
          airport_id: airportId,
          airline_id: Number(form.airline_id),
          event_type_id: Number(form.event_type_id),
          flight: form.flight, date_in: form.date_in, date_out: form.date_out, hour: form.hour,
          hotels: Object.entries(rooms).filter(([, n]) => Number(n) > 0).map(([id, n]) => ({ hotel_id: Number(id), rooms: Number(n) })),
        },
      })
      nav(`/ordenes/${res.id}`)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  if (!lists) return <p className="muted">{error || 'Cargando…'}</p>

  return (
    <>
      <h1>Nueva orden de servicio</h1>
      <form className="card" onSubmit={submit}>
        <label>Estación
          <select required value={form.airport_id} onChange={pickAirport}>
            <option value="">Selecciona…</option>
            {lists.airports.filter((a) => a.active).map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        </label>
        <label>Aerolínea
          <select required value={form.airline_id} onChange={set('airline_id')} disabled={!airportId}>
            <option value="">{airportId ? 'Selecciona…' : 'Primero elige la estación'}</option>
            {airlines.map((l) => <option key={l.airline_id} value={l.airline_id}>{l.airline}</option>)}
          </select>
        </label>
        <label>Evento
          <select required value={form.event_type_id} onChange={set('event_type_id')}>
            <option value="">Selecciona…</option>
            {lists.events.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </label>
        <div className="grid3">
          <label>Vuelo<input value={form.flight} onChange={set('flight')} /></label>
          <label>Hora<input type="time" value={form.hour} onChange={set('hour')} /></label>
        </div>
        <div className="grid3">
          <label>Fecha de entrada<input type="date" required value={form.date_in} onChange={set('date_in')} /></label>
          <label>Fecha de salida<input type="date" required min={form.date_in} value={form.date_out} onChange={set('date_out')} /></label>
        </div>

        <h3 style={{ marginTop: '1.25rem' }}>Hoteles</h3>
        {!airportId && <p className="muted">Elige una estación para ver sus hoteles.</p>}
        {airportId > 0 && !hotels.length && <p className="muted">Esta estación no tiene hoteles activos.</p>}
        {hotels.map((h) => (
          <label key={h.id} className="hotel-row">
            <span>{h.name}</span>
            <input type="number" min="0" placeholder="Habitaciones" value={rooms[h.id] ?? ''} onChange={(e) => setRooms({ ...rooms, [h.id]: e.target.value })} />
          </label>
        ))}

        {error && <div className="error" role="alert">{error}</div>}
        <button className="btn" disabled={busy} style={{ marginTop: '1rem' }}>{busy ? 'Creando…' : 'Crear orden'}</button>
      </form>
    </>
  )
}
