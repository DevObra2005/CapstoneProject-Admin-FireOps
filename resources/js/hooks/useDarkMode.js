import { useEffect, useState } from 'react'

/*
 * useDarkMode
 * - Remembers 'light' or 'dark' in localStorage
 * - Applies it to <html data-theme="..."> so the whole app re-themes
 * Returns { isDark, toggle } for the button to use.
 */
export default function useDarkMode() {
    // Start from whatever was saved last time; default to light.
    const [theme, setTheme] = useState(
        () => localStorage.getItem('theme') || 'light'
    )

    // Runs whenever `theme` changes: paint the page + save the choice.
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
        localStorage.setItem('theme', theme)
    }, [theme])

    const toggle = () =>
        setTheme(current => (current === 'dark' ? 'light' : 'dark'))

    return { isDark: theme === 'dark', toggle }
}