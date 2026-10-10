import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, refreshSession, setToken } from './api'

const AuthContext = createContext(null)
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  const apply = useCallback((data) => {
    setToken(data?.accessToken ?? null)
    setSession(data ?? null)
  }, [])

  // Al abrir la app intenta recuperar la sesión con la cookie de refresh.
  useEffect(() => {
    refreshSession().then(apply).finally(() => setLoading(false))
  }, [apply])

  const value = useMemo(() => ({
    session,
    loading,
    can: (perm) => !!session?.permissions.includes(perm),
    hasModule: (m) => !!session?.modules.includes(m),
    login: async (email, password) => apply(await api('/auth/login', { method: 'POST', body: { email, password }, auth: false })),
    switchTenant: async (tenantId) => apply(await api('/auth/switch-tenant', { method: 'POST', body: { tenantId } })),
    logout: async () => {
      await api('/auth/logout', { method: 'POST', auth: false }).catch(() => {})
      apply(null)
    },
  }), [session, loading, apply])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
