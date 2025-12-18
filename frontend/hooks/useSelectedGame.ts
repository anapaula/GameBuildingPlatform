import { useState, useEffect } from 'react'

export function useSelectedGame() {
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null)

  useEffect(() => {
    // Carregar do localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('selectedGameId')
      if (stored) {
        setSelectedGameId(parseInt(stored))
      }
    }
    
    // Listener para mudanças no localStorage (de outros componentes)
    const handleStorageChange = () => {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('selectedGameId')
        if (stored) {
          setSelectedGameId(parseInt(stored))
        } else {
          setSelectedGameId(null)
        }
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    // Polling para detectar mudanças no localStorage (mesma aba)
    const interval = setInterval(() => {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('selectedGameId')
        const currentId = stored ? parseInt(stored) : null
        if (currentId !== selectedGameId) {
          setSelectedGameId(currentId)
        }
      }
    }, 100)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [selectedGameId])

  const setGameId = (gameId: number | null) => {
    setSelectedGameId(gameId)
    if (typeof window !== 'undefined') {
      if (gameId) {
        localStorage.setItem('selectedGameId', gameId.toString())
      } else {
        localStorage.removeItem('selectedGameId')
      }
    }
  }

  return { selectedGameId, setGameId }
}

