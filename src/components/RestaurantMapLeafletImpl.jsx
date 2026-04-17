import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { createPortal } from "react-dom"
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet"

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
})

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
          "La geolocalisation du navigateur demande HTTPS ou localhost. Sur telephone, l'adresse 192.168.x.x en HTTP est souvent bloquee."
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
      map.flyTo(nextPosition, zoomLevel, { duration: hasResolved ? 0.8 : 1.1 })

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
      <div className="leaflet-top leaflet-right">
        <button
          onClick={locateUser}
          className={`leaflet-control leaflet-bar rounded border border-gray-300 p-2 shadow-md transition-colors ${
            isLocating ? "bg-blue-500" : "bg-white hover:bg-gray-100"
          }`}
          title="Ma position"
          type="button"
        >
          {isLocating ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          ) : (
            <svg
              className="h-4 w-4 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
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
        <Marker position={position}>
          <Popup>Votre position</Popup>
        </Marker>
      ) : null}
    </>
  )
}

function FitBounds({ restaurants, isFullscreen, heroMode }) {
  const map = useMap()
  const lastBoundsSignatureRef = useRef("")

  useEffect(() => {
    const points = restaurants.map((restaurant) => [
      Number(restaurant.latitude),
      Number(restaurant.longitude),
    ])

    if (points.length === 0) {
      lastBoundsSignatureRef.current = ""
      return
    }

    const boundsSignature = JSON.stringify(points)

    if (lastBoundsSignatureRef.current === boundsSignature) return

    lastBoundsSignatureRef.current = boundsSignature

    if (points.length === 1) {
      map.setView(points[0], 14)
      return
    }

    const isMobileViewport = typeof window !== "undefined" && window.innerWidth <= 768
    const paddingTopLeft = isMobileViewport
      ? [28, isFullscreen ? 96 : heroMode ? 184 : 72]
      : [56, heroMode ? 164 : 56]
    const paddingBottomRight = isMobileViewport
      ? [28, isFullscreen ? 190 : heroMode ? 104 : 128]
      : [72, isFullscreen ? 112 : heroMode ? 168 : 72]

    map.fitBounds(points, {
      paddingTopLeft,
      paddingBottomRight,
    })
  }, [heroMode, isFullscreen, map, restaurants])

  return null
}

const markerPinUrl =
  "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png"
const restaurantNameZoomThreshold = 13

const escapeHtml = (value = "") =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")

const createRestaurantIcon = (restaurantName, waitTime, showName) =>
  L.divIcon({
    className: "restaurant-wait-marker",
    html: `
      <div class="restaurant-marker-wrap">
        ${
          showName
            ? `<div class="restaurant-name-badge">${escapeHtml(restaurantName)}</div>`
            : ""
        }
        <div class="restaurant-wait-badge">${waitTime} min</div>
        <img class="restaurant-marker-pin" src="${markerPinUrl}" alt="" />
      </div>
    `,
    iconSize: showName ? [120, 96] : [92, 72],
    iconAnchor: showName ? [60, 88] : [46, 64],
    popupAnchor: [0, -60],
  })

export default function RestaurantMapLeafletImpl({
  heroMode = false,
  restaurants,
  onRestaurantPreview,
  onRestaurantSelect,
  onUserLocationChange,
  heightClass = "h-[280px] sm:h-96",
}) {
  const [userLocation, setUserLocation] = useState(null)
  const [locationError, setLocationError] = useState("")
  const [hasAutoLocateAttempted, setHasAutoLocateAttempted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentZoom, setCurrentZoom] = useState(8)
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

  const iconsByRestaurantId = useMemo(
    () =>
      Object.fromEntries(
        validRestaurants.map((restaurant) => [
          restaurant.id,
          createRestaurantIcon(
            restaurant.name,
            restaurant.wait_time_minutes || 15,
            showRestaurantNames
          ),
        ])
      ),
    [showRestaurantNames, validRestaurants]
  )

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

  if (!isClient) {
    return (
      <div className={`flex w-full items-center justify-center rounded-3xl border border-white/10 bg-slate-900/60 ${heightClass}`}>
        <div className="text-sm text-slate-400">Chargement de la carte...</div>
      </div>
    )
  }

  const mapContent = (
    <div
      className={[
        "relative w-full overflow-hidden border border-white/10 bg-slate-950",
        isFullscreen
          ? "h-[100dvh] rounded-none border-0"
          : `rounded-3xl ${heightClass}`,
      ].join(" ")}
    >
      <div
        className={[
          "pointer-events-none absolute inset-x-0 z-[1001] flex justify-end px-4",
          isFullscreen
            ? "bottom-[max(1rem,calc(env(safe-area-inset-bottom)+1rem))]"
            : "bottom-4",
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

      <MapContainer
        className="restaurant-map"
        center={[50.5039, 4.4699]}
        zoom={8}
        touchZoom
        doubleClickZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          detectRetina
          maxZoom={20}
          maxNativeZoom={20}
        />

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
        <FitBounds
          restaurants={validRestaurants}
          isFullscreen={isFullscreen}
          heroMode={heroMode}
        />
        <MapZoomTracker onZoomChange={setCurrentZoom} />
        <MapResizer isFullscreen={isFullscreen} />

        {validRestaurants.map((restaurant) => {
          const latitude = Number(restaurant.latitude)
          const longitude = Number(restaurant.longitude)
          const distance = userLocation
            ? calculateDistance(userLocation.lat, userLocation.lng, latitude, longitude)
            : null

          return (
            <Marker
              key={restaurant.id}
              position={[latitude, longitude]}
              icon={iconsByRestaurantId[restaurant.id]}
              eventHandlers={{
                click: () => onRestaurantPreview?.(restaurant),
              }}
            >
              <Popup>
                <div className="text-sm">
                  <h3 className="text-lg font-semibold">{restaurant.name}</h3>
                  <p className="mt-1 text-gray-600">
                    {restaurant.description || "Aucune description disponible."}
                  </p>
                  <div className="mt-2 space-y-1">
                    <p>
                      <span className="font-medium">Pret dans:</span>{" "}
                      <span className="font-semibold text-emerald-600">
                        {restaurant.wait_time_minutes || 15} min
                      </span>
                    </p>
                    {restaurant.travelMinutes ? (
                      <p>
                        <span className="font-medium">Trajet estime:</span>{" "}
                        {restaurant.travelMinutes} min
                      </p>
                    ) : null}
                    {restaurant.leaveInMinutes !== null &&
                    restaurant.leaveInMinutes !== undefined ? (
                      <p>
                        <span className="font-medium">Pars dans:</span>{" "}
                        {restaurant.leaveInMinutes} min
                      </p>
                    ) : null}
                    {distance ? (
                      <p>
                        <span className="font-medium">Distance:</span> {distance.toFixed(1)} km
                      </p>
                    ) : null}
                    {restaurant.address ? (
                      <p className="text-gray-500">{restaurant.address}</p>
                    ) : null}
                  </div>
                  <button
                    onClick={() => onRestaurantSelect?.(restaurant)}
                    className="mt-3 w-full rounded bg-emerald-500 px-3 py-1 text-sm text-white transition-colors hover:bg-emerald-600"
                    type="button"
                  >
                    Ouvrir le menu
                  </button>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {validRestaurants.length === 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
          <div className="rounded-full border border-white/10 bg-slate-950/90 px-4 py-2 text-xs uppercase tracking-widest text-slate-300 shadow-lg">
            Aucun restaurant ne correspond au filtre
          </div>
        </div>
      )}

      {locationError && (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-[1001] flex justify-center px-4">
          <div className="max-w-md rounded-2xl border border-rose-400/30 bg-slate-950/95 px-4 py-3 text-center text-[11px] text-rose-100 shadow-lg sm:text-xs">
            {locationError}
          </div>
        </div>
      )}

      {!userLocation && !locationError && hasAutoLocateAttempted && (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-[1001] flex justify-center px-4">
          <div className="max-w-md rounded-2xl border border-white/10 bg-slate-950/95 px-4 py-3 text-center text-[11px] text-slate-200 shadow-lg sm:text-xs">
            Active ta position pour voir le retrait le plus rapide autour de toi.
          </div>
        </div>
      )}
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

function MapResizer({ isFullscreen }) {
  const map = useMap()

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      map.invalidateSize()
    }, 150)

    return () => window.clearTimeout(timeoutId)
  }, [isFullscreen, map])

  return null
}

function MapZoomTracker({ onZoomChange }) {
  const map = useMapEvents({
    zoomend: () => {
      onZoomChange(map.getZoom())
    },
  })

  useEffect(() => {
    onZoomChange(map.getZoom())
  }, [map, onZoomChange])

  return null
}

function calculateDistance(lat1, lon1, lat2, lon2) {
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
