import { useEffect, useMemo, useState } from "react"
import { Map, Marker } from "@vis.gl/react-google-maps"
import GoogleMapsApiProvider from "./GoogleMapsApiProvider"
import {
  GOOGLE_MAPS_DEFAULT_CENTER,
  GOOGLE_MAPS_SETUP_HINT,
  hasGoogleMapsApiKey,
} from "../lib/googleMaps"

export default function LocationPicker({
  onLocationChange,
  initialLat,
  initialLng,
  initialAddress = "",
}) {
  const initialPosition = useMemo(
    () => ({
      lat: Number(initialLat) || GOOGLE_MAPS_DEFAULT_CENTER.lat,
      lng: Number(initialLng) || GOOGLE_MAPS_DEFAULT_CENTER.lng,
    }),
    [initialLat, initialLng]
  )
  const [position, setPosition] = useState(initialPosition)
  const [address, setAddress] = useState(initialAddress)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [mapCenter, setMapCenter] = useState(initialPosition)
  const [mapZoom, setMapZoom] = useState(initialLat && initialLng ? 13 : 11)
  const [isMapsReady, setIsMapsReady] = useState(false)
  const [mapsLoadError, setMapsLoadError] = useState("")

  useEffect(() => {
    setPosition(initialPosition)
    setMapCenter(initialPosition)
  }, [initialPosition])

  const updateMarker = (lat, lng, nextAddress = address) => {
    const nextPosition = { lat, lng }
    setPosition(nextPosition)
    setMapCenter(nextPosition)
    onLocationChange({ lat, lng, address: nextAddress })
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
        setMapZoom(16)
        updateMarker(latNum, lngNum, display_name)
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
    if (!navigator.geolocation) {
      alert("La geolocalisation n est pas supportee par votre navigateur")
      return
    }

    navigator.geolocation.getCurrentPosition(
      (currentPosition) => {
        const { latitude, longitude } = currentPosition.coords
        setMapZoom(16)
        updateMarker(latitude, longitude)
        reverseGeocode(latitude, longitude)
      },
      (error) => {
        console.error("Erreur de geolocalisation:", error)
        alert("Impossible d obtenir votre position")
      }
    )
  }

  if (!hasGoogleMapsApiKey) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-rose-400/30 bg-slate-950 p-4 text-sm text-rose-200">
          Google Maps n est pas configure. Ajoute `VITE_GOOGLE_MAPS_API_KEY` dans `.env.local`.
        </div>
      </div>
    )
  }

  if (mapsLoadError) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-rose-400/30 bg-slate-950 p-4 text-sm text-rose-200">
          <p>Google Maps n a pas pu se charger.</p>
          <p className="mt-2 text-xs text-slate-300">{mapsLoadError}</p>
          <p className="mt-2 text-xs text-slate-400">{GOOGLE_MAPS_SETUP_HINT}</p>
        </div>
      </div>
    )
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

        {address ? (
          <div className="rounded-lg border border-white/10 bg-slate-950 p-3">
            <p className="text-sm text-gray-300">{address}</p>
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          Localisation sur la carte (cliquez pour positionner)
        </label>
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <GoogleMapsApiProvider
            onLoad={() => {
              setIsMapsReady(true)
              setMapsLoadError("")
            }}
            onError={(message) => {
              setIsMapsReady(false)
              setMapsLoadError(String(message || "Google Maps n a pas pu se charger."))
            }}
          >
            {isMapsReady ? (
              <Map
                center={mapCenter}
                zoom={mapZoom}
                gestureHandling="greedy"
                mapTypeControl={false}
                streetViewControl={false}
                fullscreenControl={false}
                style={{ width: "100%", height: "16rem" }}
                onClick={(event) => {
                  if (!event.detail.latLng) return
                  const { lat, lng } = event.detail.latLng
                  updateMarker(lat, lng)
                  reverseGeocode(lat, lng)
                }}
              >
                <Marker position={position} />
              </Map>
            ) : (
              <div className="flex h-64 items-center justify-center bg-slate-950 text-sm text-slate-300">
                Chargement de Google Maps...
              </div>
            )}
          </GoogleMapsApiProvider>
        </div>
      </div>
    </div>
  )
}
