import { useEffect } from "react"
import { APIProvider } from "@vis.gl/react-google-maps"
import {
  GOOGLE_MAPS_API_KEY,
  GOOGLE_MAPS_AUTH_ERROR_MESSAGE,
  formatGoogleMapsLoadError,
} from "../lib/googleMaps"

export default function GoogleMapsApiProvider({ children, onError, onLoad }) {
  useEffect(() => {
    if (typeof window === "undefined") return undefined

    const previousAuthFailureHandler = window.gm_authFailure

    window.gm_authFailure = () => {
      onError?.(GOOGLE_MAPS_AUTH_ERROR_MESSAGE)
    }

    return () => {
      if (typeof previousAuthFailureHandler === "function") {
        window.gm_authFailure = previousAuthFailureHandler
      } else {
        delete window.gm_authFailure
      }
    }
  }, [onError])

  return (
    <APIProvider
      apiKey={GOOGLE_MAPS_API_KEY}
      onLoad={onLoad}
      onError={(error) => {
        onError?.(formatGoogleMapsLoadError(error))
      }}
    >
      {children}
    </APIProvider>
  )
}
