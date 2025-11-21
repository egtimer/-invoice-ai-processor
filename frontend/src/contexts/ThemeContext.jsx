import { createContext, useContext } from 'react'
import { useTheme } from '../hooks/useTheme'

/**
 * Theme Context for providing theme state and toggle function to all components
 * 
 * This context makes the theme and toggleTheme function available to any component
 * in the app without prop drilling.
 */
const ThemeContext = createContext(undefined)

/**
 * Custom hook to consume the theme context
 * Throws an error if used outside of ThemeProvider
 */
export function useThemeContext() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useThemeContext must be used within ThemeProvider')
  }
  return context
}

/**
 * Theme Provider component that wraps the app and provides theme state
 */
export function ThemeProvider({ children }) {
  const { theme, toggleTheme } = useTheme()
  
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
