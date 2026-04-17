import { useEffect, useState } from "react"

const defaultHeightClass = "h-[280px] sm:h-96"

const getErrorMessage = (error) =>
  error instanceof Error && error.message
    ? error.message
    : "Leaflet n a pas pu etre charge dans le navigateur."

export default function RestaurantMap(props) {
  const [Component, setComponent] = useState(null)
  const [loadError, setLoadError] = useState("")

  useEffect(() => {
    let isMounted = true

    import("./RestaurantMapLeafletImpl")
      .then((module) => {
        if (!isMounted) return
        setComponent(() => module.default)
        setLoadError("")
      })
      .catch((error) => {
        console.error("Erreur chargement RestaurantMap Leaflet:", error)
        if (!isMounted) return
        setLoadError(getErrorMessage(error))
      })

    return () => {
      isMounted = false
    }
  }, [])

  if (loadError) {
    return (
      <div
        className={`flex w-full items-center justify-center rounded-3xl border border-rose-400/30 bg-slate-900/60 p-6 text-center ${props.heightClass || defaultHeightClass}`}
      >
        <div className="max-w-md space-y-2">
          <p className="text-sm font-semibold text-rose-200">La carte n a pas pu se charger.</p>
          <p className="text-xs text-slate-300">{loadError}</p>
        </div>
      </div>
    )
  }

  if (!Component) {
    return (
      <div
        className={`flex w-full items-center justify-center rounded-3xl border border-white/10 bg-slate-900/60 ${props.heightClass || defaultHeightClass}`}
      >
        <div className="text-sm text-slate-400">Chargement de la carte...</div>
      </div>
    )
  }

  return <Component {...props} />
}
