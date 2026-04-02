import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function WaitTimeManager({ 
  restaurantId, 
  currentWaitTime, 
  currentMode,
  baseWaitTime,
  maxWaitTime,
  capacityThreshold,
  onWaitTimeChange,
  onModeChange,
  onSettingsChange
}) {
  const [occupancy, setOccupancy] = useState(0)
  const [estimatedWaitTime, setEstimatedWaitTime] = useState(currentWaitTime || 15)
  const [manualWaitTimeInput, setManualWaitTimeInput] = useState(
    String(currentWaitTime || 15)
  )
  const [isLoading, setIsLoading] = useState(false)

  // Calcul du temps d'attente estimé selon l'occupation
  const calculateDynamicWaitTime = (currentOccupancy) => {
    if (!baseWaitTime || !capacityThreshold) return 15
    
    // Formule progressive : plus il y a de monde, plus le temps augmente
    const occupancyRatio = currentOccupancy / capacityThreshold
    
    if (occupancyRatio <= 0.3) {
      return baseWaitTime // Peu de monde
    } else if (occupancyRatio <= 0.6) {
      return Math.ceil(baseWaitTime * 1.5) // Moitié plein
    } else if (occupancyRatio <= 0.8) {
      return Math.ceil(baseWaitTime * 2) // Presque plein
    } else {
      return Math.min(maxWaitTime || 60, Math.ceil(baseWaitTime * 2.5)) // Plein ou presque
    }
  }

  // Mise à jour de l'occupation
  const updateOccupancy = async (newOccupancy) => {
    if (!restaurantId) return
    
    setIsLoading(true)
    try {
      const newWaitTime = calculateDynamicWaitTime(newOccupancy)
      
      const { error } = await supabase
        .from('restaurant_occupancy')
        .upsert({
          restaurant_id: restaurantId,
          current_occupancy: newOccupancy,
          estimated_wait_time: newWaitTime,
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'restaurant_id'
        })

      if (error) {
        console.error('Erreur lors de la mise à jour de l\'occupation:', error)
      } else {
        setOccupancy(newOccupancy)
        setEstimatedWaitTime(newWaitTime)
        onWaitTimeChange(newWaitTime)
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Synchronisation avec le mode
  useEffect(() => {
    if (currentMode === 'dynamic') {
      const newWaitTime = calculateDynamicWaitTime(occupancy)
      setEstimatedWaitTime(newWaitTime)
      onWaitTimeChange(newWaitTime)
    } else if (currentMode === 'manual') {
      setEstimatedWaitTime(currentWaitTime)
    }
  }, [currentMode, occupancy, currentWaitTime, baseWaitTime, capacityThreshold])

  useEffect(() => {
    setManualWaitTimeInput(String(currentWaitTime || 15))
  }, [currentWaitTime])

  const getOccupancyColor = (ratio) => {
    if (ratio <= 0.3) return 'text-green-500'
    if (ratio <= 0.6) return 'text-yellow-500'
    if (ratio <= 0.8) return 'text-orange-500'
    return 'text-red-500'
  }

  const getOccupancyStatus = (ratio) => {
    if (ratio <= 0.3) return 'Calme'
    if (ratio <= 0.6) return 'Modéré'
    if (ratio <= 0.8) return 'Chargé'
    return 'Plein'
  }

  const occupancyRatio = capacityThreshold ? occupancy / capacityThreshold : 0

  const handleModeSelect = (mode) => {
    onModeChange(mode)
  }

  const handleManualWaitTimeChange = (value) => {
    setManualWaitTimeInput(value)

    const nextWaitTime = parseInt(value, 10)
    if (Number.isNaN(nextWaitTime)) return

    onWaitTimeChange(nextWaitTime)
    setEstimatedWaitTime(nextWaitTime)
  }

  const getDynamicWaitTimeForSettings = (settings = {}) => {
    const nextBaseWaitTime = settings.baseWaitTime ?? baseWaitTime
    const nextMaxWaitTime = settings.maxWaitTime ?? maxWaitTime
    const nextCapacityThreshold = settings.capacityThreshold ?? capacityThreshold

    if (!nextBaseWaitTime || !nextCapacityThreshold) {
      return 15
    }

    const occupancyRatio = occupancy / nextCapacityThreshold

    if (occupancyRatio <= 0.3) {
      return nextBaseWaitTime
    }

    if (occupancyRatio <= 0.6) {
      return Math.ceil(nextBaseWaitTime * 1.5)
    }

    if (occupancyRatio <= 0.8) {
      return Math.ceil(nextBaseWaitTime * 2)
    }

    return Math.min(nextMaxWaitTime || 60, Math.ceil(nextBaseWaitTime * 2.5))
  }

  return (
    <div className="space-y-6">
      {/* Sélecteur de mode */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-300">
          Mode de calcul du temps d'attente
        </label>
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { value: 'manual', label: 'Manuel', desc: 'Vous définissez le temps vous-même' },
            { value: 'dynamic', label: 'Dynamique', desc: 'Selon le nombre de clients' },
            { value: 'auto', label: 'Automatique', desc: 'Basé sur l\'historique' }
          ].map(mode => (
            <button
              key={mode.value}
              type="button"
              onClick={() => handleModeSelect(mode.value)}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                currentMode === mode.value
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-white/10 bg-slate-950 hover:border-white/20'
              }`}
            >
              <div className="text-sm font-medium text-white">{mode.label}</div>
              <div className="text-xs text-gray-400 mt-1">{mode.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Mode dynamique */}
      {currentMode === 'dynamic' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Nombre de clients actuels
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max={capacityThreshold || 50}
                value={occupancy}
                onChange={(e) => updateOccupancy(parseInt(e.target.value))}
                disabled={isLoading}
                className="flex-1"
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max={capacityThreshold || 50}
                  value={occupancy}
                  onChange={(e) => updateOccupancy(parseInt(e.target.value))}
                  disabled={isLoading}
                  className="w-16 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white text-center"
                />
                <span className={`text-sm font-medium ${getOccupancyColor(occupancyRatio)}`}>
                  {getOccupancyStatus(occupancyRatio)}
                </span>
              </div>
            </div>
            
            {capacityThreshold && (
              <div className="text-xs text-gray-400">
                Capacité: {occupancy}/{capacityThreshold} ({Math.round(occupancyRatio * 100)}%)
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Temps de base (minutes)
              </label>
              <input
                type="number"
                min="5"
                max="60"
                value={baseWaitTime || 15}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10)
                  if (Number.isNaN(value)) return
                  onSettingsChange({ baseWaitTime: value })
                  if (currentMode === 'dynamic') {
                    const nextWaitTime = getDynamicWaitTimeForSettings({ baseWaitTime: value })
                    setEstimatedWaitTime(nextWaitTime)
                    onWaitTimeChange(nextWaitTime)
                  }
                }}
                className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Temps maximum (minutes)
              </label>
              <input
                type="number"
                min="15"
                max="120"
                value={maxWaitTime || 60}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10)
                  if (Number.isNaN(value)) return
                  onSettingsChange({ maxWaitTime: value })
                  if (currentMode === 'dynamic') {
                    const nextWaitTime = getDynamicWaitTimeForSettings({ maxWaitTime: value })
                    setEstimatedWaitTime(nextWaitTime)
                    onWaitTimeChange(nextWaitTime)
                  }
                }}
                className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Capacité (clients)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={capacityThreshold || 10}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10)
                  if (Number.isNaN(value)) return
                  onSettingsChange({ capacityThreshold: value })
                  if (currentMode === 'dynamic') {
                    const nextWaitTime = getDynamicWaitTimeForSettings({ capacityThreshold: value })
                    setEstimatedWaitTime(nextWaitTime)
                    onWaitTimeChange(nextWaitTime)
                  }
                }}
                className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* Mode manuel */}
      {currentMode === 'manual' && (
        <div>
          <label className="block text-sm font-medium text-gray-300">
            Temps d'attente (minutes)
          </label>
          <input
            type="number"
            min="5"
            max="120"
            value={manualWaitTimeInput}
            onChange={(e) => handleManualWaitTimeChange(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </div>
      )}

      {/* Affichage du temps actuel */}
      <div className="rounded-lg border border-white/10 bg-slate-950 p-4">
        <div className="text-center">
          <div className="text-sm text-gray-400 mb-1">Temps d'attente actuel</div>
          <div className="text-3xl font-bold text-emerald-400">
            {estimatedWaitTime} min
          </div>
          {isLoading && (
            <div className="text-xs text-gray-500 mt-2">Mise à jour...</div>
          )}
        </div>
      </div>
    </div>
  )
}
