// Cliente de API. El access token vive solo en memoria; el refresh va en cookie httpOnly.
let accessToken = null
let refreshing = null

export const setToken = (t) => { accessToken = t }

async function raw(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    credentials: 'same-origin',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  return { res, data }
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

// Renueva la sesión una sola vez aunque fallen varias peticiones a la vez.
export function refreshSession() {
  refreshing ??= raw('/auth/refresh', { method: 'POST', auth: false })
    .then(({ res, data }) => {
      if (!res.ok) {
        accessToken = null
        return null
      }
      accessToken = data.accessToken
      return data
    })
    .finally(() => { refreshing = null })
  return refreshing
}

export async function api(path, opts) {
  let { res, data } = await raw(path, opts)
  if (res.status === 401 && opts?.auth !== false && !path.startsWith('/auth/')) {
    if (await refreshSession()) ({ res, data } = await raw(path, opts))
  }
  if (!res.ok) throw new ApiError(data.error || 'Error de servidor', res.status)
  return data
}
