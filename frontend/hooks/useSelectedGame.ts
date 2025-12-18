import { useState, useEffect, useCallback } from 'react'

// Criar um evento customizado para notificar mudanças
const GAME_SELECTED_EVENT = 'gameSelected'

export function useSelectedGame() {
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null)

  // Carregar do localStorage na inicialização
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('selectedGameId')
      if (stored) {
        const gameId = parseInt(stored)
        if (!isNaN(gameId)) {
          setSelectedGameId(gameId)
        }
      }
    }
  }, [])
  
  // Listener para mudanças no localStorage (de outras abas) e evento customizado (mesma aba)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'selectedGameId') {
        const stored = e.newValue
        if (stored) {
          const gameId = parseInt(stored)
          if (!isNaN(gameId)) {
            setSelectedGameId(gameId)
          }
        } else {
          setSelectedGameId(null)
        }
      }
    }
    
    // Listener para evento customizado (mesma aba)
    const handleGameSelected = (e: Event) => {
      const customEvent = e as CustomEvent<number | null>
      setSelectedGameId(customEvent.detail)
    }
    
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener(GAME_SELECTED_EVENT, handleGameSelected as EventListener)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener(GAME_SELECTED_EVENT, handleGameSelected as EventListener)
    }
  }, [])

  const setGameId = useCallback((gameId: number | null) => {
    setSelectedGameId(gameId)
    if (typeof window !== 'undefined') {
      if (gameId) {
        localStorage.setItem('selectedGameId', gameId.toString())
        // Disparar evento customizado para notificar outros componentes na mesma aba
        window.dispatchEvent(new CustomEvent(GAME_SELECTED_EVENT, { detail: gameId }))
      } else {
        localStorage.removeItem('selectedGameId')
        window.dispatchEvent(new CustomEvent(GAME_SELECTED_EVENT, { detail: null }))
      }
    }
  }, [])

  return { selectedGameId, setGameId }
}

