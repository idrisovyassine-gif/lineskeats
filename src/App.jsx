import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import { supabase } from "./lib/supabaseClient"
import ImageUpload from "./components/ImageUpload"
import LocationPicker from "./components/LocationPicker"
import CuisineTypeSelector from "./components/CuisineTypeSelector"
import WaitTimeManager from "./components/WaitTimeManager"
import ClientInterface from "./components/ClientInterface"
import BrandLogo from "./components/BrandLogo"

const currency = (value) =>
  new Intl.NumberFormat("fr-BE", {
    style: "currency",
    currency: "EUR",
  }).format(value)

const isMissingArchivedAtColumnError = (error) =>
  /archived_at/i.test(String(error?.message || "")) &&
  /does not exist/i.test(String(error?.message || ""))

const normalizeOrderStatus = (status) =>
  status === "delivered" ? "picked_up" : status

const formatOrderDateTime = (value) =>
  new Date(value).toLocaleString("fr-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

const getHistoryPeriodStart = (period) => {
  const now = new Date()

  if (period === "week") {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  }

  if (period === "month") {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  }

  return null
}

const getAppRoute = () => {
  const legacyHash = window.location.hash || ""
  const cleanLegacyHash = legacyHash.replace("#", "")
  const [legacyPath, legacyQueryString] = cleanLegacyHash.split("?")
  const pathname = window.location.pathname || "/"

  if (pathname !== "/") {
    return {
      path: pathname,
      query: new URLSearchParams(window.location.search || ""),
    }
  }

  return {
    path: legacyPath || "/",
    query: new URLSearchParams(legacyQueryString || ""),
  }
}

function RestaurantSignup() {
  const [session, setSession] = useState(null)
  const [authEmail, setAuthEmail] = useState("")
  const [authPassword, setAuthPassword] = useState("")
  const [authMode, setAuthMode] = useState("login")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
    })
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession)
      }
    )
    return () => authListener.subscription.unsubscribe()
  }, [])

  if (session?.user) {
    return (
      <div className="lineskeats-theme min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
          <BrandLogo preset="md" tone="dark" showTagline showSubline className="mb-8" />
          <h1 className="text-3xl font-semibold text-white">
            Espace restaurant
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Vous etes deja connecte.
          </p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="mt-4 rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-widest text-white/70 hover:border-white/40 hover:text-white"
          >
            Deconnexion
          </button>
        </div>
      </div>
    )
  }

  const handleAuth = async () => {
    setIsSubmitting(true)
    setError("")

    try {
      if (authMode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
        })
        if (error) setError(error.message)
        else window.location.assign("/restaurant")
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        })
        if (error) setError(error.message)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="lineskeats-theme min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
        <div className="theme-header-panel w-full px-6 py-8">
          <BrandLogo preset="md" tone="dark" showTagline showSubline className="mb-6" />
          <h1 className="text-3xl font-semibold text-white">
            {authMode === "login" ? "Connexion" : "Inscription"}
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {authMode === "login"
              ? "Connectez-vous a votre espace restaurant."
              : "Creez votre compte restaurant."}
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleAuth()
          }}
          className="mt-8 w-full space-y-6"
        >
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Email
            </label>
            <input
              value={authEmail}
              onChange={(event) => setAuthEmail(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-emerald-300/60 focus:outline-none"
              placeholder="vous@exemple.com"
              type="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300">
              Mot de passe
            </label>
            <input
              value={authPassword}
              onChange={(event) => setAuthPassword(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-emerald-300/60 focus:outline-none"
              placeholder="••••••••••"
              type="password"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-emerald-400 px-4 py-3 text-sm font-semibold uppercase tracking-widest text-slate-950 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Chargement..." : authMode === "login" ? "Se connecter" : "S'inscrire"}
          </button>
        </form>

        <div className="mt-6 text-center space-y-3">
          <button
            onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}
            className="text-sm text-emerald-400 hover:text-emerald-300"
          >
            {authMode === "login"
              ? "Pas de compte ? S'inscrire"
              : "Deja un compte ? Se connecter"}
          </button>
          <div>
            <a
              href="/"
              className="text-sm text-slate-500 hover:text-slate-300"
            >
              &larr; Retour a l&apos;espace client
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [loading, setLoading] = useState(true)
  const [dataError, setDataError] = useState("")
  const [session, setSession] = useState(null)
  const [restaurant, setRestaurant] = useState(null)
  const [restaurantName, setRestaurantName] = useState("")
  const [restaurantDescription, setRestaurantDescription] = useState("")
  const [restaurantImage, setRestaurantImage] = useState("")
  const [restaurantAddress, setRestaurantAddress] = useState("")
  const [restaurantLatitude, setRestaurantLatitude] = useState(null)
  const [restaurantLongitude, setRestaurantLongitude] = useState(null)
  const [restaurantWaitTime, setRestaurantWaitTime] = useState(15)
  const [restaurantIsActive, setRestaurantIsActive] = useState(true)
  const [selectedCuisineTypes, setSelectedCuisineTypes] = useState([])
  const [waitTimeMode, setWaitTimeMode] = useState('manual')
  const [baseWaitTime, setBaseWaitTime] = useState(15)
  const [maxWaitTime, setMaxWaitTime] = useState(60)
  const [capacityThreshold, setCapacityThreshold] = useState(10)
  const [orders, setOrders] = useState([])
  const [historyOrders, setHistoryOrders] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyPeriod, setHistoryPeriod] = useState("month")
  const [historyCustomStart, setHistoryCustomStart] = useState("")
  const [historyCustomEnd, setHistoryCustomEnd] = useState("")
  const [historySearch, setHistorySearch] = useState("")
  const [menuCategories, setMenuCategories] = useState([])
  const [menuProducts, setMenuProducts] = useState([])
  const [menuOptions, setMenuOptions] = useState([])
  const [menuOptionItems, setMenuOptionItems] = useState([])
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newProductName, setNewProductName] = useState("")
  const [newProductPrice, setNewProductPrice] = useState("")
  const [newProductCategoryId, setNewProductCategoryId] = useState("")
  const [newProductImageUrl, setNewProductImageUrl] = useState("")
  const [newOptionNameByProduct, setNewOptionNameByProduct] = useState({})
  const [newOptionItemNameByOption, setNewOptionItemNameByOption] = useState({})
  const [newOptionItemPriceByOption, setNewOptionItemPriceByOption] = useState({})
  const [isSavingRestaurant, setIsSavingRestaurant] = useState(false)
  const [archivingOrderId, setArchivingOrderId] = useState(null)
  const [deletingOrderId, setDeletingOrderId] = useState(null)
  const [saveRestaurantMessage, setSaveRestaurantMessage] = useState("")
  const [isManagingStripe, setIsManagingStripe] = useState(false)
  const [stripeStatusMessage, setStripeStatusMessage] = useState("")
  const [activeAdminTab, setActiveAdminTab] = useState("parametres")
  const [activeSettingsSubTab, setActiveSettingsSubTab] = useState("restaurant")
  const [route, setRoute] = useState(() => getAppRoute().path)
  const handledStripeQueryRef = useRef("")

  useEffect(() => {
    const updateRoute = () => setRoute(getAppRoute().path)

    window.addEventListener("popstate", updateRoute)
    window.addEventListener("hashchange", updateRoute)
    return () => {
      window.removeEventListener("popstate", updateRoute)
      window.removeEventListener("hashchange", updateRoute)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
    })
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession)
      }
    )
    return () => authListener.subscription.unsubscribe()
  }, [])

  const getAuthenticatedContext = useCallback(async () => {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession()

    if (!currentSession?.access_token || !currentSession.user) {
      throw new Error("Session restaurant invalide. Reconnectez-vous.")
    }

    const authedClient = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${currentSession.access_token}`,
          },
        },
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      }
    )

    return { currentSession, authedClient }
  }, [])

  const callRestaurantProfile = useCallback(async (action, payload = {}) => {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession()

    if (!currentSession?.access_token) {
      throw new Error("Session restaurant invalide. Reconnectez-vous.")
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

    const response = await fetch(`${supabaseUrl}/functions/v1/restaurant-profile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
      },
      body: JSON.stringify({
        action,
        access_token: currentSession.access_token,
        ...payload,
      }),
    })

    const raw = await response.text()
    const data = raw ? JSON.parse(raw) : {}

    if (!response.ok) {
      throw new Error(data.error || "Action restaurant impossible.")
    }

    return {
      currentSession,
      data,
    }
  }, [])

  const loadOrders = useCallback(async (restaurantId) => {
    const { authedClient } = await getAuthenticatedContext()

    let { data, error } = await authedClient
      .from("orders")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .is("archived_at", null)
      .order("created_at", { ascending: false })

    if (error && isMissingArchivedAtColumnError(error)) {
      const fallbackResult = await authedClient
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false })

      data = fallbackResult.data
      error = fallbackResult.error
    }

    if (error) {
      setDataError(error.message)
    } else {
      setOrders(
        (data || []).map((order) => ({
          ...order,
          status: normalizeOrderStatus(order.status),
        }))
      )
    }
  }, [getAuthenticatedContext])

  const loadHistoryOrders = useCallback(async (restaurantId) => {
    const { authedClient } = await getAuthenticatedContext()

    setHistoryLoading(true)

    const { data, error } = await authedClient
      .from("orders")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })

    if (error) {
      setDataError(error.message)
    } else {
      setHistoryOrders(
        (data || []).map((order) => ({
          ...order,
          status: normalizeOrderStatus(order.status),
        }))
      )
    }

    setHistoryLoading(false)
  }, [getAuthenticatedContext])

  const loadMenu = useCallback(async (restaurantId) => {
    if (!restaurantId) return
    try {
      const { authedClient } = await getAuthenticatedContext()

      const categoriesRes = await authedClient
        .from("categories")
        .select("id, restaurant_id, name")
        .eq("restaurant_id", restaurantId)
        .order("name")

      if (categoriesRes.error) {
        setDataError("Erreur chargement categories : " + categoriesRes.error.message)
        return
      }

      // Tables optionnelles — on ne bloque pas si elles n'existent pas
      const categories = categoriesRes.data || []
      const categoryIds = categories.map((c) => c.id)

      const productsRes =
        categoryIds.length === 0
          ? { data: [], error: null }
          : await authedClient
              .from("products")
              .select("id, category_id, name, price, image_url")
              .in("category_id", categoryIds)
              .order("name")

      const products = productsRes.error ? [] : (productsRes.data || [])
      const productIds = products.map((product) => product.id)

      const optionsRes =
        productIds.length === 0
          ? { data: [], error: null }
          : await authedClient
              .from("product_options")
              .select("id, product_id, name, required")
              .in("product_id", productIds)
              .order("name")

      const options = optionsRes.error ? [] : (optionsRes.data || [])
      const optionIds = options.map((option) => option.id)

      const optionItemsRes =
        optionIds.length === 0
          ? { data: [], error: null }
          : await authedClient
              .from("product_option_items")
              .select("id, option_id, name, price")
              .in("option_id", optionIds)
              .order("name")

      const optionItems = optionItemsRes.error ? [] : (optionItemsRes.data || [])

      setMenuCategories(categories)
      setMenuProducts(products)
      setMenuOptions(options)
      setMenuOptionItems(optionItems)
      setDataError("")
    } catch (err) {
      setDataError("Erreur lors du chargement du menu : " + err.message)
    } finally {
      setLoading(false)
    }
  }, [getAuthenticatedContext])

  const loadRestaurantData = useCallback(async () => {
    try {
      const { data } = await callRestaurantProfile("get")
      const restaurantData = data.restaurant ?? null

      setRestaurant(restaurantData)
      setRestaurantName(restaurantData?.name ?? "")
      setRestaurantDescription(restaurantData?.description ?? "")
      setRestaurantImage(restaurantData?.image ?? "")
      setRestaurantAddress(restaurantData?.address ?? "")
      setRestaurantLatitude(restaurantData?.latitude)
      setRestaurantLongitude(restaurantData?.longitude)
      setRestaurantWaitTime(restaurantData?.wait_time_minutes ?? 15)
      setRestaurantIsActive(restaurantData?.is_active ?? true)
      setWaitTimeMode(restaurantData?.wait_time_mode ?? 'manual')
      setBaseWaitTime(restaurantData?.base_wait_time ?? 15)
      setMaxWaitTime(restaurantData?.max_wait_time ?? 60)
      setCapacityThreshold(restaurantData?.capacity_threshold ?? 10)

      const cuisineIds =
        restaurantData?.restaurant_cuisine_types?.map((rct) => rct.cuisine_type_id) || []
      setSelectedCuisineTypes(cuisineIds)

      if (restaurantData?.id) {
        loadOrders(restaurantData.id)
        loadHistoryOrders(restaurantData.id)
        loadMenu(restaurantData.id)
      } else {
        setOrders([])
        setHistoryOrders([])
        setLoading(false)
      }

      setDataError("")
      return restaurantData
    } catch (restaurantError) {
      setDataError(restaurantError.message)
      setLoading(false)
      return null
    }
  }, [callRestaurantProfile, loadHistoryOrders, loadMenu, loadOrders])

  useEffect(() => {
    if (!session?.user) {
      setLoading(false)
      return
    }

    loadRestaurantData(session.user.id)
  }, [loadRestaurantData, session])

  useEffect(() => {
    if (route !== "/restaurant" || !session?.user || !restaurant?.id) return undefined

    const channel = supabase
      .channel(`restaurant-orders-${restaurant.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        () => {
          loadOrders(restaurant.id)
          loadHistoryOrders(restaurant.id)
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          loadOrders(restaurant.id)
          loadHistoryOrders(restaurant.id)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadHistoryOrders, loadOrders, restaurant?.id, route, session?.user])

  const updateStatus = async (orderId, status) => {
    const normalizedStatus = normalizeOrderStatus(status)
    const previousOrders = orders
    const nextPickedUpAt =
      normalizedStatus === "picked_up" ? new Date().toISOString() : null
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId
          ? { ...order, status: normalizedStatus, picked_up_at: nextPickedUpAt }
          : order
      )
    )

    const { authedClient } = await getAuthenticatedContext()
    const { error } = await authedClient
      .from("orders")
      .update({
        status: normalizedStatus,
        picked_up_at: nextPickedUpAt,
      })
      .eq("id", orderId)
    if (error) {
      setOrders(previousOrders)
      setDataError(error.message)
    }
  }

  const archiveOrder = async (orderId) => {
    const previousOrders = orders
    setArchivingOrderId(orderId)
    setOrders((prev) => prev.filter((order) => order.id !== orderId))

    try {
      const { authedClient } = await getAuthenticatedContext()
      let { error } = await authedClient
        .from("orders")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", orderId)

      if (error && isMissingArchivedAtColumnError(error)) {
        const fallbackResult = await authedClient
          .from("orders")
          .delete()
          .eq("id", orderId)

        error = fallbackResult.error
      }

      if (error) {
        setOrders(previousOrders)
        setDataError(error.message)
      }
    } finally {
      setArchivingOrderId(null)
    }
  }

  const deleteOrder = async (orderId) => {
    const previousOrders = orders
    const previousHistoryOrders = historyOrders
    setDeletingOrderId(orderId)
    setOrders((prev) => prev.filter((order) => order.id !== orderId))
    setHistoryOrders((prev) => prev.filter((order) => order.id !== orderId))

    try {
      const { authedClient } = await getAuthenticatedContext()
      const { error } = await authedClient.from("orders").delete().eq("id", orderId)

      if (error) {
        setOrders(previousOrders)
        setHistoryOrders(previousHistoryOrders)
        setDataError(error.message)
      }
    } finally {
      setDeletingOrderId(null)
    }
  }

  const createCategory = async () => {
    if (!newCategoryName.trim() || !restaurant?.id) return

    const { authedClient } = await getAuthenticatedContext()

    const { error } = await authedClient
      .from("categories")
      .insert({
        name: newCategoryName.trim(),
        restaurant_id: restaurant.id,
      })
      .select()
      .single()

    if (error) {
      setDataError(error.message)
    } else {
      setNewCategoryName("")
      loadMenu(restaurant.id)
    }
  }

  const createProduct = async () => {
    if (
      !newProductName.trim() ||
      !newProductPrice ||
      !newProductCategoryId ||
      !restaurant?.id
    )
      return

    const { authedClient } = await getAuthenticatedContext()

    const { error } = await authedClient
      .from("products")
      .insert({
        name: newProductName.trim(),
        price: parseFloat(newProductPrice),
        category_id: newProductCategoryId,
        image_url: newProductImageUrl,
      })
      .select()
      .single()

    if (error) {
      setDataError(error.message)
    } else {
      setNewProductName("")
      setNewProductPrice("")
      setNewProductCategoryId("")
      setNewProductImageUrl("")
      loadMenu(restaurant.id)
    }
  }

  const deleteCategory = async (categoryId) => {
    if (!restaurant?.id) return

    const { authedClient } = await getAuthenticatedContext()

    const { error } = await authedClient
      .from("categories")
      .delete()
      .eq("id", categoryId)
      .eq("restaurant_id", restaurant.id)

    if (error) {
      setDataError(error.message)
    } else {
      loadMenu(restaurant.id)
    }
  }

  const deleteProduct = async (productId) => {
    if (!restaurant?.id) return

    const { authedClient } = await getAuthenticatedContext()

    const { error } = await authedClient
      .from("products")
      .delete()
      .eq("id", productId)

    if (error) {
      setDataError(error.message)
    } else {
      loadMenu(restaurant.id)
    }
  }

  const createOption = async (productId) => {
    if (!restaurant?.id) return

    const name = (newOptionNameByProduct[productId] || "").trim()
    if (!name) return

    const { authedClient } = await getAuthenticatedContext()

    const { error } = await authedClient
      .from("product_options")
      .insert({
        product_id: productId,
        name,
        required: false,
      })

    if (error) {
      setDataError(error.message)
    } else {
      setNewOptionNameByProduct((prev) => ({ ...prev, [productId]: "" }))
      loadMenu(restaurant.id)
    }
  }

  const deleteOption = async (optionId) => {
    if (!restaurant?.id) return

    const { authedClient } = await getAuthenticatedContext()
    const { error } = await authedClient.from("product_options").delete().eq("id", optionId)

    if (error) {
      setDataError(error.message)
    } else {
      loadMenu(restaurant.id)
    }
  }

  const createOptionItem = async (optionId) => {
    if (!restaurant?.id) return

    const name = (newOptionItemNameByOption[optionId] || "").trim()
    const rawPrice = newOptionItemPriceByOption[optionId] || "0"
    const price = Number.parseFloat(rawPrice)

    if (!name || Number.isNaN(price)) return

    const { authedClient } = await getAuthenticatedContext()

    const { error } = await authedClient
      .from("product_option_items")
      .insert({
        option_id: optionId,
        name,
        price,
      })

    if (error) {
      setDataError(error.message)
    } else {
      setNewOptionItemNameByOption((prev) => ({ ...prev, [optionId]: "" }))
      setNewOptionItemPriceByOption((prev) => ({ ...prev, [optionId]: "" }))
      loadMenu(restaurant.id)
    }
  }

  const deleteOptionItem = async (itemId) => {
    if (!restaurant?.id) return

    const { authedClient } = await getAuthenticatedContext()

    const { error } = await authedClient
      .from("product_option_items")
      .delete()
      .eq("id", itemId)

    if (error) {
      setDataError(error.message)
    } else {
      loadMenu(restaurant.id)
    }
  }

  const persistWaitTimeSettings = useCallback(async (overrides = {}) => {
    if (!restaurant?.id) return

    const nextWaitTime = overrides.waitTime ?? restaurantWaitTime
    const nextMode = overrides.mode ?? waitTimeMode
    const nextBaseWaitTime = overrides.baseWaitTime ?? baseWaitTime
    const nextMaxWaitTime = overrides.maxWaitTime ?? maxWaitTime
    const nextCapacityThreshold = overrides.capacityThreshold ?? capacityThreshold

    const { currentSession } = await callRestaurantProfile("update", {
      restaurant: {
        name: restaurantName,
        description: restaurantDescription,
        image: restaurantImage,
        address: restaurantAddress,
        latitude: restaurantLatitude,
        longitude: restaurantLongitude,
        wait_time_minutes: nextWaitTime,
        is_active: restaurantIsActive,
        wait_time_mode: nextMode,
        base_wait_time: nextBaseWaitTime,
        max_wait_time: nextMaxWaitTime,
        capacity_threshold: nextCapacityThreshold,
      },
      selected_cuisine_types: selectedCuisineTypes,
    })

    const refreshedRestaurant = await loadRestaurantData(currentSession.user.id)

    if (!refreshedRestaurant) {
      setDataError("Impossible d'enregistrer le temps d'attente.")
      return
    }

    setDataError("")
  }, [
    baseWaitTime,
    callRestaurantProfile,
    capacityThreshold,
    loadRestaurantData,
    maxWaitTime,
    restaurant?.id,
    restaurantAddress,
    restaurantDescription,
    restaurantImage,
    restaurantIsActive,
    restaurantLatitude,
    restaurantLongitude,
    restaurantName,
    restaurantWaitTime,
    selectedCuisineTypes,
    waitTimeMode,
  ])

  useEffect(() => {
    if (activeAdminTab !== "live" || !restaurant?.id) return undefined

    const persistedSignature = JSON.stringify({
      waitTime: restaurant.wait_time_minutes ?? 15,
      mode: restaurant.wait_time_mode ?? "manual",
      baseWaitTime: restaurant.base_wait_time ?? 15,
      maxWaitTime: restaurant.max_wait_time ?? 60,
      capacityThreshold: restaurant.capacity_threshold ?? 10,
    })

    const currentSignature = JSON.stringify({
      waitTime: restaurantWaitTime,
      mode: waitTimeMode,
      baseWaitTime,
      maxWaitTime,
      capacityThreshold,
    })

    if (persistedSignature === currentSignature) return undefined

    const timeoutId = window.setTimeout(() => {
      persistWaitTimeSettings({
        waitTime: restaurantWaitTime,
        mode: waitTimeMode,
        baseWaitTime,
        maxWaitTime,
        capacityThreshold,
      })
    }, 250)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [
    activeAdminTab,
    baseWaitTime,
    capacityThreshold,
    maxWaitTime,
    persistWaitTimeSettings,
    restaurant,
    restaurantWaitTime,
    waitTimeMode,
  ])

  const saveRestaurantSettings = async () => {
    if (!restaurant?.id) return

    setIsSavingRestaurant(true)
    setSaveRestaurantMessage("")
    setDataError("")

    try {
      const { currentSession } = await callRestaurantProfile("update", {
        restaurant: {
          name: restaurantName,
          description: restaurantDescription,
          image: restaurantImage,
          address: restaurantAddress,
          latitude: restaurantLatitude,
          longitude: restaurantLongitude,
          wait_time_minutes: restaurantWaitTime,
          is_active: restaurantIsActive,
          wait_time_mode: waitTimeMode,
          base_wait_time: baseWaitTime,
          max_wait_time: maxWaitTime,
          capacity_threshold: capacityThreshold,
        },
        selected_cuisine_types: selectedCuisineTypes,
      })

      setRestaurant((prev) =>
        prev
          ? {
              ...prev,
              name: restaurantName,
              description: restaurantDescription,
              image: restaurantImage,
              address: restaurantAddress,
              latitude: restaurantLatitude,
              longitude: restaurantLongitude,
              wait_time_minutes: restaurantWaitTime,
              is_active: restaurantIsActive,
              wait_time_mode: waitTimeMode,
              base_wait_time: baseWaitTime,
              max_wait_time: maxWaitTime,
              capacity_threshold: capacityThreshold,
            }
          : prev
      )

      setSaveRestaurantMessage("Enregistre.")
      await loadRestaurantData(currentSession.user.id)
    } catch (error) {
      setDataError(error.message)
    } finally {
      setIsSavingRestaurant(false)
    }
  }

  const manageStripeConnect = useCallback(
    async (action) => {
      if (!session?.access_token || !session?.user || !restaurant?.id) return

      setIsManagingStripe(true)
      setStripeStatusMessage("")
      setDataError("")

      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
        const siteOrigin = window.location.origin

        const response = await fetch(
          `${supabaseUrl}/functions/v1/restaurant-stripe-connect`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: anonKey,
            },
            body: JSON.stringify({
              action,
              access_token: session.access_token,
              return_url: `${siteOrigin}/restaurant?stripe=return`,
              refresh_url: `${siteOrigin}/restaurant?stripe=refresh`,
            }),
          }
        )

        const raw = await response.text()
        let data = {}

        try {
          data = raw ? JSON.parse(raw) : {}
        } catch {
          data = {}
        }

        if (!response.ok) {
          throw new Error(
            data.error ||
              raw ||
              `Action Stripe impossible (${response.status}).`
          )
        }

        if (action === "refresh") {
          await loadRestaurantData(session.user.id)
          setStripeStatusMessage("Statut Stripe actualise.")
          return
        }

        if (!data.url) {
          throw new Error("Lien Stripe manquant.")
        }

        window.location.assign(data.url)
      } catch (error) {
        setDataError(error.message)
      } finally {
        setIsManagingStripe(false)
      }
    },
    [loadRestaurantData, restaurant?.id, session]
  )

  useEffect(() => {
    if (route !== "/restaurant" || !session?.access_token || !restaurant?.stripe_account_id) {
      return
    }

    const params = new URLSearchParams(window.location.search || "")
    const stripeQuery = params.get("stripe")

    if (!stripeQuery) {
      handledStripeQueryRef.current = ""
      return
    }

    if (handledStripeQueryRef.current === stripeQuery) {
      return
    }

    handledStripeQueryRef.current = stripeQuery
    window.history.replaceState({}, "", "/restaurant")
    manageStripeConnect("refresh")
  }, [manageStripeConnect, restaurant?.stripe_account_id, route, session?.access_token])

  const restaurantCategories = restaurant
    ? menuCategories.filter((category) => category.restaurant_id === restaurant.id)
    : []

  const isStripeReady = Boolean(
    restaurant?.stripe_account_id &&
      restaurant?.stripe_onboarding_completed &&
      restaurant?.stripe_charges_enabled &&
      restaurant?.stripe_payouts_enabled
  )

  const optionsByProduct = menuOptions.reduce((acc, option) => {
    if (!acc[option.product_id]) acc[option.product_id] = []
    acc[option.product_id].push(option)
    return acc
  }, {})

  const optionItemsByOption = menuOptionItems.reduce((acc, item) => {
    if (!acc[item.option_id]) acc[item.option_id] = []
    acc[item.option_id].push(item)
    return acc
  }, {})

  const filteredHistoryOrders = useMemo(() => {
    const presetStartDate = getHistoryPeriodStart(historyPeriod)
    const customStartDate = historyCustomStart ? new Date(`${historyCustomStart}T00:00:00`) : null
    const customEndDate = historyCustomEnd ? new Date(`${historyCustomEnd}T23:59:59`) : null
    const normalizedSearch = historySearch.trim().toLowerCase()

    return historyOrders.filter((order) => {
      const createdAtDate = new Date(order.created_at)

      if (historyPeriod === "custom") {
        if (customStartDate && createdAtDate < customStartDate) return false
        if (customEndDate && createdAtDate > customEndDate) return false
      } else if (presetStartDate && createdAtDate < presetStartDate) {
        return false
      }

      if (!normalizedSearch) return true

      const itemNames = Array.isArray(order.items?.lines)
        ? order.items.lines.map((line) => line.product_name).join(" ")
        : ""

      return `${order.customer_name || ""} ${order.customer_phone || ""} ${itemNames}`
        .toLowerCase()
        .includes(normalizedSearch)
    })
  }, [
    historyCustomEnd,
    historyCustomStart,
    historyOrders,
    historyPeriod,
    historySearch,
  ])

  if (loading) {
    return (
      <div className="lineskeats-theme min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-lg">Chargement...</div>
      </div>
    )
  }

  if (dataError) {
    return (
      <div className="lineskeats-theme min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-red-400">{dataError}</div>
      </div>
    )
  }

  // Route client publique - accessible a tous sans connexion
  if (route === "/client" || route === "/" || !route.startsWith("/restaurant")) {
    return <ClientInterface />
  }

  // Espace restaurant - non connecte
  if (!session?.user) {
    return <RestaurantSignup />
  }

  return (
    <div className="lineskeats-theme min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
        <div className="theme-header-panel mb-5 flex flex-col gap-4 px-4 py-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between sm:px-6 sm:py-5">
          <div>
            <BrandLogo preset="sm" tone="dark" showTagline={false} className="mb-3" />
            <h1 className="lineskeats-brand text-[1.9rem] font-bold leading-none text-white sm:text-2xl">
              {restaurant?.name || "Tableau de bord"}
            </h1>
            <p className="mt-2 max-w-sm text-sm text-slate-400">
              Gerez votre restaurant et vos commandes.
            </p>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="self-start rounded-full border border-white/10 px-4 py-2 text-[11px] uppercase tracking-widest text-white/70 hover:border-white/40 hover:text-white"
          >
            Deconnexion
          </button>
        </div>

        {!restaurant && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-slate-900/70 px-4 py-4 sm:mt-8 sm:px-6 sm:py-6">
            <h2 className="lineskeats-brand text-xl font-semibold text-white">
              Cree ton restaurant
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Renseigne les informations de base. Les reglages avances seront disponibles ensuite dans l onglet Parametres.
            </p>
            <div className="mt-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={restaurantName}
                  onChange={(event) => setRestaurantName(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-emerald-300/60 focus:outline-none"
                  placeholder="Nom"
                />
                <input
                  value={restaurantImage}
                  onChange={(event) => setRestaurantImage(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-emerald-300/60 focus:outline-none"
                  placeholder="URL image"
                />
                <textarea
                  value={restaurantDescription}
                  onChange={(event) => setRestaurantDescription(event.target.value)}
                  className="sm:col-span-2 rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-emerald-300/60 focus:outline-none"
                  placeholder="Description"
                  rows="3"
                />
                {restaurant && (
                  <div className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Delai d'attente (minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="120"
                      value={restaurantWaitTime}
                      onChange={(event) => {
                        const nextWaitTime = Number(event.target.value)
                        setRestaurantWaitTime(nextWaitTime)
                        persistWaitTimeSettings({ waitTime: nextWaitTime })
                      }}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-emerald-300/60 focus:outline-none"
                      placeholder="15"
                    />
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center space-x-2 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={restaurantIsActive}
                        onChange={(event) => setRestaurantIsActive(event.target.checked)}
                        className="rounded border-white/10 bg-slate-950 text-emerald-500 focus:border-emerald-300/60 focus:outline-none"
                      />
                      <span>Restaurant actif</span>
                    </label>
                  </div>
                  </div>
                )}
              </div>
              
            </div>
            <button
              onClick={async () => {
                setDataError("")

                try {
                  const { data } = await callRestaurantProfile("create", {
                    restaurant: {
                      name: restaurantName,
                      description: restaurantDescription,
                      image: restaurantImage,
                      address: restaurantAddress,
                      latitude: restaurantLatitude,
                      longitude: restaurantLongitude,
                      wait_time_minutes: restaurantWaitTime,
                      is_active: restaurantIsActive,
                      wait_time_mode: waitTimeMode,
                      base_wait_time: baseWaitTime,
                      max_wait_time: maxWaitTime,
                      capacity_threshold: capacityThreshold,
                    },
                  })

                  const restaurantData = data.restaurant

                  setRestaurant(restaurantData)
                  setActiveAdminTab("parametres")
                  loadOrders(restaurantData.id)
                  loadHistoryOrders(restaurantData.id)
                  loadMenu(restaurantData.id)
                } catch (error) {
                  setDataError(error.message)
                }
              }}
              className="mt-4 rounded-full bg-emerald-400 px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-slate-950"
            >
              Creer
            </button>
          </div>
        )}

        {restaurant && (
          <div className="-mx-1 mt-6 flex gap-2 overflow-x-auto px-1 pb-1 sm:mt-8 sm:flex-wrap sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0">
            {[
              { id: "parametres", label: "Parametres" },
              { id: "menu", label: "Menu" },
              { id: "live", label: `Live (${orders.length})` },
              { id: "historique", label: `Historique (${historyOrders.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveAdminTab(tab.id)}
                className={[
                  "shrink-0 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-colors",
                  activeAdminTab === tab.id
                    ? "bg-emerald-400 text-slate-950"
                    : "border border-white/10 bg-slate-900/70 text-white/70 hover:border-white/30 hover:text-white",
                ].join(" ")}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {restaurant && activeAdminTab === "parametres" && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-slate-900/70 px-4 py-4 sm:mt-8 sm:px-6 sm:py-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="lineskeats-menu text-lg font-semibold text-white sm:text-xl">
                  Parametres du restaurant
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Mets a jour les informations visibles cote client.
                </p>
              </div>
              {activeSettingsSubTab !== "stripe" && (
                <button
                  onClick={saveRestaurantSettings}
                  disabled={isSavingRestaurant}
                  className="w-full rounded-full bg-emerald-400 px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-slate-950 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {isSavingRestaurant ? "Enregistrement..." : "Enregistrer"}
                </button>
              )}
            </div>

            {saveRestaurantMessage && (
              <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-200">
                {saveRestaurantMessage}
              </div>
            )}

            <div className="-mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0">
              {[
                {
                  id: "restaurant",
                  label: "Restaurant",
                  description: "Nom, image, description et statut",
                },
                {
                  id: "operations",
                  label: "Exploitation",
                  description: "Adresse et categories visibles",
                },
                {
                  id: "stripe",
                  label: "Stripe",
                  description: "Paiements et reversements",
                },
              ].map((subTab) => (
                <button
                  key={subTab.id}
                  type="button"
                  onClick={() => setActiveSettingsSubTab(subTab.id)}
                  className={[
                    "min-w-[11.5rem] shrink-0 rounded-2xl border px-3 py-2.5 text-left transition-colors sm:min-w-0",
                    activeSettingsSubTab === subTab.id
                      ? "border-emerald-300/40 bg-emerald-400 text-slate-950"
                      : "border-white/10 bg-slate-950/40 text-white/80 hover:border-white/30 hover:text-white",
                  ].join(" ")}
                >
                  <p className="text-xs font-semibold uppercase tracking-widest">
                    {subTab.label}
                  </p>
                  <p className="mt-1 text-[11px] normal-case tracking-normal">
                    {subTab.description}
                  </p>
                </button>
              ))}
            </div>

            <div className="mt-5 space-y-4 sm:space-y-6">
              {activeSettingsSubTab === "restaurant" && (
                <div className="space-y-3 sm:space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3 sm:p-4">
                    <p className="text-xs uppercase tracking-widest text-slate-400">
                      Identite
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Informations visibles sur la fiche client.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      value={restaurantName}
                      onChange={(event) => setRestaurantName(event.target.value)}
                      className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-emerald-300/60 focus:outline-none"
                      placeholder="Nom"
                    />
                    <input
                      value={restaurantImage}
                      onChange={(event) => setRestaurantImage(event.target.value)}
                      className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-emerald-300/60 focus:outline-none"
                      placeholder="URL image"
                    />
                    <textarea
                      value={restaurantDescription}
                      onChange={(event) => setRestaurantDescription(event.target.value)}
                      className="sm:col-span-2 rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-emerald-300/60 focus:outline-none"
                      placeholder="Description"
                      rows="3"
                    />
                    <div className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
                      <div className="flex items-center">
                        <label className="flex items-center space-x-2 text-sm text-gray-300">
                          <input
                            type="checkbox"
                            checked={restaurantIsActive}
                            onChange={(event) => setRestaurantIsActive(event.target.checked)}
                            className="rounded border-white/10 bg-slate-950 text-emerald-500 focus:border-emerald-300/60 focus:outline-none"
                          />
                          <span>Restaurant actif</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSettingsSubTab === "operations" && (
                <div className="space-y-4 sm:space-y-6">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3 sm:p-4">
                    <p className="text-xs uppercase tracking-widest text-slate-400">
                      Exploitation
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Reglages de localisation et de categories visibles.
                    </p>
                  </div>
                  <LocationPicker
                    onLocationChange={(location) => {
                      setRestaurantAddress(location.address)
                      setRestaurantLatitude(location.lat)
                      setRestaurantLongitude(location.lng)
                    }}
                    initialLat={restaurantLatitude}
                    initialLng={restaurantLongitude}
                    initialAddress={restaurantAddress}
                  />

                  <CuisineTypeSelector
                    selectedCuisines={selectedCuisineTypes}
                    onCuisineChange={setSelectedCuisineTypes}
                  />
                </div>
              )}

              {activeSettingsSubTab === "stripe" && (
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-400">
                      Paiements Stripe
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-white">
                      Encaissement client et reversement restaurant
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      La plateforme conserve 10% et Stripe reverse 90% sur le compte du restaurant.
                    </p>
                  </div>
                  <span
                    className={[
                      "inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-widest",
                      isStripeReady
                        ? "bg-emerald-500/15 text-emerald-200"
                        : "bg-amber-500/15 text-amber-200",
                    ].join(" ")}
                  >
                    {isStripeReady ? "Paiements actifs" : "Configuration requise"}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3">
                    <p className="text-xs uppercase tracking-widest text-slate-500">
                      Compte Connect
                    </p>
                    <p className="mt-2 text-sm text-white">
                      {restaurant?.stripe_account_id || "Non connecte"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3">
                    <p className="text-xs uppercase tracking-widest text-slate-500">
                      Paiements
                    </p>
                    <p className="mt-2 text-sm text-white">
                      {restaurant?.stripe_charges_enabled ? "Actifs" : "En attente"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3">
                    <p className="text-xs uppercase tracking-widest text-slate-500">
                      Virements
                    </p>
                    <p className="mt-2 text-sm text-white">
                      {restaurant?.stripe_payouts_enabled ? "Actifs" : "En attente"}
                    </p>
                  </div>
                </div>

                {stripeStatusMessage && (
                  <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                    {stripeStatusMessage}
                  </div>
                )}

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={() =>
                      manageStripeConnect(isStripeReady ? "dashboard" : "onboarding")
                    }
                    disabled={isManagingStripe}
                    className="w-full rounded-full bg-emerald-400 px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-slate-950 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    {isManagingStripe
                      ? "Chargement..."
                      : isStripeReady
                        ? "Ouvrir Stripe"
                        : restaurant?.stripe_account_id
                          ? "Continuer Stripe"
                          : "Connecter Stripe"}
                  </button>
                  {restaurant?.stripe_account_id && (
                    <button
                      type="button"
                      onClick={() => manageStripeConnect("refresh")}
                      disabled={isManagingStripe}
                      className="w-full rounded-full border border-white/10 px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-white/70 hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                      Actualiser le statut
                    </button>
                  )}
                </div>
                </div>
              )}
            </div>
          </div>
        )}

        {restaurant && activeAdminTab === "menu" && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-slate-900/70 px-4 py-4 sm:mt-8 sm:px-6 sm:py-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="lineskeats-menu text-lg font-semibold text-white sm:text-xl">
                  Gerer le menu
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Ajoute des categories et des produits.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3 sm:p-4">
                <p className="text-xs uppercase tracking-widest text-slate-400">
                  Nouvelle categorie
                </p>
                <div className="mt-3 flex gap-2">
                  <input
                    value={newCategoryName}
                    onChange={(event) => setNewCategoryName(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-emerald-300/60 focus:outline-none"
                    placeholder="Ex: Burgers"
                  />
                  <button
                    onClick={createCategory}
                    className="rounded-xl bg-emerald-400 px-4 text-xs font-semibold uppercase tracking-widest text-slate-950"
                  >
                    Ajouter
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3 sm:p-4">
                <p className="text-xs uppercase tracking-widest text-slate-400">
                  Nouveau produit
                </p>
                <div className="mt-3 grid gap-2">
                  <input
                    value={newProductName}
                    onChange={(event) => setNewProductName(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-emerald-300/60 focus:outline-none"
                    placeholder="Nom du produit"
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      type="number"
                      step="0.01"
                      value={newProductPrice}
                      onChange={(event) => setNewProductPrice(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-emerald-300/60 focus:outline-none"
                      placeholder="Prix"
                    />
                    <select
                      value={newProductCategoryId}
                      onChange={(event) => setNewProductCategoryId(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-300/60 focus:outline-none"
                    >
                      <option value="">Selectionner une categorie</option>
                      {restaurantCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <ImageUpload
                    productId={newProductCategoryId || "new-product"}
                    currentImageUrl={newProductImageUrl}
                    onImageChange={setNewProductImageUrl}
                  />
                  <button
                    onClick={createProduct}
                    className="mt-2 w-full rounded-xl bg-emerald-400 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-950"
                  >
                    Ajouter le produit
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-4 sm:space-y-6">
              {restaurantCategories.map((category) => (
                <div key={category.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 sm:p-6">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <h3 className="lineskeats-menu text-base font-semibold text-white sm:text-lg">
                      {category.name}
                    </h3>
                    <button
                      onClick={() => deleteCategory(category.id)}
                      className="text-xs uppercase tracking-widest text-rose-300 hover:text-rose-200"
                    >
                      Supprimer
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {menuProducts
                      .filter((product) => product.category_id === category.id)
                      .map((product) => (
                        <div
                          key={product.id}
                          className="rounded-xl border border-white/5 bg-slate-950/40 p-4"
                        >
                          <div className="flex items-start justify-between gap-3 rounded-xl border border-white/5 px-3 py-2">
                            <div className="flex items-center gap-3">
                              {product.image_url && (
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  className="w-10 h-10 object-cover rounded-lg"
                                />
                              )}
                              <span className="lineskeats-menu text-sm font-medium text-white">
                                {product.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-emerald-200">
                                {currency(product.price)}
                              </span>
                              <button
                                onClick={() => deleteProduct(product.id)}
                                className="text-xs uppercase tracking-widest text-rose-300 hover:text-rose-200"
                              >
                                Supprimer
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/70 p-3">
                            <div className="flex items-center justify-between">
                              <p className="text-xs uppercase tracking-widest text-slate-400">
                                Options pour {product.name}
                              </p>
                            </div>

                            <div className="mt-3 flex gap-2">
                              <input
                                value={newOptionNameByProduct[product.id] || ""}
                                onChange={(event) =>
                                  setNewOptionNameByProduct((prev) => ({
                                    ...prev,
                                    [product.id]: event.target.value,
                                  }))
                                }
                                className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-emerald-300/60 focus:outline-none"
                                placeholder="Ex: Supplements, Cuisson, Sans..."
                              />
                              <button
                                onClick={() => createOption(product.id)}
                                className="rounded-lg bg-emerald-400 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-950"
                              >
                                Ajouter
                              </button>
                            </div>

                            <div className="mt-3 space-y-2">
                              {(optionsByProduct[product.id] || []).map((option) => (
                                <div
                                  key={option.id}
                                  className="rounded-lg border border-white/10 bg-slate-950/80 px-3 py-3"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="text-sm text-white">{option.name}</p>
                                    <button
                                      onClick={() => deleteOption(option.id)}
                                      className="text-[10px] uppercase tracking-widest text-rose-300 hover:text-rose-200"
                                    >
                                      Supprimer
                                    </button>
                                  </div>

                                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                                    <input
                                      value={newOptionItemNameByOption[option.id] || ""}
                                      onChange={(event) =>
                                        setNewOptionItemNameByOption((prev) => ({
                                          ...prev,
                                          [option.id]: event.target.value,
                                        }))
                                      }
                                      className="sm:col-span-2 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-emerald-300/60 focus:outline-none"
                                      placeholder="Ex: Sans cornichons, Viande supplementaire"
                                    />
                                    <input
                                      value={newOptionItemPriceByOption[option.id] || ""}
                                      onChange={(event) =>
                                        setNewOptionItemPriceByOption((prev) => ({
                                          ...prev,
                                          [option.id]: event.target.value,
                                        }))
                                      }
                                      className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-emerald-300/60 focus:outline-none"
                                      placeholder="0.00"
                                    />
                                  </div>

                                  <button
                                    onClick={() => createOptionItem(option.id)}
                                    className="mt-2 rounded-lg bg-emerald-400 px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-950"
                                  >
                                    Ajouter un choix
                                  </button>

                                  <div className="mt-2 space-y-1">
                                    {(optionItemsByOption[option.id] || []).map((item) => (
                                      <div
                                        key={item.id}
                                        className="flex items-center justify-between rounded-lg border border-white/5 px-3 py-2 text-xs text-slate-300"
                                      >
                                        <span>{item.name}</span>
                                        <div className="flex items-center gap-2">
                                          <span className="text-emerald-200">
                                            {Number(item.price) > 0
                                              ? `+${currency(item.price)}`
                                              : "gratuit"}
                                          </span>
                                          <button
                                            onClick={() => deleteOptionItem(item.id)}
                                            className="text-[10px] uppercase tracking-widest text-rose-300 hover:text-rose-200"
                                          >
                                            Supprimer
                                          </button>
                                        </div>
                                      </div>
                                    ))}

                                    {(optionItemsByOption[option.id] || []).length === 0 && (
                                      <p className="text-xs text-slate-500">
                                        Aucun choix dans ce groupe.
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}

                              {(optionsByProduct[product.id] || []).length === 0 && (
                                <p className="text-xs text-slate-500">
                                  Aucune option pour ce produit.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {restaurant && activeAdminTab === "live" && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-slate-900/70 px-4 py-4 sm:mt-8 sm:px-6 sm:py-6">
            <div className="flex flex-col gap-5 sm:gap-6">
              <div>
                <h2 className="lineskeats-brand mb-2 text-[1.7rem] font-semibold leading-none text-white sm:text-xl">
                  Live
                </h2>
                <p className="text-sm text-slate-400">
                  Suis les commandes en cours et ajuste immediatement le delai d'attente.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3 sm:p-4">
                <div className="mb-4">
                  <p className="text-xs uppercase tracking-widest text-slate-400">
                    Delai d'attente
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Cette valeur est visible cote client et impacte directement la carte.
                  </p>
                </div>

                <WaitTimeManager
                  restaurantId={restaurant?.id}
                  currentWaitTime={restaurantWaitTime}
                  currentMode={waitTimeMode}
                  baseWaitTime={baseWaitTime}
                  maxWaitTime={maxWaitTime}
                  capacityThreshold={capacityThreshold}
                  onWaitTimeChange={setRestaurantWaitTime}
                  onModeChange={setWaitTimeMode}
                  onSettingsChange={(settings) => {
                    if (settings.baseWaitTime !== undefined) setBaseWaitTime(settings.baseWaitTime)
                    if (settings.maxWaitTime !== undefined) setMaxWaitTime(settings.maxWaitTime)
                    if (settings.capacityThreshold !== undefined) setCapacityThreshold(settings.capacityThreshold)
                  }}
                />
              </div>

              <div>
                <h3 className="lineskeats-menu mb-4 text-base font-semibold text-white sm:text-lg">
                  Commandes recentes
                </h3>
            {orders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 px-6 py-8 text-sm text-slate-400">
                Aucune commande active pour le moment.
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-xl border border-white/10 bg-slate-950/60 p-3 sm:p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-white">
                        Commande #{order.id}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(order.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <span
                        className={[
                          "rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-widest",
                          order.payment_status === "paid"
                            ? "bg-emerald-500/15 text-emerald-200"
                            : "bg-amber-500/15 text-amber-200",
                        ].join(" ")}
                      >
                        {order.payment_status === "paid" ? "Payee" : "Paiement en attente"}
                      </span>
                      <select
                        value={order.status}
                        onChange={(e) => updateStatus(order.id, e.target.value)}
                        className="rounded-lg border border-white/10 bg-slate-950 px-3 py-1 text-sm text-white"
                      >
                        <option value="pending">En attente</option>
                        <option value="preparing">Preparation</option>
                        <option value="ready">Pret</option>
                        <option value="picked_up">Retiree</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => archiveOrder(order.id)}
                        disabled={archivingOrderId === order.id}
                        className="rounded-lg border border-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/70 hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {archivingOrderId === order.id ? "Archivage..." : "Archiver"}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteOrder(order.id)}
                        disabled={deletingOrderId === order.id}
                        className="rounded-lg border border-rose-500/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-rose-300 hover:border-rose-400/40 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingOrderId === order.id ? "Suppression..." : "Supprimer"}
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-slate-300">
                    Total: {currency(order.total)}
                  </div>
                  <div className="mt-2 text-sm text-slate-400">
                    <p>{order.customer_name || "Client invite"}</p>
                    {order.customer_phone && <p>{order.customer_phone}</p>}
                    {order.customer_email && <p>{order.customer_email}</p>}
                  </div>
                  {Array.isArray(order.items?.lines) && order.items.lines.length > 0 && (
                    <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-slate-900/50 p-3">
                      {order.items.lines.map((line, index) => (
                        <div
                          key={`${order.id}-line-${index}`}
                          className="flex items-start justify-between gap-3 text-sm text-slate-300"
                        >
                          <div>
                            <p className="text-white">
                              {line.quantity} x {line.product_name}
                            </p>
                            {line.comment && (
                              <p className="mt-1 text-xs text-amber-200">
                                Commentaire: {line.comment}
                              </p>
                            )}
                            {Array.isArray(line.option_items) && line.option_items.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-2">
                                {line.option_items.map((optionItem) => (
                                  <span
                                    key={`${order.id}-${index}-${optionItem.id}`}
                                    className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-widest text-slate-400"
                                  >
                                    {optionItem.option_name}: {optionItem.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <span>{currency(line.unit_price * line.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                ))}
              </div>
            )}
              </div>
            </div>
          </div>
        )}

        {restaurant && activeAdminTab === "historique" && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-slate-900/70 px-4 py-4 sm:mt-8 sm:px-6 sm:py-6">
            <div className="flex flex-col gap-5 sm:gap-6">
              <div>
                <h2 className="lineskeats-brand mb-2 text-[1.7rem] font-semibold leading-none text-white sm:text-xl">
                  Historique
                </h2>
                <p className="text-sm text-slate-400">
                  Analyse toutes les commandes du restaurant, filtre par periode et compare le
                  temps annonce avec le temps reel jusqu au retrait.
                </p>
              </div>

              <div className="grid gap-3 lg:grid-cols-4">
                <select
                  value={historyPeriod}
                  onChange={(event) => setHistoryPeriod(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white"
                >
                  <option value="week">Derniere semaine</option>
                  <option value="month">Dernier mois</option>
                  <option value="all">Toutes les commandes</option>
                  <option value="custom">Periode personnalisee</option>
                </select>
                <input
                  value={historySearch}
                  onChange={(event) => setHistorySearch(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-600"
                  placeholder="Client, telephone, produit"
                />
                <input
                  type="date"
                  value={historyCustomStart}
                  onChange={(event) => setHistoryCustomStart(event.target.value)}
                  disabled={historyPeriod !== "custom"}
                  className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white disabled:opacity-50"
                />
                <input
                  type="date"
                  value={historyCustomEnd}
                  onChange={(event) => setHistoryCustomEnd(event.target.value)}
                  disabled={historyPeriod !== "custom"}
                  className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white disabled:opacity-50"
                />
              </div>

              {historyLoading ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {[1, 2].map((item) => (
                    <div
                      key={item}
                      className="h-48 animate-pulse rounded-3xl border border-white/10 bg-slate-950/50"
                    />
                  ))}
                </div>
              ) : filteredHistoryOrders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 px-6 py-10 text-sm text-slate-400">
                  Aucune commande ne correspond a cette periode ou a ce filtre.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredHistoryOrders.map((order) => {
                    const pickupDurationMinutes = order.picked_up_at
                      ? Math.max(
                          1,
                          Math.round(
                            (new Date(order.picked_up_at).getTime() -
                              new Date(order.created_at).getTime()) /
                              60000
                          )
                        )
                      : null

                    return (
                      <article
                        key={order.id}
                        className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 sm:p-5"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-slate-400">
                              {formatOrderDateTime(order.created_at)}
                            </p>
                            <h3 className="mt-2 text-base font-semibold text-white">
                              Commande #{order.id}
                            </h3>
                            <div className="mt-2 text-sm text-slate-400">
                              <p>{order.customer_name || "Client invite"}</p>
                              {order.customer_phone && <p>{order.customer_phone}</p>}
                              {order.customer_email && <p>{order.customer_email}</p>}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-widest text-slate-300">
                              {normalizeOrderStatus(order.status) === "picked_up"
                                ? "Retiree"
                                : normalizeOrderStatus(order.status) === "ready"
                                  ? "Pret"
                                  : normalizeOrderStatus(order.status) === "preparing"
                                    ? "Preparation"
                                    : "En attente"}
                            </span>
                            <span className="rounded-full border border-emerald-300/40 bg-emerald-500/10 px-3 py-1 text-[10px] uppercase tracking-widest text-emerald-200">
                              {order.quoted_wait_time_minutes || 15} min annonces
                            </span>
                            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] uppercase tracking-widest text-amber-100">
                              {pickupDurationMinutes
                                ? `Retiree en ${pickupDurationMinutes} min`
                                : "Pas encore retiree"}
                            </span>
                            <button
                              type="button"
                              onClick={() => deleteOrder(order.id)}
                              disabled={deletingOrderId === order.id}
                              className="rounded-full border border-rose-500/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-rose-300 hover:border-rose-400/40 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {deletingOrderId === order.id ? "Suppression..." : "Supprimer"}
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <div className="rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-3">
                            <p className="text-[10px] uppercase tracking-widest text-slate-400">
                              Temps affiche a ce moment
                            </p>
                            <p className="mt-2 text-lg font-semibold text-white">
                              {order.quoted_wait_time_minutes || 15} min
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-3">
                            <p className="text-[10px] uppercase tracking-widest text-slate-400">
                              Temps reel jusqu au retrait
                            </p>
                            <p className="mt-2 text-lg font-semibold text-white">
                              {pickupDurationMinutes ? `${pickupDurationMinutes} min` : "En cours"}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-3">
                            <p className="text-[10px] uppercase tracking-widest text-slate-400">
                              Ecart
                            </p>
                            <p className="mt-2 text-lg font-semibold text-white">
                              {pickupDurationMinutes
                                ? `${pickupDurationMinutes - (order.quoted_wait_time_minutes || 15)} min`
                                : "--"}
                            </p>
                          </div>
                        </div>

                        {Array.isArray(order.items?.lines) && order.items.lines.length > 0 && (
                          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/40 p-4">
                            <p className="text-[10px] uppercase tracking-widest text-slate-400">
                              Contenu de la commande
                            </p>
                            <div className="mt-3 space-y-3">
                              {order.items.lines.map((line, index) => (
                                <div
                                  key={`${order.id}-history-line-${index}`}
                                  className="flex items-start justify-between gap-3 text-sm text-slate-300"
                                >
                                  <div>
                                    <p className="text-white">
                                      {line.quantity} x {line.product_name}
                                    </p>
                                    {line.comment && (
                                      <p className="mt-1 text-xs text-amber-200">
                                        Commentaire: {line.comment}
                                      </p>
                                    )}
                                  </div>
                                  <span>{currency(line.unit_price * line.quantity)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </article>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}



