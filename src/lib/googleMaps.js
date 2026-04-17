export const GOOGLE_MAPS_API_KEY = String(
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ""
).trim()

export const hasGoogleMapsApiKey = GOOGLE_MAPS_API_KEY.length > 0

export const GOOGLE_MAPS_SETUP_HINT =
  "Verifie Maps JavaScript API, la facturation Google Cloud et les restrictions HTTP referrer de la cle."

export const GOOGLE_MAPS_AUTH_ERROR_MESSAGE =
  "Google Maps a refuse la cle API. Verifie la cle, Maps JavaScript API, la facturation et les domaines autorises."

export const GOOGLE_MAPS_DEFAULT_CENTER = {
  lat: 50.5039,
  lng: 4.4699,
}

const getReadableErrorString = (error) => {
  if (typeof error === "string") {
    return error.trim()
  }

  if (error instanceof Error) {
    return String(error.message || error.name || "").trim()
  }

  if (error && typeof error === "object") {
    const objectMessage = [error.message, error.status, error.code]
      .filter((value) => typeof value === "string" || typeof value === "number")
      .join(" ")
      .trim()

    if (objectMessage) {
      return objectMessage
    }
  }

  return ""
}

export const formatGoogleMapsLoadError = (error) => {
  const readableError = getReadableErrorString(error)

  if (/BillingNotEnabledMapError/i.test(readableError)) {
    return "Google Maps est bloque car la facturation n est pas active sur le projet Google Cloud."
  }

  if (/RefererNotAllowedMapError/i.test(readableError)) {
    return "Le domaine actuel n est pas autorise par la cle Google Maps. Ajoute ce domaine dans les HTTP referrers."
  }

  if (/ApiNotActivatedMapError|ApiProjectMapError/i.test(readableError)) {
    return "Maps JavaScript API n est pas active sur ton projet Google Cloud."
  }

  if (/InvalidKeyMapError/i.test(readableError)) {
    return "La cle Google Maps est invalide ou mal copinee dans VITE_GOOGLE_MAPS_API_KEY."
  }

  if (/ExpiredKeyMapError/i.test(readableError)) {
    return "La cle Google Maps a expire ou a ete desactivee."
  }

  if (/MissingKeyMapError/i.test(readableError)) {
    return "Aucune cle Google Maps valide n a ete fournie au front."
  }

  if (/UnauthorizedURLForClientIdMapError/i.test(readableError)) {
    return "L URL actuelle n est pas autorisee pour cette configuration Google Maps."
  }

  if (readableError && readableError !== "[object Object]") {
    return `Google Maps n a pas pu se charger: ${readableError}`
  }

  return `Google Maps n a pas pu se charger. ${GOOGLE_MAPS_SETUP_HINT}`
}
