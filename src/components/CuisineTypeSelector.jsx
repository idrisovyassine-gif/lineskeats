import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getDisplayCuisineLabel } from '../lib/cuisineLabels'

const COLOR_TOKEN_TO_HEX = {
  'emerald-500': '#10b981',
  'green-500': '#22c55e',
  'green-600': '#16a34a',
  'green-700': '#15803d',
  'red-500': '#ef4444',
  'red-600': '#dc2626',
  'pink-500': '#ec4899',
  'orange-500': '#f97316',
  'orange-600': '#ea580c',
  'yellow-500': '#eab308',
  'blue-500': '#3b82f6',
  'blue-600': '#2563eb',
  'purple-500': '#a855f7',
  'purple-600': '#9333ea',
  'amber-500': '#f59e0b',
  'amber-600': '#d97706',
  'indigo-500': '#6366f1',
  // non-standard token seen in migrations
  'brown-500': '#a16207',
}

const resolveCuisineColor = (raw) => {
  if (!raw) return COLOR_TOKEN_TO_HEX['emerald-500']

  let value = String(raw).trim()

  // Accept true hex colors (e.g. "#10b981")
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value

  // Some rows store tokens like "#emerald-500"
  if (value.startsWith('#')) value = value.slice(1)

  return COLOR_TOKEN_TO_HEX[value] || COLOR_TOKEN_TO_HEX['emerald-500']
}

const withAlpha = (hex, alphaHex) => {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex
  return `${hex}${alphaHex}`
}

export default function CuisineTypeSelector({ selectedCuisines, onCuisineChange }) {
  const [cuisineTypes, setCuisineTypes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadCuisineTypes = async () => {
      try {
        const { data, error } = await supabase
          .from('cuisine_types')
          .select('*')
          .order('name')

        if (error) {
          console.error('Erreur lors du chargement des types de cuisine:', error)
        } else {
          setCuisineTypes(data || [])
        }
      } catch (error) {
        console.error('Erreur:', error)
      } finally {
        setLoading(false)
      }
    }

    loadCuisineTypes()
  }, [])

  const toggleCuisine = (cuisineId) => {
    const newSelection = selectedCuisines.includes(cuisineId)
      ? selectedCuisines.filter(id => id !== cuisineId)
      : [...selectedCuisines, cuisineId]
    
    onCuisineChange(newSelection)
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          Types de cuisine
        </label>
        <div className="flex items-center justify-center py-4">
          <div className="text-gray-500 text-sm">Chargement...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-300">
        Types de cuisine <span className="text-gray-500">(sélectionnez autant que vous voulez)</span>
      </label>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {cuisineTypes.map((cuisine) => {
          const isSelected = selectedCuisines.includes(cuisine.id)
          const accent = resolveCuisineColor(cuisine.color)
          
          return (
            <button
              key={cuisine.id}
              type="button"
              onClick={() => toggleCuisine(cuisine.id)}
              style={
                isSelected
                  ? { borderColor: accent, backgroundColor: withAlpha(accent, '1a') }
                  : undefined
              }
              className={[
                'relative overflow-hidden rounded-lg border-2 p-3 text-center transition-all duration-200',
                isSelected
                  ? 'shadow-lg scale-105'
                  : 'border-white/10 bg-slate-950 hover:border-white/20 hover:bg-slate-900',
              ].join(' ')}
            >
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl">{cuisine.icon || '🍽️'}</span>
                <span className="text-xs font-medium text-white">
                  {getDisplayCuisineLabel(cuisine.name)}
                </span>
              </div>
              
              {isSelected && (
                <div
                  className="absolute top-1 right-1 h-2 w-2 rounded-full"
                  style={{ backgroundColor: accent }}
                />
              )}
            </button>
          )
        })}
      </div>

      {selectedCuisines.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-gray-400 mb-2">
            Types sélectionnés ({selectedCuisines.length}):
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedCuisines.map(cuisineId => {
              const cuisine = cuisineTypes.find(c => c.id === cuisineId)
              const accent = resolveCuisineColor(cuisine?.color)
              return cuisine ? (
                <span
                  key={cuisineId}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-white"
                  style={{ backgroundColor: withAlpha(accent, '33') }}
                >
                  <span>{cuisine.icon}</span>
                  <span>{getDisplayCuisineLabel(cuisine.name)}</span>
                </span>
              ) : null
            })}
          </div>
        </div>
      )}
    </div>
  )
}
