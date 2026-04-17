import { useEffect, useState } from "react"
import L from "leaflet"

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
})

export default function LocationPickerLeafletImpl({
  onLocationChange,
  initialLat,
  initialLng,
  initialAddress = "",
}) {
  const [map, setMap] = useState(null)
  const [marker, setMarker] = useState(null)
  const [address, setAddress] = useState(initialAddress)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isClient, setIsClient] = useState(false)
  const [mapId] = useState(() => `location-map-${Math.random().toString(36).substr(2, 9)}`)
  const [mapError, setMapError] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient) return

    const timer = setTimeout(() => {
      const mapElement = document.getElementById(mapId)
      if (!mapElement || map) return

      try {
        const leafletMap = L.map(mapId, {
          touchZoom: true,
          doubleClickZoom: true,
        }).setView([initialLat || 50.5039, initialLng || 4.4699], 13)

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
        }).addTo(leafletMap)

        const initialMarker = L.marker([initialLat || 50.5039, initialLng || 4.4699]).addTo(
          leafletMap
        )

        leafletMap.on("click", (event) => {
          const { lat, lng } = event.latlng
          updateMarker(lat, lng)
          reverseGeocode(lat, lng)
        })

        setMap(leafletMap)
        setMarker(initialMarker)
      } catch (error) {
        console.error("Erreur lors de l'initialisation de la carte:", error)
        setMapError(true)
      }
    }, 100)

    return () => {
      clearTimeout(timer)
      if (map) {
        map.remove()
      }
    }
  }, [initialLat, initialLng, isClient, map, mapId])

  const updateMarker = (lat, lng) => {
    if (marker) {
      marker.setLatLng([lat, lng])
    }
    onLocationChange({ lat, lng, address })
  }

  const reverseGeocode = async (lat, lng) => {
    try {
      setIsGeocoding(true)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      )
      const data = await response.json()

      if (data.display_name) {
        const newAddress = data.display_name
        setAddress(newAddress)
        onLocationChange({ lat, lng, address: newAddress })
      }
    } catch (error) {
      console.error("Erreur de geocodage inverse:", error)
    } finally {
      setIsGeocoding(false)
    }
  }

  const geocodeAddress = async (query) => {
    if (!query.trim()) return

    try {
      setIsGeocoding(true)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
      )
      const data = await response.json()

      if (data.length > 0) {
        const { lat, lon, display_name } = data[0]
        const latNum = Number.parseFloat(lat)
        const lngNum = Number.parseFloat(lon)

        setAddress(display_name)
        updateMarker(latNum, lngNum)

        if (map) {
          map.setView([latNum, lngNum], 16)
        }
      }
    } catch (error) {
      console.error("Erreur de geocodage:", error)
    } finally {
      setIsGeocoding(false)
    }
  }

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    geocodeAddress(searchQuery)
  }

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          updateMarker(latitude, longitude)
          reverseGeocode(latitude, longitude)

          if (map) {
            map.setView([latitude, longitude], 16)
          }
        },
        (error) => {
          console.error("Erreur de geolocalisation:", error)
          alert("Impossible d'obtenir votre position")
        }
      )
    } else {
      alert("La geolocalisation n'est pas supportee par votre navigateur")
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">Adresse du restaurant</label>
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Rechercher une adresse..."
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-emerald-300/60 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isGeocoding}
            className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm text-white hover:bg-emerald-600 disabled:bg-gray-600 sm:w-auto sm:whitespace-nowrap"
          >
            {isGeocoding ? "Recherche..." : "Rechercher"}
          </button>
        </form>

        <button
          type="button"
          onClick={handleGetCurrentLocation}
          className="w-full rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600 sm:w-auto"
        >
          Utiliser ma position actuelle
        </button>

        {address && (
          <div className="rounded-lg border border-white/10 bg-slate-950 p-3">
            <p className="text-sm text-gray-300">{address}</p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          Localisation sur la carte (cliquez pour positionner)
        </label>
        {!isClient ? (
          <div className="flex h-64 w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-100">
            <div className="text-gray-500">Chargement de la carte...</div>
          </div>
        ) : mapError ? (
          <div className="flex h-64 w-full items-center justify-center rounded-lg border border-red-200 bg-red-50">
            <div className="text-center text-red-500">
              <p className="text-sm">Erreur de chargement de la carte</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 rounded bg-red-500 px-3 py-1 text-xs text-white"
                type="button"
              >
                Reessayer
              </button>
            </div>
          </div>
        ) : (
          <div
            id={mapId}
            className="location-picker-map h-64 w-full rounded-lg border border-gray-200"
          />
        )}
      </div>
    </div>
  )
}
