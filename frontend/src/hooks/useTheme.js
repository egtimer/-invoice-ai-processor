import { useState, useEffect } from 'react'

/**
 * Custom hook for managing theme (light/dark mode) with localStorage persistence
 * 
 * This hook provides:
 * - Current theme state (light or dark)
 * - Function to toggle between themes
 * - Automatic persistence in localStorage
 * - Synchronization with system preferences on first visit
 */
export function useTheme() {
  // Initialize theme from localStorage or system preference
  const [theme, setTheme] = useState(() => {
    // Check if user has a saved preference in localStorage
    const savedTheme = localStorage.getItem('invoice-ai-theme')
    if (savedTheme) {
      return savedTheme
    }
    
    // If no saved preference, check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    
    // Default to light theme
    return 'light'
  })

  // Persist theme changes to localStorage
  useEffect(() => {
    localStorage.setItem('invoice-ai-theme', theme)
    
    // Update document root class for CSS styling
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(theme)
  }, [theme])

  // Function to toggle between light and dark themes
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light')
  }

  return { theme, toggleTheme }
}
