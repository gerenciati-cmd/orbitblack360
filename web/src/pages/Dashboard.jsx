import { useAuth } from '../auth'

export default function Dashboard() {
  const { session } = useAuth()
  return (
    <>
      <h1>Hola, {session.user.name}</h1>
      <p className="muted">{session.tenant.name} · plan {session.tenant.plan}</p>
      <div className="card">
        <h3>Plataforma lista</h3>
        <p className="muted">
          Aquí irán los módulos del CRM. Módulos activos para esta empresa: {session.modules.join(', ')}.
        </p>
      </div>
    </>
  )
}
