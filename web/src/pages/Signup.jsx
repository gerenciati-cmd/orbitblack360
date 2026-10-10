import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth'

export default function Signup() {
  const { signup } = useAuth()
  const [form, setForm] = useState({ company: '', name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await signup(form)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="center">
      <form className="card login" onSubmit={submit}>
        <div className="brand big">Orbit<span>Black</span>360</div>
        <p className="muted">Prueba gratis 14 días. Sin tarjeta.</p>
        <label>Empresa<input required minLength={2} value={form.company} onChange={set('company')} /></label>
        <label>Tu nombre<input required autoComplete="name" value={form.name} onChange={set('name')} /></label>
        <label>Correo<input type="email" required autoComplete="username" value={form.email} onChange={set('email')} /></label>
        <label>Contraseña (mín. 8)<input type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={set('password')} /></label>
        {error && <div className="error" role="alert">{error}</div>}
        <button className="btn" disabled={busy}>{busy ? 'Creando cuenta…' : 'Crear cuenta'}</button>
        <p className="muted" style={{ textAlign: 'center' }}>¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></p>
      </form>
    </div>
  )
}
