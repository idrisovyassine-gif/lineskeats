import { useEffect, useMemo, useState } from "react"
import { supabase } from "./lib/supabaseClient"
import ImageUpload from "./components/ImageUpload"
import RestaurantMap from "./components/RestaurantMap"
import LocationPicker from "./components/LocationPicker"
import CuisineTypeSelector from "./components/CuisineTypeSelector"
import WaitTimeManager from "./components/WaitTimeManager"

const currency = (value) =>
  new Intl.NumberFormat("fr-BE", {
    style: "currency",
    currency: "EUR",
  }).format(value)

const getHashRoute = () => {
  const hash = window.location.hash || "#/"
  const clean = hash.replace("#", "")
  const [path, queryString] = clean.split("?")
  return {
    path: path || "/",
    query: new URLSearchParams(queryString || ""),
  }
}

function RestaurantSignup() {
  const { query } = getHashRoute()
  const restaurantId = query.get("restaurant")
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
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
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
    setError("")
    setIsSubmitting(true)

    try {
      if (authMode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        })
        if (signInError) setError(signInError.message)
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
        })
        if (signUpError) setError(signUpError.message)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
        <h1 className="text-3xl font-semibold text-white">
          {authMode === "login" ? "Connexion" : "Inscription"}
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          {authMode === "login"
            ? "Connectez-vous a votre espace restaurant."
            : "Creez votre compte restaurant."}
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={authEmail}
              onChange={(event) => setAuthEmail(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-emerald-300/60 focus:outline-none"
              placeholder="votre@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Mot de passe
            </label>
            <input
              type="password"
              value={authPassword}
              onChange={(event) => setAuthPassword(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-emerald-300/60 focus:outline-none"
              placeholder="••••••••••"
            />
          </div>
        </div>

        <button
          onClick={handleAuth}
          disabled={isSubmitting || !authEmail || !authPassword}
          className="mt-6 w-full rounded-full bg-emerald-400 px-5 py-3 text-xs font-semibold uppercase tracking-widest text-slate-950 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Chargement..." : authMode === "login" ? "Se connecter" : "S'inscrire"}
        </button>

        <div className="mt-4 text-center">
          <button
            onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}
            className="text-sm text-emerald-400 hover:text-emerald-300"
          >
            {authMode === "login"
              ? "Pas de compte ? S'inscrire"
              : "Deja un compte ? Se connecter"}
          </button>
        </div>
      </div>
    </div>
  )
}

function Dashboard() {
  const { query } = getHashRoute()
  const restaurantId = query.get("restaurant")
  const [session, setSession] = useState(null)
  const [authEmail, setAuthEmail] = useState("")
  const [authPassword, setAuthPassword] = useState("")
  const [authMode, setAuthMode] = useState("login")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
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
  const [menuCategories, setMenuCategories] = useState([])
  const [menuProducts, setMenuProducts] = useState([])
  const [menuOptions, setMenuOptions] = useState([])
  const [menuOptionItems, setMenuOptionItems] = useState([])
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newProductName, setNewProductName] = useState("")
  const [newProductPrice, setNewProductPrice] = useState("")
  const [newProductCategoryId, setNewProductCategoryId] = useState("")
  const [newProductImageUrl, setNewProductImageUrl] = useState("")

  const createProduct = async () => {
    if (
      !newProductName.trim() ||
      !newProductPrice ||
      !newProductCategoryId ||
      !restaurant?.id
    )
      return

    const { error } = await supabase
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
      setError(error.message)
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

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", categoryId)
      .eq("restaurant_id", restaurant.id)

    if (error) {
      setError(error.message)
    } else {
      loadMenu(restaurant.id)
    }
  }

  const deleteProduct = async (productId) => {
    if (!restaurant?.id) return

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId)

    if (error) {
      setError(error.message)
    } else {
      loadMenu(restaurant.id)
    }
  }

  const loadOrders = async (restaurantId) => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setOrders(data || [])
    }
  }

  const loadMenu = async (restaurantId) => {
    const [categoriesRes, productsRes, optionsRes, itemsRes] =
      await Promise.all([
        supabase
          .from("categories")
          .select("*")
          .eq("restaurant_id", restaurantId)
          .order("name"),
        supabase
          .from("products")
          .select("id, category_id, name, price, image_url")
          .eq("restaurant_id", restaurantId)
          .order("name"),
        supabase.from("product_options").select("*"),
        supabase
          .from("product_option_items")
          .select("*"),
      ])

    if (categoriesRes.error || productsRes.error || optionsRes.error || itemsRes.error) {
      setError(
        categoriesRes.error?.message ||
          productsRes.error?.message ||
          optionsRes.error?.message ||
          itemsRes.error?.message
      )
    } else {
      setMenuCategories(categoriesRes.data || [])
      setMenuProducts(productsRes.data || [])
      setMenuOptions(optionsRes.data || [])
      setMenuOptionItems(itemsRes.data || [])
      setLoading(false)
    }
  }

  const updateStatus = async (orderId, status) => {
    await supabase.from("orders").update({ status }).eq("id", orderId)
  }

  const createCategory = async () => {
    if (!newCategoryName.trim() || !restaurant?.id) return

    const { error } = await supabase
      .from("categories")
      .insert({
        name: newCategoryName.trim(),
        restaurant_id: restaurant.id,
      })
      .select()
      .single()

    if (error) {
      setError(error.message)
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

    const { error } = await supabase
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
      setError(error.message)
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

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", categoryId)
      .eq("restaurant_id", restaurant.id)

    if (error) {
      setError(error.message)
    } else {
      loadMenu(restaurant.id)
    }
  }

  const deleteProduct = async (productId) => {
    if (!restaurant?.id) return

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId)

    if (error) {
      setError(error.message)
    } else {
      loadMenu(restaurant.id)
    }
  }

  const loadRestaurant = async () => {
    const { data, error: restaurantError } = await supabase
      .from("restaurants")
      .select(`
        id, name, description, image, owner_id, address, latitude, longitude, 
        wait_time_minutes, is_active, wait_time_mode, base_wait_time, 
        max_wait_time, capacity_threshold,
        restaurant_cuisine_types (
          cuisine_type_id,
          cuisine_types (id, name, icon, color)
        )
      `)
      .eq("owner_id", session.user.id)
      .maybeSingle()

    if (restaurantError) {
      setError(restaurantError.message)
    } else {
      setRestaurant(data)
      setRestaurantName(data?.name ?? "")
      setRestaurantDescription(data?.description ?? "")
      setRestaurantImage(data?.image ?? "")
      setRestaurantAddress(data?.address ?? "")
      setRestaurantLatitude(data?.latitude)
      setRestaurantLongitude(data?.longitude)
      setRestaurantWaitTime(data?.wait_time_minutes ?? 15)
      setRestaurantIsActive(data?.is_active ?? true)
      setWaitTimeMode(data?.wait_time_mode ?? 'manual')
      setBaseWaitTime(data?.base_wait_time ?? 15)
      setMaxWaitTime(data?.max_wait_time ?? 60)
      setCapacityThreshold(data?.capacity_threshold ?? 10)
      
      const cuisineIds = data?.restaurant_cuisine_types?.map(rct => rct.cuisine_type_id) || []
      setSelectedCuisineTypes(cuisineIds)
      
      if (data?.id) {
        loadOrders(data.id)
        loadMenu(data.id)
      } else {
        setOrders([])
        setLoading(false)
      }
    }
  }

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

  useEffect(() => {
    if (!session?.user) return

    const loadRestaurant = async () => {
      const { data, error: restaurantError } = await supabase
        .from("restaurants")
        .select(`
          id, name, description, image, owner_id, address, latitude, longitude, 
          wait_time_minutes, is_active, wait_time_mode, base_wait_time, 
          max_wait_time, capacity_threshold,
          restaurant_cuisine_types (
            cuisine_type_id,
            cuisine_types (id, name, icon, color)
          )
        `)
        .eq("owner_id", session.user.id)
        .maybeSingle()

      if (restaurantError) {
        setError(restaurantError.message)
      } else {
        setRestaurant(data)
        setRestaurantName(data?.name ?? "")
        setRestaurantDescription(data?.description ?? "")
        setRestaurantImage(data?.image ?? "")
        setRestaurantAddress(data?.address ?? "")
        setRestaurantLatitude(data?.latitude)
        setRestaurantLongitude(data?.longitude)
        setRestaurantWaitTime(data?.wait_time_minutes ?? 15)
        setRestaurantIsActive(data?.is_active ?? true)
        setWaitTimeMode(data?.wait_time_mode ?? 'manual')
        setBaseWaitTime(data?.base_wait_time ?? 15)
        setMaxWaitTime(data?.max_wait_time ?? 60)
        setCapacityThreshold(data?.capacityThreshold ?? 10)
        
        const cuisineIds = data?.restaurant_cuisine_types?.map(rct => rct.cuisine_type_id) || []
        setSelectedCuisineTypes(cuisineIds)
        
        if (data?.id) {
          loadOrders(data.id)
          loadMenu(data.id)
        } else {
          setOrders([])
          setLoading(false)
        }
      }
    }

    loadRestaurant()
  }, [session?.user])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-white">Chargement...</div>
      </div>
    )
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
          <h1 className="text-3xl font-semibold text-white">
            Espace restaurant
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Connectez-vous a votre espace restaurant.
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-emerald-300/60 focus:outline-none"
                placeholder="votre@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-emerald-300/60 focus:outline-none"
                placeholder="••••••••••"
              />
            </div>
          </div>

          <button
            onClick={() => {
              setError("")
              const { error } = supabase.auth.signInWithPassword({
                email: authEmail,
                password: authPassword,
              })
              if (error) {
                setError(error.message)
              }
            }}
            className="mt-6 w-full rounded-full bg-emerald-400 px-5 py-3 text-xs font-semibold uppercase tracking-widest text-slate-950"
          >
            Se connecter
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl w-full px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-white">
            Tableau de bord
          </h1>
          <button
            onClick={() => supabase.auth.signOut()}
            className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-widest text-white/70 hover:border-white/40 hover:text-white"
          >
            Deconnexion
          </button>
        </div>

        {!restaurant && (
          <div className="mt-8 rounded-3xl border border-white/10 bg-slate-900/70 px-6 py-6">
            <h2 className="lineskeats-brand text-xl font-semibold text-white">
              Cree ton restaurant
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Ces infos seront utilisees pour l app client.
            </p>
            <div className="mt-4 space-y-6">
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
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Délai d'attente (minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="120"
                      value={restaurantWaitTime}
                      onChange={(event) => setRestaurantWaitTime(Number(event.target.value))}
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
            <button
              onClick={async () => {
                setError("")
                
                const { data: restaurantData, error: createError } = await supabase
                  .from("restaurants")
                  .insert({
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
                    owner_id: session.user.id,
                  })
                  .select()
                  .single()
                
                if (createError) {
                  setError(createError.message)
                  return
                }

                if (selectedCuisineTypes.length > 0) {
                  const cuisineRelations = selectedCuisineTypes.map(cuisineId => ({
                    restaurant_id: restaurantData.id,
                    cuisine_type_id: cuisineId
                  }))
                  
                  const { error: cuisineError } = await supabase
                    .from("restaurant_cuisine_types")
                    .insert(cuisineRelations)
                  
                  if (cuisineError) {
                    setError(cuisineError.message)
                    return
                  }
                }

                setRestaurant(restaurantData)
                loadOrders(restaurantData.id)
                loadMenu(restaurantData.id)
              }}
              className="mt-4 rounded-full bg-emerald-400 px-5 py-3 text-xs font-semibold uppercase tracking-widest text-slate-950"
            >
              Creer
            </button>
          </div>
        )}

        {restaurant && (
          <div className="mt-8 rounded-3xl border border-white/10 bg-slate-900/70 px-6 py-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="lineskeats-menu text-xl font-semibold text-white">
                  Gérer le menu
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Ajoute des catégories et des produits.
                </p>
              </div>
              
              <div>
                <h2 className="lineskeats-brand text-xl font-semibold text-white">
                  Paramètres du restaurant
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Modifie les informations de ton restaurant.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/60 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nom du restaurant
                  </label>
                  <input
                    value={restaurantName}
                    onChange={(event) => setRestaurantName(event.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-emerald-300/60 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    URL image
                  </label>
                  <input
                    value={restaurantImage}
                    onChange={(event) => setRestaurantImage(event.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-emerald-300/60 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={restaurantDescription}
                    onChange={(event) => setRestaurantDescription(event.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-emerald-300/60 focus:outline-none"
                    rows="3"
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
              
              <CuisineTypeSelector
                selectedCuisines={selectedCuisineTypes}
                onCuisineChange={setSelectedCuisineTypes}
              />
              
              <button
                onClick={async () => {
                  setError("")
                  const { error: updateError } = await supabase
                    .from("restaurants")
                    .update({
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
                    })
                    .eq("id", restaurant.id)
                  
                  if (updateError) {
                    setError(updateError.message)
                  } else {
                    await supabase
                      .from("restaurant_cuisine_types")
                      .delete()
                      .eq("restaurant_id", restaurant.id)
                    
                    if (selectedCuisineTypes.length > 0) {
                      const cuisineRelations = selectedCuisineTypes.map(cuisineId => ({
                        restaurant_id: restaurant.id,
                        cuisine_type_id: cuisineId
                      }))
                      
                      await supabase
                        .from("restaurant_cuisine_types")
                        .insert(cuisineRelations)
                    }
                    
                    alert("Paramètres sauvegardés !")
                  }
                }}
                className="mt-4 rounded-full bg-emerald-400 px-5 py-3 text-xs font-semibold uppercase tracking-widest text-slate-950"
              >
                Sauvegarder les paramètres
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-widest text-slate-400">
                  Nouvelle catégorie
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

              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
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
                      <option value="">Sélectionner une catégorie</option>
                      {menuCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <ImageUpload
                    onImageUploaded={(url) => setNewProductImageUrl(url)}
                    currentImageUrl={newProductImageUrl}
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

            {menuCategories.length > 0 && (
              <div className="mt-8 space-y-6">
                <h2 className="lineskeats-brand text-xl font-semibold text-white">
                  Menu
                </h2>

                {menuCategories.map((category) => (
                  <section key={category.id} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="lineskeats-menu text-xl font-semibold text-white">
                        {category.name}
                      </h3>
                      <button
                        onClick={() => deleteCategory(category.id)}
                        className="text-xs uppercase tracking-widest text-rose-300 hover:text-rose-200"
                      >
                        Supprimer
                      </button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {menuProducts
                        .filter((product) => product.category_id === category.id)
                        .map((product) => (
                          <div
                            key={product.id}
                            className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
                          >
                            <div className="flex items-center justify-between rounded-xl border border-white/5 px-3 py-2">
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
                          </div>
                        ))}
                    </div>
                  </section>
                ))}
              </div>
            )}

            {orders.length > 0 && (
              <div className="mt-8 space-y-4">
                <h2 className="lineskeats-brand text-xl font-semibold text-white">
                  Commandes
                </h2>

                <div className="space-y-4">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-300">
                            Commande #{order.id}
                          </p>
                          <p className="text-xs text-slate-400">
                            {new Date(order.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs uppercase tracking-widest text-emerald-200/70">
                            {order.status}
                          </span>
                          <span className="rounded-full border border-white/20 px-3 py-1">
                            {order.total ? currency(order.total) : "N/A"}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <p className="text-sm text-slate-300 mb-2">
                          Détails de la commande:
                        </p>
                        <div className="space-y-2">
                          {order.items?.map((item, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between rounded-lg border border-white/5 px-3 py-2"
                            >
                              <div className="flex items-center gap-3">
                                {item.image_url && (
                                  <img
                                    src={item.image_url}
                                    alt={item.name}
                                    className="w-10 h-10 object-cover rounded-lg"
                                  />
                                )}
                                <span className="lineskeats-menu text-sm font-medium text-white">
                                  {item.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-emerald-200">
                                  {currency(item.price)}
                                </span>
                                <span className="text-xs text-slate-400">
                                  x{item.quantity}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-end gap-2">
                        {order.status === "pending" && (
                          <button
                            onClick={() => updateStatus(order.id, "preparing")}
                            className="rounded-full bg-amber-300/90 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-950"
                          >
                            En preparation
                          </button>
                        )}
                        {order.status === "preparing" && (
                          <button
                            onClick={() => updateStatus(order.id, "ready")}
                            className="rounded-full bg-emerald-300 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-950"
                          >
                            Pret
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function CustomerApp() {
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(null)
  const [cartItems, setCartItems] = useState({})
  const [dataError, setDataError] = useState("")
  const [dataLoading, setDataLoading] = useState(true)
  const [restaurantsData, setRestaurantsData] = useState([])
  const [categoriesData, setCategoriesData] = useState([])
  const [productsData, setProductsData] = useState([])
  const [optionsData, setOptionsData] = useState([])
  const [optionItemsData, setOptionItemsData] = useState([])
  const [selectedOptionItemsByProduct, setSelectedOptionItemsByProduct] =
    useState({})

  useEffect(() => {
    const loadData = async () => {
      setDataError("")
      setDataLoading(true)
      const [restaurantsRes, categoriesRes, productsRes, optionsRes, itemsRes] =
        await Promise.all([
        supabase.from("restaurants").select(`
          id, name, description, image, address, latitude, longitude, 
          wait_time_minutes, is_active,
          restaurant_cuisine_types (
            cuisine_type_id,
            cuisine_types (id, name, icon, color)
          )
        `),
        supabase.from("categories").select("id, restaurant_id, name"),
        supabase.from("products").select("id, category_id, name, price, image_url"),
        supabase.from("product_options").select("id, product_id, name, required"),
        supabase
          .from("product_option_items")
          .select("id, option_id, name, price"),
      ])

      if (
        restaurantsRes.error ||
        categoriesRes.error ||
        productsRes.error ||
        optionsRes.error ||
        itemsRes.error
      ) {
        setDataError(
          restaurantsRes.error?.message ||
            categoriesRes.error?.message ||
            productsRes.error?.message ||
            optionsRes.error?.message ||
            itemsRes.error?.message
        )
      } else {
        setRestaurantsData(restaurantsRes.data || [])
        setCategoriesData(categoriesRes.data || [])
        setProductsData(productsRes.data || [])
        setOptionsData(optionsRes.data || [])
        setOptionItemsData(itemsRes.data || [])
        setDataLoading(false)
      }
    }

    loadData()
  }, [])

  const restaurantsList = useMemo(() => {
    return restaurantsData.filter((r) => r.is_active !== false)
  }, [restaurantsData])

  const selectedRestaurant = useMemo(() => {
    return restaurantsList.find((r) => r.id === selectedRestaurantId)
  }, [restaurantsList, selectedRestaurantId])

  const restaurantCategories = useMemo(() => {
    if (!selectedRestaurantId) return []
    return categoriesData.filter((c) => c.restaurant_id === selectedRestaurantId)
  }, [categoriesData, selectedRestaurantId])

  const productsList = productsData

  const productsByCategory = useMemo(() => {
    if (!selectedRestaurantId) return {}
    return restaurantCategories.reduce((acc, category) => {
      acc[category.id] = productsList.filter(
        (product) => product.category_id === category.id
      )
      return acc
    }, {})
  }, [restaurantCategories, productsList])

  const addToCart = (productId, optionItems) => {
    setCartItems((prev) => ({
      ...prev,
      [productId]: [...(prev[productId] || []), optionItems],
    }))
  }

  const removeFromCart = (productId, optionItemsIndex) => {
    setCartItems((prev) => {
      const productItems = prev[productId] || []
      const newItems = productItems.filter((_, index) => index !== optionItemsIndex)
      if (newItems.length === 0) {
        const { [productId]: removed, ...rest } = prev
        return rest
      }
      return {
        ...prev,
        [productId]: newItems,
      }
    })
  }

  const getCartTotal = () => {
    let total = 0
    Object.entries(cartItems).forEach(([productId, items]) => {
      const product = productsList.find((p) => p.id === productId)
      if (product) {
        items.forEach((item) => {
          total += product.price + (item.price || 0)
        })
      }
    })
    return total
  }

  const getCartItemsCount = () => {
    return Object.values(cartItems).reduce((total, items) => total + items.length, 0)
  }

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-white">Chargement...</div>
      </div>
    )
  }

  if (dataError) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-red-400">{dataError}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl w-full px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="lineskeats-brand text-3xl font-bold text-white">
            Lineskeats
          </h1>
          <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-white/70">
            <span>4.8</span>
            <span>⭐</span>
            <span>🚀</span>
          </div>
        </div>

        <p className="mt-4 text-center text-lg text-slate-300">
          Des adresses locales, des plats frais et une experience mobile fluide.
        </p>

        {!selectedRestaurant && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h2 className="lineskeats-menu text-xl font-semibold text-white">
                Restaurants près de vous
              </h2>
              <RestaurantMap
                restaurants={restaurantsList.filter(r => r.is_active !== false)}
                onRestaurantSelect={(restaurant) => setSelectedRestaurantId(restaurant.id)}
              />
            </div>

            <div className="space-y-4">
              <h2 className="lineskeats-menu text-xl font-semibold text-white">
                Gérer le menu
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {restaurantsList.map((restaurant) => (
                  <button
                    key={restaurant.id}
                    onClick={() => setSelectedRestaurantId(restaurant.id)}
                    className="group flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 text-left shadow-xl transition hover:-translate-y-1 hover:border-emerald-300/40 hover:bg-slate-900"
                  >
                    <div className="relative h-44 w-full overflow-hidden">
                      {restaurant.image ? (
                        <img
                          src={restaurant.image}
                          alt={restaurant.name}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center">
                          <span className="text-white/50 text-4xl">🍽️</span>
                        </div>
                      )}
                      <span className="absolute left-4 top-4 rounded-full bg-white/10 px-3 py-1 text-[11px] uppercase tracking-widest text-white">
                        {restaurant.is_active === false ? 'Fermé' : 'Ouvert'}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col gap-3 px-5 py-6">
                      <div>
                        <h2 className="lineskeats-brand text-xl font-semibold text-white">
                          {restaurant.name}
                        </h2>
                        <p className="mt-2 text-sm text-slate-300">
                          {restaurant.description}
                        </p>
                        {restaurant.address && (
                          <p className="mt-1 text-xs text-slate-400">
                            📍 {restaurant.address}
                          </p>
                        )}
                        {restaurant.restaurant_cuisine_types && restaurant.restaurant_cuisine_types.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {restaurant.restaurant_cuisine_types.map(rct => (
                              <span
                                key={rct.cuisine_type_id}
                                className={`inline-flex items-center gap-1 rounded-full bg-${rct.cuisine_types?.color || 'emerald-500'}/20 px-2 py-1 text-xs text-white`}
                              >
                                <span>{rct.cuisine_types?.icon || '🍽️'}</span>
                                <span>{rct.cuisine_types?.name}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="mt-auto flex items-center justify-between text-xs uppercase tracking-widest text-emerald-200/80">
                        <span>Voir le menu</span>
                        <span className="rounded-full border border-emerald-200/30 px-3 py-1">
                          {restaurant.wait_time_minutes || 15} min
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {!selectedRestaurant &&
          !dataLoading &&
          restaurantsList.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-5 py-6 text-sm text-slate-400">
              Aucun restaurant disponible pour le moment.
            </div>
          )}

        {selectedRestaurant && (
          <div className="space-y-8">
            <div className="glass flex flex-col gap-4 rounded-3xl border border-white/10 p-6 shadow-2xl sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                {selectedRestaurant.image ? (
                  <img
                    src={selectedRestaurant.image}
                    alt={selectedRestaurant.name}
                    className="h-16 w-16 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center">
                    <span className="text-white/50 text-2xl">🍽️</span>
                  </div>
                )}
                <div>
                  <h2 className="lineskeats-brand text-2xl font-semibold text-white">
                    {selectedRestaurant.name}
                  </h2>
                  <p className="text-sm text-slate-300">
                    Livraison gratuite des 25 EUR
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-white/70">
                <span className="rounded-full border border-white/20 px-3 py-1">
                  4.8
                </span>
                <span>⭐</span>
                <span>🚀</span>
              </div>
            </div>

            {Object.keys(cartItems).length > 0 && (
              <div className="glass rounded-3xl border border-white/10 p-6 shadow-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Panier</h3>
                  <button
                    onClick={() => setCartItems({})}
                    className="text-xs uppercase tracking-widest text-rose-300 hover:text-rose-200"
                  >
                    Vider
                  </button>
                </div>

                <div className="mt-4 space-y-2">
                  {Object.entries(cartItems).map(([productId, items]) => {
                    const product = productsList.find((p) => p.id === productId)
                    return (
                      <div
                        key={productId}
                        className="flex items-center justify-between rounded-lg border border-white/5 px-3 py-2"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-white">
                            {product?.name} x{items.length}
                          </span>
                        </div>
                        <span className="text-emerald-200">
                          {currency(
                            items.reduce(
                              (total, item) =>
                                total +
                                (product?.price || 0) + (item.price || 0),
                              0
                            )
                          )}
                        </span>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-slate-300">
                    Total: {currency(getCartTotal())}
                  </span>
                  <button
                    className="rounded-full bg-emerald-400 px-5 py-3 text-xs font-semibold uppercase tracking-widest text-slate-950"
                  >
                    Commander
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-8">
              {restaurantCategories.map((category) => (
                <section key={category.id} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="lineskeats-menu text-xl font-semibold text-white">
                      {category.name}
                    </h3>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {productsByCategory[category.id]?.map((product) => (
                      <div
                        key={product.id}
                        className="group rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-xl transition hover:-translate-y-1 hover:border-emerald-300/40"
                      >
                        <div className="flex items-center justify-between rounded-xl border border-white/5 px-3 py-2">
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
                          </div>
                        </div>

                        <div className="mt-4">
                          {optionsData
                            .filter((option) => option.product_id === product.id)
                            .map((option) => {
                              const optionItems = optionItemsData.filter(
                                (item) => item.option_id === option.id
                              )
                              return (
                                <div key={option.id} className="space-y-2">
                                  <p className="text-sm text-slate-300">
                                    {option.name} {option.required && "(obligatoire)"}
                                  </p>
                                  <div className="grid gap-2 sm:grid-cols-2">
                                    {optionItems.map((item) => {
                                      const isSelected =
                                        selectedOptionItemsByProduct[product.id]?.some(
                                          (selectedItem) => selectedItem.id === item.id
                                        )
                                      return (
                                        <button
                                          key={item.id}
                                          onClick={() => {
                                            if (isSelected) {
                                              const currentIndex = selectedOptionItemsByProduct[
                                                product.id
                                              ]?.findIndex(
                                                  (selectedItem) => selectedItem.id === item.id
                                                )
                                              if (currentIndex !== -1) {
                                                removeFromCart(product.id, currentIndex)
                                              }
                                            } else {
                                              addToCart(product.id, item)
                                            }
                                          }}
                                          className={`rounded-lg border px-3 py-2 text-sm transition ${
                                            isSelected
                                              ? "border-emerald-300/60 bg-emerald-300/10 text-emerald-200"
                                              : "border-white/10 bg-slate-950 text-white hover:border-white/20"
                                          }`}
                                        >
                                          <div className="flex items-center justify-between">
                                            <span>{item.name}</span>
                                            <span>
                                              {currency(item.price)}
                                            </span>
                                          </div>
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>
                              )
                            })}
                        </div>

                        <button
                          onClick={() => {
                            const selectedItems = selectedOptionItemsByProduct[product.id] || []
                            if (selectedItems.length === 0) {
                              alert("Veuillez sélectionner les options requises")
                              return
                            }
                            addToCart(product.id, selectedItems[0])
                          }}
                          className="mt-4 w-full rounded-full bg-emerald-400 px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-950 transition hover:bg-emerald-300"
                        >
                          Ajouter au panier
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function App() {
  const { path } = getHashRoute()

  if (path === "/restaurant-signup") {
    return <RestaurantSignup />
  }

  if (path.startsWith("/restaurant")) {
    return <Dashboard />
  }

  return <CustomerApp />
}

export default App
