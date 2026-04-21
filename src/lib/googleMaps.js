export const GOOGLE_MAPS_API_KEY = String(
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ""
).trim()

export const hasGoogleMapsApiKey = GOOGLE_MAPS_API_KEY.length > 0

export const GOOGLE_MAPS_DEFAULT_CENTER = {
  lat: 50.5039,
  lng: 4.4699,
}
