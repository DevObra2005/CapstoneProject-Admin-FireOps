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
 * in at all. Redirecting them reloads the page, which wipes the inline
 * error message before it can be read.
 *
 * Paths are matched with includes() against the relative URL passed to
 * api.post() — e.g. '/participant/change-password'.
 */
const PUBLIC_AUTH_PATHS = [
    '/login',                       // admin + staff sign-in
    '/register/',                   // public enrolment: /register/{token}
    '/participant/change-password',
    '/staff/change-password',
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

        // A 401 only means "session expired" if there was a session to
        // expire. With no token in storage the user was never signed in,
        // so the 401 must be a credentials failure on a public page —
        // and redirecting would reload it and wipe the error message.
        // This covers every public page automatically, including ones
        // added later that nobody remembers to list above.
        const hasSession = !!localStorage.getItem('token')

        if (error.response?.status === 401 && hasSession && !isPublicAuth) {
            localStorage.removeItem('token')
            localStorage.removeItem('role')
            localStorage.removeItem('first_name')
            localStorage.removeItem('last_name')
            window.location.href = '/login'
        }

        return Promise.reject(error)
    }
)

export default api