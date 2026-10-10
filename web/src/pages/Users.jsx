import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'

const empty = { name: '', email: '', password: '', roleId: '' }

export default function Users() {
  const { can, session } = useAuth()
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const manage = can('users.manage')

  const load = useCallback(async () => {
    const [u, r] = await Promise.all([api('/users'), can('roles.read') ? api('/roles') : []])
    setUsers(u)
    setRoles(r)
  }, [can])

  useEffect(() => {
    load().catch((e) => setError(e.message))
  }, [load])

  async function run(fn) {
    setError('')
    try {
      await fn()
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const create = (e) => {
    e.preventDefault()
    run(async () => {
      await api('/users', { method: 'POST', body: { ...form, roleId: Number(form.roleId) } })
      setForm(empty)
    })
  }
  const changeRole = (id, roleId) => run(() => api(`/users/${id}`, { method: 'PATCH', body: { roleId: Number(roleId) } }))
  const remove = (u) => confirm(`¿Quitar a ${u.name} de esta empresa?`) && run(() => api(`/users/${u.id}`, { method: 'DELETE' }))

  return (
    <>
      <h1>Usuarios</h1>
      {error && <div className="error" role="alert">{error}</div>}

      {manage && (
        <form className="card grid" onSubmit={create}>
          <input placeholder="Nombre" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input type="email" placeholder="Correo" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input type="password" placeholder="Contraseña (mín. 8)" minLength={8} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <select required value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>
            <option value="">Rol…</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <button className="btn">Agregar</button>
        </form>
      )}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>Nombre</th><th>Correo</th><th>Rol</th>{manage && <th />}</tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>
                  {manage && u.id !== session.user.id && roles.length ? (
                    <select value={u.roleId} onChange={(e) => changeRole(u.id, e.target.value)}>
                      {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  ) : u.role}
                </td>
                {manage && (
                  <td>{u.id !== session.user.id && <button className="link danger" onClick={() => remove(u)}>Quitar</button>}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
