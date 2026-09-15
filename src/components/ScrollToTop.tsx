import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    // The admin shell scrolls inside <main> rather than the window — reset
    // that too, otherwise navigating away from a scrolled-down admin page
    // leaves the next one scrolled down as well.
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  return null
}