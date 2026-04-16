import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { APIProvider, InfoWindow, Map, Marker, useMap } from "@vis.gl/react-google-maps"
import {
  GOOGLE_MAPS_API_KEY,
  GOOGLE_MAPS_DEFAULT_CENTER,
  hasGoogleMapsApiKey,
} from "../lib/googleMaps"

function LocationMarker({ onLocationFound, onLocationError, autoLocate = false }) {
  const [position, setPosition] = useState(null)
  const [isLocating, setIsLocating] = useState(false)
  const map = useMap()
  const locateRequestRef = useRef(0)
  const hasAutoLocatedRef = useRef(false)

  const locateUser = useCallback(({ silent = false } = {}) => {
    setIsLocating(true)
    if (!silent) {
      onLocationError?.("")
    }

    const requestId = Date.now()
    locateRequestRef.current = requestId

    if (!window.isSecureContext) {
      if (!silent) {
        onLocationError?.(
          "La geolocalisation du navigateur demande HTTPS ou localhost. Sur telephone, l adresse 192.168.x.x en HTTP est souvent bloquee."
        )
      }
      setIsLocating(false)
      return
    }

    if (!navigator.geolocation) {
      if (!silent) {
        onLocationError?.("La geolocalisation n est pas disponible sur ce navigateur.")
      }
      setIsLocating(false)
      return
    }

    let hasResolved = false

    const applyPosition = (coords, zoomLevel) => {
      if (locateRequestRef.current !== requestId) return

      const nextPosition = {
        lat: coords.latitude,
        lng: coords.longitude,
      }

      setPosition(nextPosition)
      onLocationFound?.(nextPosition)

      if (map) {
        map.panTo(nextPosition)
        map.setZoom(zoomLevel)
      }

      if (!hasResolved) {
        hasResolved = true
        setIsLocating(false)
      }
    }

    const finishWithError = (error) => {
      if (locateRequestRef.current !== requestId || hasResolved) return

      const errorMessageByCode = {
        1: "Autorise la localisation pour ce site dans Safari.",
        2: "La position n a pas pu etre determinee. Reessaie avec le GPS actif.",
        3: "La demande de localisation a expire. Reessaie.",
      }

      if (!silent) {
        onLocationError?.(
          errorMessageByCode[error.code] || "Impossible de recuperer ta position."
        )
      }
      setIsLocating(false)
    }

    const requestPrecisePosition = () => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          applyPosition(coords, 18)
          setIsLocating(false)
        },
        (error) => {
          finishWithError(error)
        },
        {
          enableHighAccuracy: true,
          maximumAge: 30000,
          timeout: 10000,
        }
      )
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        applyPosition(coords, 17)
        requestPrecisePosition()
      },
      () => {
        requestPrecisePosition()
      },
      {
        enableHighAccuracy: false,
        maximumAge: 300000,
        timeout: 4000,
      }
    )
  }, [map, onLocationError, onLocationFound])

  useEffect(() => {
    if (!autoLocate || hasAutoLocatedRef.current) return

    hasAutoLocatedRef.current = true
    const timeoutId = window.setTimeout(() => {
      locateUser({ silent: true })
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [autoLocate, locateUser])

  return (
    <>
      <div className="absolute right-3 top-3 z-[1001] sm:right-4 sm:top-4">
        <button
          onClick={locateUser}
          className={`rounded-xl border border-white/15 p-2 shadow-md transition-colors ${
            isLocating
              ? "bg-blue-500 text-white"
              : "bg-white/95 text-blue-600 hover:bg-white"
          }`}
          title="Ma position"
          type="button"
        >
          {isLocating ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
              <path
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          )}
        </button>
      </div>

      {position ? (
        <Marker position={position} title="Votre position" />
      ) : null}
    </>
  )
}

function FitBounds({ heroMode, isFullscreen, restaurants }) {
  const map = useMap()
  const lastBoundsSignatureRef = useRef("")

  useEffect(() => {
    if (!map || !window.google) return

    const points = restaurants
      .map((restaurant) => ({
        lat: Number(restaurant.latitude),
        lng: Number(restaurant.longitude),
      }))
      .filter(
        (point) =>
          Number.isFinite(point.lat) &&
          Number.isFinite(point.lng) &&
          point.lat >= -90 &&
          point.lat <= 90 &&
          point.lng >= -180 &&
          point.lng <= 180
      )

    if (points.length === 0) {
      lastBoundsSignatureRef.current = ""
      return
    }

    const boundsSignature = JSON.stringify(points)
    if (lastBoundsSignatureRef.current === boundsSignature) return

    lastBoundsSignatureRef.current = boundsSignature

    if (points.length === 1) {
      map.setCenter(points[0])
      map.setZoom(14)
      return
    }

    const bounds = new google.maps.LatLngBounds()
    points.forEach((point) => bounds.extend(point))

    const isMobileViewport = typeof window !== "undefined" && window.innerWidth <= 768
    const padding = {
      top: isMobileViewport ? (isFullscreen ? 96 : heroMode ? 184 : 72) : heroMode ? 164 : 56,
      right: isMobileViewport ? 28 : 72,
      bottom: isMobileViewport ? (isFullscreen ? 190 : heroMode ? 104 : 128) : isFullscreen ? 112 : heroMode ? 168 : 72,
      left: isMobileViewport ? 28 : 56,
    }

    map.fitBounds(bounds, padding)
  }, [heroMode, isFullscreen, map, restaurants])

  return null
}

function MapResizer({ isFullscreen }) {
  const map = useMap()

  useEffect(() => {
    if (!map || !window.google) return

    const timeoutId = window.setTimeout(() => {
      google.maps.event.trigger(map, "resize")
    }, 150)

    return () => window.clearTimeout(timeoutId)
  }, [isFullscreen, map])

  return null
}

const restaurantNameZoomThreshold = 13

const sanitizeSvgText = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")

const createRestaurantIcon = (restaurantName, waitTime, showName) => {
  const width = showName ? 120 : 92
  const height = showName ? 96 : 72
  const waitLabel = `${waitTime} min`
  const safeRestaurantName = sanitizeSvgText(restaurantName)
  const safeWaitLabel = sanitizeSvgText(waitLabel)

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      ${showName ? `
        <rect x="4" y="2" rx="14" ry="14" width="${width - 8}" height="24" fill="rgba(255,253,249,0.96)" stroke="rgba(143,64,82,0.24)"/>
        <text x="${width / 2}" y="18" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="#3e2a36">${safeRestaurantName}</text>
      ` : ""}
      <rect x="${showName ? 27 : 20}" y="${showName ? 30 : 8}" rx="14" ry="14" width="${showName ? 66 : 52}" height="24" fill="rgba(255,253,249,0.98)" stroke="rgba(143,64,82,0.32)"/>
      <text x="${width / 2}" y="${showName ? 46 : 24}" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="#8f4052">${safeWaitLabel}</text>
      <path d="M${width / 2} ${height - 4} C ${width / 2 - 9} ${height - 20}, ${width / 2 - 12} ${height - 32}, ${width / 2 - 12} ${height - 40} C ${width / 2 - 12} ${height - 52}, ${width / 2 - 4} ${height - 60}, ${width / 2} ${height - 60} C ${width / 2 + 4} ${height - 60}, ${width / 2 + 12} ${height - 52}, ${width / 2 + 12} ${height - 40} C ${width / 2 + 12} ${height - 32}, ${width / 2 + 9} ${height - 20}, ${width / 2} ${height - 4} Z" fill="#d14b65"/>
      <circle cx="${width / 2}" cy="${height - 42}" r="5" fill="#ffffff"/>
    </svg>
  `

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(width, height),
    anchor: new google.maps.Point(width / 2, height - 4),
  }
}

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const radius = 6371
  const deltaLat = ((lat2 - lat1) * Math.PI) / 180
  const deltaLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2)

  return radius * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

function RestaurantMapInner({
  heroMode,
  restaurants,
  onRestaurantPreview,
  onRestaurantSelect,
  onUserLocationChange,
  heightClass,
}) {
  const [userLocation, setUserLocation] = useState(null)
  const [locationError, setLocationError] = useState("")
  const [hasAutoLocateAttempted, setHasAutoLocateAttempted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentZoom, setCurrentZoom] = useState(8)
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(null)
  const isClient = typeof window !== "undefined"
  const showRestaurantNames = currentZoom >= restaurantNameZoomThreshold

  const validRestaurants = useMemo(
    () =>
      restaurants.filter((restaurant) => {
        const latitude = Number(restaurant.latitude)
        const longitude = Number(restaurant.longitude)

        return (
          Number.isFinite(latitude) &&
          Number.isFinite(longitude) &&
          latitude >= -90 &&
          latitude <= 90 &&
          longitude >= -180 &&
          longitude <= 180
        )
      }),
    [restaurants]
  )

  const selectedRestaurant =
    validRestaurants.find((restaurant) => restaurant.id === selectedRestaurantId) || null

  useEffect(() => {
    if (!isClient || !isFullscreen) return undefined

    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsFullscreen(false)
      }
    }

    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isClient, isFullscreen])

  useEffect(() => {
    if (!selectedRestaurant) return

    const stillVisible = validRestaurants.some((restaurant) => restaurant.id === selectedRestaurant.id)
    if (!stillVisible) {
      setSelectedRestaurantId(null)
    }
  }, [selectedRestaurant, validRestaurants])

  if (!isClient) {
    return (
      <div
        className={`flex w-full items-center justify-center rounded-3xl border border-white/10 bg-slate-900/60 ${heightClass}`}
      >
        <div className="text-sm text-slate-400">Chargement de la carte...</div>
      </div>
    )
  }

  const mapContent = (
    <div
      className={[
        "relative w-full overflow-hidden border border-white/10 bg-slate-950",
        isFullscreen ? "h-[100dvh] rounded-none border-0" : `rounded-3xl ${heightClass}`,
      ].join(" ")}
    >
      <div
        className={[
          "pointer-events-none absolute inset-x-0 z-[1001] flex justify-end px-4",
          isFullscreen ? "bottom-[max(1rem,calc(env(safe-area-inset-bottom)+1rem))]" : "bottom-4",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={() => setIsFullscreen((currentValue) => !currentValue)}
          className="pointer-events-auto rounded-full border border-white/15 bg-slate-950/90 px-4 py-2 text-[10px] font-medium uppercase tracking-widest text-white shadow-lg transition hover:border-white/30 hover:text-emerald-200 sm:text-xs"
        >
          {isFullscreen ? "Fermer la carte" : "Plein ecran"}
        </button>
      </div>

      <Map
        defaultCenter={GOOGLE_MAPS_DEFAULT_CENTER}
        defaultZoom={8}
        disableDefaultUI={false}
        fullscreenControl={false}
        gestureHandling="greedy"
        mapTypeControl={false}
        streetViewControl={false}
        style={{ height: "100%", width: "100%" }}
        onClick={() => setSelectedRestaurantId(null)}
        onZoomChanged={(event) => {
          setCurrentZoom(event.detail.zoom)
        }}
      >
        <LocationMarker
          autoLocate={!hasAutoLocateAttempted}
          onLocationFound={(nextLocation) => {
            setUserLocation(nextLocation)
            setHasAutoLocateAttempted(true)
            setLocationError("")
            onUserLocationChange?.(nextLocation)
          }}
          onLocationError={(message) => {
            setHasAutoLocateAttempted(true)
            setLocationError(message)
          }}
        />
        <FitBounds heroMode={heroMode} isFullscreen={isFullscreen} restaurants={validRestaurants} />
        <MapResizer isFullscreen={isFullscreen} />

        {validRestaurants.map((restaurant) => {
          const latitude = Number(restaurant.latitude)
          const longitude = Number(restaurant.longitude)

          return (
            <Marker
              key={restaurant.id}
              position={{ lat: latitude, lng: longitude }}
              icon={
                typeof window !== "undefined" && window.google
                  ? createRestaurantIcon(
                      restaurant.name,
                      restaurant.wait_time_minutes || 15,
                      showRestaurantNames
                    )
                  : undefined
              }
              onClick={(event) => {
                event.stop()
                setSelectedRestaurantId(restaurant.id)
                onRestaurantPreview?.(restaurant)
              }}
            />
          )
        })}

        {selectedRestaurant ? (
          <InfoWindow
            position={{
              lat: Number(selectedRestaurant.latitude),
              lng: Number(selectedRestaurant.longitude),
            }}
            onCloseClick={() => setSelectedRestaurantId(null)}
          >
            <div className="max-w-[16rem] text-sm">
              <h3 className="text-lg font-semibold">{selectedRestaurant.name}</h3>
              <p className="mt-1 text-gray-600">
                {selectedRestaurant.description || "Aucune description disponible."}
              </p>
              <div className="mt-2 space-y-1">
                <p>
                  <span className="font-medium">Pret dans:</span>{" "}
                  <span className="font-semibold text-emerald-600">
                    {selectedRestaurant.wait_time_minutes || 15} min
                  </span>
                </p>
                {selectedRestaurant.travelMinutes ? (
                  <p>
                    <span className="font-medium">Trajet estime:</span>{" "}
                    {selectedRestaurant.travelMinutes} min
                  </p>
                ) : null}
                {selectedRestaurant.leaveInMinutes !== null &&
                selectedRestaurant.leaveInMinutes !== undefined ? (
                  <p>
                    <span className="font-medium">Pars dans:</span>{" "}
                    {selectedRestaurant.leaveInMinutes} min
                  </p>
                ) : null}
                {userLocation ? (
                  <p>
                    <span className="font-medium">Distance:</span>{" "}
                    {calculateDistance(
                      userLocation.lat,
                      userLocation.lng,
                      Number(selectedRestaurant.latitude),
                      Number(selectedRestaurant.longitude)
                    ).toFixed(1)}{" "}
                    km
                  </p>
                ) : null}
                {selectedRestaurant.address ? (
                  <p className="text-gray-500">{selectedRestaurant.address}</p>
                ) : null}
              </div>
              <button
                onClick={() => onRestaurantSelect?.(selectedRestaurant)}
                className="mt-3 w-full rounded bg-emerald-500 px-3 py-1 text-sm text-white transition-colors hover:bg-emerald-600"
                type="button"
              >
                Ouvrir le menu
              </button>
            </div>
          </InfoWindow>
        ) : null}
      </Map>

      {validRestaurants.length === 0 ? (
        <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
          <div className="rounded-full border border-white/10 bg-slate-950/90 px-4 py-2 text-xs uppercase tracking-widest text-slate-300 shadow-lg">
            Aucun restaurant ne correspond au filtre
          </div>
        </div>
      ) : null}

      {locationError ? (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-[1001] flex justify-center px-4">
          <div className="max-w-md rounded-2xl border border-rose-400/30 bg-slate-950/95 px-4 py-3 text-center text-[11px] text-rose-100 shadow-lg sm:text-xs">
            {locationError}
          </div>
        </div>
      ) : null}

      {!userLocation && !locationError && hasAutoLocateAttempted ? (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-[1001] flex justify-center px-4">
          <div className="max-w-md rounded-2xl border border-white/10 bg-slate-950/95 px-4 py-3 text-center text-[11px] text-slate-200 shadow-lg sm:text-xs">
            Active ta position pour voir le retrait le plus rapide autour de toi.
          </div>
        </div>
      ) : null}
    </div>
  )

  return (
    <>
      {!isFullscreen && mapContent}
      {isFullscreen
        ? createPortal(
            <div className="lineskeats-theme fixed inset-0 z-[1000] bg-slate-950">
              {mapContent}
            </div>,
            document.body
          )
        : null}
    </>
  )
}

export default function RestaurantMap(props) {
  if (!hasGoogleMapsApiKey) {
    return (
      <div
        className={`flex w-full items-center justify-center rounded-3xl border border-rose-400/30 bg-slate-900/60 p-6 text-center ${props.heightClass || "h-[280px] sm:h-96"}`}
      >
        <div className="max-w-md space-y-2">
          <p className="text-sm font-semibold text-rose-200">Google Maps n est pas configure.</p>
          <p className="text-xs text-slate-300">
            Ajoute `VITE_GOOGLE_MAPS_API_KEY` dans `.env.local` puis relance Vite.
          </p>
        </div>
      </div>
    )
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <RestaurantMapInner {...props} />
    </APIProvider>
  )
}
