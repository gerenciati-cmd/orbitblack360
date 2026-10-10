import { useCallback, useEffect, useState } from 'react'
import { NavLink, Navigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { CATALOGS } from '../catalogs'

const show = (v) => (v === true ? 'Sí' : v === false ? 'No' : v ?? '')

function initial(def) {
  return Object.fromEntries(def.fields.map((f) => [f.key, f.type === 'bool' ? false : '']))
}

// Convierte el formulario al payload de la API (vacío opcional => se omite).
function payload(def, form) {
  const out = {}
  for (const f of def.fields) {
    const v = form[f.key]
    if (f.type === 'bool') out[f.key] = !!v
    else if (v === '' || v == null) { if (!f.optional) out[f.key] = v }
    else out[f.key] = f.type === 'select' ? Number(v) : v
  }
  return out
}

export default function Catalogs() {
  const { entity } = useParams()
  const def = CATALOGS.find((c) => c.key === entity)
  const { can } = useAuth()
  const manage = can('catalogs.manage')
  const [rows, setRows] = useState([])
  const [options, setOptions] = useState({})
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!def) return
    setRows(await api(`/catalogs/${def.key}`))
    const need = [...new Set(def.fields.filter((f) => f.type === 'select').map((f) => f.options))]
    const loaded = await Promise.all(need.map((k) => api(`/catalogs/${k}`)))
    setOptions(Object.fromEntries(need.map((k, i) => [k, loaded[i]])))
  }, [def])

  useEffect(() => {
    if (!def) return
    setForm(initial(def))
    setError('')
    load().catch((e) => setError(e.message))
  }, [def, load])

  if (!def) return <Navigate to="/catalogos/countries" replace />

  async function run(fn) {
    setError('')
    try { await fn(); await load() } catch (err) { setError(err.message) }
  }
  const create = (e) => {
    e.preventDefault()
    run(async () => {
      await api(`/catalogs/${def.key}`, { method: 'POST', body: payload(def, form) })
      setForm(initial(def))
    })
  }
  const remove = (r) => confirm(`¿Eliminar "${r.label ?? r.name}"?`) && run(() => api(`/catalogs/${def.key}/${r.id}`, { method: 'DELETE' }))

  return (
    <>
      <h1>Catálogos</h1>
      <div className="tabs">
        {CATALOGS.map((c) => <NavLink key={c.key} to={`/catalogos/${c.key}`} className="tab">{c.label}</NavLink>)}
      </div>
      {error && <div className="error" role="alert">{error}</div>}

      {manage && form && (
        <form className="card grid" onSubmit={create}>
          {def.fields.map((f) => f.type === 'select' ? (
            <select key={f.key} required={!f.optional} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} aria-label={f.label}>
              <option value="">{f.label}{f.optional ? ' (opcional)' : '…'}</option>
              {(options[f.options] || []).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          ) : f.type === 'bool' ? (
            <label key={f.key} className="check">
              <input type="checkbox" checked={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })} /> {f.label}
            </label>
          ) : (
            <input key={f.key} placeholder={f.label} required={!f.optional} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
          ))}
          <button className="btn">Agregar</button>
        </form>
      )}

      <div className="card table-wrap">
        <table>
          <thead><tr>{def.columns.map(([, l]) => <th key={l}>{l}</th>)}{manage && <th />}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                {def.columns.map(([k]) => <td key={k}>{show(r[k])}</td>)}
                {manage && <td><button className="link danger" onClick={() => remove(r)}>Eliminar</button></td>}
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={def.columns.length + 1} className="muted">Sin registros</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}
