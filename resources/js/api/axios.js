import axios from 'axios'

const api = axios.create({
    baseURL: '/api',
})

/*
 * Endpoints where a 401 means "wrong credentials", NOT "session expired".
 *
 * The response interceptor below redirects to /login on 401, which is
 * correct for authenticated staff pages — an expired token should send
 * you back to sign in. But public endpoints that verify credentials
 * also answer 401 on a bad password, and there the user is not logged
 * in at all. Redirecting them wipes the page and sends them somewhere
 * they have no account for.
 *
 * Paths listed here are matched with includes(), so they're checked
 * against the relative URL passed to api.post() — e.g.
 * '/participant/change-password'.
 */
const PUBLIC_AUTH_PATHS = [
    '/participant/change-password',
    '/participant/login',
    '/forgot-password',
    '/reset-password',
]

// REQUEST interceptor
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// RESPONSE interceptor
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const url = error.config?.url || ''
        const isPublicAuth = PUBLIC_AUTH_PATHS.some(path => url.includes(path))

        // Only treat a 401 as an expired session on protected routes.
        // On public auth endpoints, let the error reach the component's
        // catch block so it can render "incorrect password" inline.
        if (error.response?.status === 401 && !isPublicAuth) {
            localStorage.removeItem('token')
            localStorage.removeItem('role')
            window.location.href = '/login'
        }

        return Promise.reject(error)
    }
)

export default api