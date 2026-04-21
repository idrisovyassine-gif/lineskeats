import { Component } from "react"

const getReadableError = (error) =>
  error instanceof Error && error.message ? error.message : "Erreur JavaScript inconnue."

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      message: "",
    }
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: getReadableError(error),
    }
  }

  componentDidCatch(error) {
    console.error("Erreur application capturée:", error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="lineskeats-theme flex min-h-screen items-center justify-center bg-slate-950 px-6 text-center">
          <div className="max-w-lg rounded-3xl border border-rose-400/30 bg-slate-900/70 p-6 shadow-2xl">
            <p className="text-xs uppercase tracking-widest text-rose-200">
              Erreur application
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-white">
              L interface a plante avant le rendu complet.
            </h1>
            <p className="mt-3 text-sm text-slate-300">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-full bg-emerald-400 px-5 py-3 text-xs font-semibold uppercase tracking-widest text-slate-950"
            >
              Recharger
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
