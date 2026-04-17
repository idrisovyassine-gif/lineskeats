import { useEffect, useState } from "react"

const getErrorMessage = (error) =>
  error instanceof Error && error.message
    ? error.message
    : "Leaflet n a pas pu etre charge dans le navigateur."

export default function LocationPicker(props) {
  const [Component, setComponent] = useState(null)
  const [loadError, setLoadError] = useState("")

  useEffect(() => {
    let isMounted = true

    import("./LocationPickerLeafletImpl")
      .then((module) => {
        if (!isMounted) return
        setComponent(() => module.default)
        setLoadError("")
      })
      .catch((error) => {
        console.error("Erreur chargement LocationPicker Leaflet:", error)
        if (!isMounted) return
        setLoadError(getErrorMessage(error))
      })

    return () => {
      isMounted = false
    }
  }, [])

  if (loadError) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-rose-400/30 bg-slate-950 p-4 text-sm text-rose-200">
          <p>La carte n a pas pu se charger.</p>
          <p className="mt-2 text-xs text-slate-300">{loadError}</p>
        </div>
      </div>
    )
  }

  if (!Component) {
    return (
      <div className="space-y-4">
        <div className="flex h-64 items-center justify-center rounded-lg border border-white/10 bg-slate-950 text-sm text-slate-300">
          Chargement de la carte...
        </div>
      </div>
    )
  }

  return <Component {...props} />
}
