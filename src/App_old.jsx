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
          <div className="mt-6 space-y-3">
            <a
              href="#/dashboard"
              className="block rounded-2xl bg-emerald-400 py-3 text-center text-sm font-semibold uppercase tracking-widest text-slate-950"
            >
              Aller au dashboard
            </a>
            <a
              href="#/"
              className="block text-center text-xs uppercase tracking-widest text-slate-500 hover:text-white"
            >
              Retour a l app
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
        <h1 className="text-3xl font-semibold text-white">Espace restaurant</h1>
        <p className="mt-2 text-sm text-slate-400">
          Creez un compte ou connectez-vous pour acceder au dashboard.
        </p>
        {restaurantId && (
          <p className="mt-2 text-xs uppercase tracking-widest text-emerald-200/70">
            Restaurant id : {restaurantId}
          </p>
        )}
        <div className="mt-6 space-y-4">
          <input
            value={authEmail}
            onChange={(event) => setAuthEmail(event.target.value)}
            type="email"
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-lg text-white placeholder:text-slate-600 focus:border-emerald-300/60 focus:outline-none"
            placeholder="Email"
          />
          <input
            value={authPassword}
            onChange={(event) => setAuthPassword(event.target.value)}
            type="password"
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-lg text-white placeholder:text-slate-600 focus:border-emerald-300/60 focus:outline-none"
            placeholder="Mot de passe"
          />
          {error && <p className="text-sm text-rose-300">{error}</p>}
          <button
            onClick={async () => {
              setError("")
              setIsSubmitting(true)
              if (authMode === "login") {
                const { error: loginError } =
                  await supabase.auth.signInWithPassword({
                    email: authEmail,
                    password: authPassword,
                  })
                if (loginError) setError(loginError.message)
                else window.location.hash = "#/dashboard"
              } else {
                const { error: signUpError } = await supabase.auth.signUp({
                  email: authEmail,
                  password: authPassword,
                })
                if (signUpError) setError(signUpError.message)
                else window.location.hash = "#/dashboard"
              }
              setIsSubmitting(false)
            }}
            className="w-full rounded-2xl bg-emerald-400 py-3 text-sm font-semibold uppercase tracking-widest text-slate-950 disabled:opacity-70"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "..."
              : authMode === "login"
              ? "Connexion"
              : "Creer le compte"}
          </button>
          <button
            onClick={() =>
              setAuthMode((prev) => (prev === "login" ? "signup" : "login"))
            }
            className="w-full text-xs uppercase tracking-widest text-slate-500 hover:text-white"
          >
            {authMode === "login" ? "Creer un compte" : "J ai deja un compte"}
          </button>
          <a
            href="#/"
            className="block text-center text-xs uppercase tracking-widest text-slate-500 hover:text-white"
          >
            Retour a l app
          </a>
        </div>
      </div>
    </div>
  )
}

function Dashboard() {
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const productsByCategory = useMemo(() => {
    return menuCategories.reduce((acc, category) => {
      acc[category.id] = menuProducts.filter(
        (product) => product.category_id === category.id
      )
      return acc
    }, {})
  }, [menuCategories, menuProducts])

  const optionsByProduct = useMemo(() => {
    return menuOptions.reduce((acc, option) => {
      acc[option.product_id] = acc[option.product_id] || []
      acc[option.product_id].push(option)
      return acc
    }, {})
  }, [menuOptions])

  const optionItemsByOption = useMemo(() => {
    return menuOptionItems.reduce((acc, item) => {
      acc[item.option_id] = acc[item.option_id] || []
      acc[item.option_id].push(item)
      return acc
    }, {})
  }, [menuOptionItems])

  const loadOrders = async (restaurantId) => {
    setError("")
    setLoading(true)
    const query = supabase
      .from("orders")
      .select(
        "id, restaurant_id, items, total, status, created_at, customer_name, customer_phone"
      )
      .order("created_at", { ascending: false })

    if (restaurantId) query.eq("restaurant_id", restaurantId)

    const { data, error: queryError } = await query
    if (queryError) {
      setError(queryError.message)
    } else {
      setOrders(data ?? [])
    }
    setLoading(false)
  }

  const loadMenu = async (restaurantId) => {
    const { data: categoriesData, error: categoriesError } = await supabase
      .from("categories")
      .select("id, restaurant_id, name")
      .eq("restaurant_id", restaurantId)
      .order("id", { ascending: true })

    if (categoriesError) {
      setError(categoriesError.message)
      setMenuCategories([])
      setMenuProducts([])
      return
    }

    const categoryIds = (categoriesData ?? []).map((category) => category.id)
    setMenuCategories(categoriesData ?? [])

    if (!categoryIds.length) {
      setMenuProducts([])
      return
    }

    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select("id, category_id, name, price, image_url")
      .in("category_id", categoryIds)
      .order("id", { ascending: true })

    if (productsError) {
      setError(productsError.message)
    } else {
      setMenuProducts(productsData ?? [])
      const productIds = (productsData ?? []).map((product) => product.id)
      await loadOptions(productIds)
    }
  }

  const loadOptions = async (productIds) => {
    if (!productIds.length) {
      setMenuOptions([])
      setMenuOptionItems([])
      return
    }

    const { data: optionsData, error: optionsError } = await supabase
      .from("product_options")
      .select("id, product_id, name, required")
      .in("product_id", productIds)
      .order("id", { ascending: true })

    if (optionsError) {
      setError(optionsError.message)
      setMenuOptions([])
      setMenuOptionItems([])
      return
    }

    setMenuOptions(optionsData ?? [])

    const optionIds = (optionsData ?? []).map((option) => option.id)
    if (!optionIds.length) {
      setMenuOptionItems([])
      return
    }

    const { data: itemsData, error: itemsError } = await supabase
      .from("product_option_items")
      .select("id, option_id, name, price")
      .in("option_id", optionIds)
      .order("id", { ascending: true })

    if (itemsError) {
      setError(itemsError.message)
    } else {
      setMenuOptionItems(itemsData ?? [])
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

    return () => {
      authListener.subscription.unsubscribe()
    }
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
        setCapacityThreshold(data?.capacity_threshold ?? 10)
        
        // Extraire les IDs des types de cuisine
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
  }, [session])

  useEffect(() => {
    if (!restaurant?.id) return
    const channel = supabase
      .channel(`orders-${restaurant.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        () => loadOrders(restaurant.id)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [restaurant])

  const updateStatus = async (orderId, status) => {
    await supabase.from("orders").update({ status }).eq("id", orderId)
  }

  const createCategory = async () => {
    if (!newCategoryName.trim() || !restaurant?.id) return
    setError("")
    const { data, error: insertError } = await supabase
      .from("categories")
      .insert({
        name: newCategoryName.trim(),
        restaurant_id: restaurant.id,
      })
      .select()
      .single()
    if (insertError) {
      setError(insertError.message)
    } else {
      setMenuCategories((prev) => [...prev, data])
      setNewCategoryName("")
    }
  }

  const deleteCategory = async (categoryId) => {
    await supabase.from("categories").delete().eq("id", categoryId)
    setMenuCategories((prev) => prev.filter((cat) => cat.id !== categoryId))
    setMenuProducts((prev) =>
      prev.filter((product) => product.category_id !== categoryId)
    )
  }

  const createProduct = async () => {
    if (!restaurant?.id) return
    const price = Number.parseFloat(newProductPrice)
    if (!newProductName.trim() || Number.isNaN(price)) return
    if (!newProductCategoryId) return
    setError("")
    const { data, error: insertError } = await supabase
      .from("products")
      .insert({
        name: newProductName.trim(),
        price,
        category_id: Number(newProductCategoryId),
        image_url: newProductImageUrl || null,
      })
      .select()
      .single()
    if (insertError) {
      setError(insertError.message)
    } else {
      setMenuProducts((prev) => [...prev, data])
      setNewProductName("")
      setNewProductPrice("")
      setNewProductCategoryId("")
      setNewProductImageUrl("")
    }
  }

  const deleteProduct = async (productId) => {
    await supabase.from("products").delete().eq("id", productId)
    setMenuProducts((prev) => prev.filter((product) => product.id !== productId))
    setMenuOptions((prevOptions) => {
      const remaining = prevOptions.filter(
        (option) => option.product_id !== productId
      )
      const removedIds = prevOptions
        .filter((option) => option.product_id === productId)
        .map((option) => option.id)
      setMenuOptionItems((prevItems) =>
        prevItems.filter((item) => !removedIds.includes(item.option_id))
      )
      return remaining
    })
  }

  const createOption = async (productId) => {
    const name = (newOptionNameByProduct[productId] || "").trim()
    if (!name) return
    setError("")
    const { data, error: insertError } = await supabase
      .from("product_options")
      .insert({
        name,
        product_id: productId,
        required: false,
      })
      .select()
      .single()
    if (insertError) {
      setError(insertError.message)
    } else {
      setMenuOptions((prev) => [...prev, data])
      setNewOptionNameByProduct((prev) => ({ ...prev, [productId]: "" }))
    }
  }

  const deleteOption = async (optionId) => {
    await supabase.from("product_options").delete().eq("id", optionId)
    setMenuOptions((prev) => prev.filter((option) => option.id !== optionId))
    setMenuOptionItems((prev) =>
      prev.filter((item) => item.option_id !== optionId)
    )
  }

  const createOptionItem = async (optionId) => {
    const name = (newOptionItemNameByOption[optionId] || "").trim()
    const rawPrice = newOptionItemPriceByOption[optionId]
    const price = rawPrice ? Number.parseFloat(rawPrice) : 0
    if (!name || Number.isNaN(price)) return
    setError("")
    const { data, error: insertError } = await supabase
      .from("product_option_items")
      .insert({
        name,
        price,
        option_id: optionId,
      })
      .select()
      .single()
    if (insertError) {
      setError(insertError.message)
    } else {
      setMenuOptionItems((prev) => [...prev, data])
      setNewOptionItemNameByOption((prev) => ({ ...prev, [optionId]: "" }))
      setNewOptionItemPriceByOption((prev) => ({ ...prev, [optionId]: "" }))
    }
  }

  const deleteOptionItem = async (itemId) => {
    await supabase.from("product_option_items").delete().eq("id", itemId)
    setMenuOptionItems((prev) => prev.filter((item) => item.id !== itemId))
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
          <h1 className="text-3xl font-semibold text-white">
            Dashboard restaurant
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Vous devez etre connecte.
          </p>
          <a
            href="#/restaurant-signup"
            className="mt-6 rounded-2xl bg-emerald-400 py-3 text-center text-sm font-semibold uppercase tracking-widest text-slate-950"
          >
            Acceder
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-emerald-200/70">
              Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white">
              Commandes en temps reel
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Vue simple pour preparer rapidement les commandes.
            </p>
          </div>
          <a
            href="#/"
            className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-widest text-white/80 transition hover:border-white/40 hover:text-white"
          >
            Retour app
          </a>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-widest text-slate-400">
              Restaurant
            </span>
            {restaurant?.name ? (
              <span className="rounded-full border border-white/10 px-4 py-2 text-sm text-white">
                {restaurant.name}
              </span>
            ) : (
              <span className="text-sm text-slate-500">
                Aucun restaurant encore
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs uppercase tracking-widest text-slate-500">
              {orders.length} commandes
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-widest text-white/70 hover:border-white/40 hover:text-white"
            >
              Deconnexion
            </button>
          </div>
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
                
                // Créer d'abord le restaurant
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

                // Ensuite, ajouter les types de cuisine sélectionnés
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
              
              <div>
                <h2 className="lineskeats-brand text-xl font-semibold text-white">
                  Paramètres du restaurant
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Modifie les informations de ton restaurant.
                </p>
              </div>
            </div>

            {/* Section Paramètres du restaurant */}
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
                    // Mettre à jour les types de cuisine
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
                      value={newProductPrice}
                      onChange={(event) => setNewProductPrice(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-emerald-300/60 focus:outline-none"
                      placeholder="Prix (ex: 12.5)"
                    />
                    <select
                      value={newProductCategoryId}
                      onChange={(event) => setNewProductCategoryId(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-300/60 focus:outline-none"
                    >
                      <option value="">Categorie</option>
                      {menuCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <ImageUpload
                    currentImageUrl={newProductImageUrl}
                    onImageChange={setNewProductImageUrl}
                    productId="new"
                    className="mt-2"
                  />
                  <button
                    onClick={createProduct}
                    className="rounded-xl bg-emerald-400 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-950"
                  >
                    Ajouter le produit
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              {menuCategories.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-400">
                  Aucune catégorie pour le moment.
                </div>
              )}

              {menuCategories.map((category) => (
                <div
                  key={category.id}
                  className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-white">
                      {category.name}
                    </h3>
                    <button
                      onClick={() => deleteCategory(category.id)}
                      className="text-xs uppercase tracking-widest text-rose-300 hover:text-rose-200"
                    >
                      Supprimer
                    </button>
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-slate-300">
                    {(productsByCategory[category.id] || []).map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between rounded-xl border border-white/5 px-3 py-2"
                      >
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
                    ))}
                    {(!productsByCategory[category.id] ||
                      productsByCategory[category.id].length === 0) && (
                      <p className="text-xs text-slate-500">
                        Aucun produit.
                      </p>
                    )}

                    {(productsByCategory[category.id] || []).map((product) => (
                      <div
                        key={`options-${product.id}`}
                        className="mt-3 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-3"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs uppercase tracking-widest text-slate-400">
                            Options pour {product.name}
                          </p>
                        </div>
                        <div className="mt-2 flex gap-2">
                          <input
                            value={newOptionNameByProduct[product.id] || ""}
                            onChange={(event) =>
                              setNewOptionNameByProduct((prev) => ({
                                ...prev,
                                [product.id]: event.target.value,
                              }))
                            }
                            className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-emerald-300/60 focus:outline-none"
                            placeholder="Ex: Sans cornichon"
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
                              <div className="flex items-center justify-between">
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
                                  placeholder="Ex: Viande supplementaire"
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
                                  placeholder="+2.00"
                                />
                              </div>
                              <button
                                onClick={() => createOptionItem(option.id)}
                                className="mt-2 rounded-lg bg-emerald-400 px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-950"
                              >
                                Ajouter option
                              </button>
                              <div className="mt-2 space-y-1 text-xs text-slate-300">
                                {(optionItemsByOption[option.id] || []).map(
                                  (item) => (
                                    <div
                                      key={item.id}
                                      className="flex items-center justify-between rounded-lg border border-white/5 px-3 py-2"
                                    >
                                      <span>{item.name}</span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-emerald-200">
                                          {item.price ? `+${currency(item.price)}` : "gratuit"}
                                        </span>
                                        <button
                                          onClick={() => deleteOptionItem(item.id)}
                                          className="text-[10px] uppercase tracking-widest text-rose-300 hover:text-rose-200"
                                        >
                                          Supprimer
                                        </button>
                                      </div>
                                    </div>
                                  )
                                )}
                                {(!optionItemsByOption[option.id] ||
                                  optionItemsByOption[option.id].length === 0) && (
                                  <p className="text-xs text-slate-500">
                                    Aucune option.
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                          {(!optionsByProduct[product.id] ||
                            optionsByProduct[product.id].length === 0) && (
                            <p className="text-xs text-slate-500">
                              Aucune option pour ce produit.
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-8 text-sm text-slate-400">Chargement...</div>
        ) : (
          <div className="mt-8 grid gap-4">
            {orders.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-5 py-6 text-sm text-slate-400">
                Aucune commande pour le moment.
              </div>
            )}

            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-3xl border border-white/10 bg-slate-900/70 px-6 py-5 shadow-xl"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-400">
                      Client
                    </p>
                    <p className="mt-1 text-lg font-semibold text-white">
                      {order.customer_name || "Client"}
                    </p>
                    {order.customer_phone && (
                      <p className="text-sm text-slate-400">
                        {order.customer_phone}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-widest text-slate-400">
                      Total
                    </p>
                    <p className="mt-1 text-lg font-semibold text-emerald-200">
                      {currency(order.total)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm text-slate-200">
                  {(order.items || []).map((item, index) => (
                    <div key={`${order.id}-${index}`} className="flex justify-between">
                      <span>{item.name}</span>
                      <span className="text-slate-400">x{item.quantity}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-widest text-slate-400">
                    {order.status}
                  </span>
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
        )}
      </div>
    </div>
  )
}

function CustomerApp() {
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(null)
  const [cartItems, setCartItems] = useState([])
  const [cartRestaurantId, setCartRestaurantId] = useState(null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [checkoutError, setCheckoutError] = useState("")
  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError] = useState("")
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
        setDataError("Impossible de charger les restaurants pour le moment.")
      } else {
        setRestaurantsData(restaurantsRes.data ?? [])
        setCategoriesData(categoriesRes.data ?? [])
        setProductsData(productsRes.data ?? [])
        setOptionsData(optionsRes.data ?? [])
        setOptionItemsData(itemsRes.data ?? [])
      }
      setDataLoading(false)
    }

    loadData()
  }, [])

  const restaurantsList = restaurantsData
  const categoriesList = categoriesData
  const productsList = productsData

  const selectedRestaurant = useMemo(
    () =>
      restaurantsList.find(
        (restaurant) => restaurant.id === selectedRestaurantId
      ),
    [selectedRestaurantId, restaurantsList]
  )

  const restaurantCategories = useMemo(() => {
    if (!selectedRestaurantId) return []
    return categoriesList.filter(
      (category) => category.restaurant_id === selectedRestaurantId
    )
  }, [selectedRestaurantId, categoriesList])

  const productsByCategory = useMemo(() => {
    if (!selectedRestaurantId) return {}
    return restaurantCategories.reduce((acc, category) => {
      acc[category.id] = productsList.filter(
        (product) => product.category_id === category.id
      )
      return acc
    }, {})
  }, [restaurantCategories, selectedRestaurantId, productsList])

  const optionsByProduct = useMemo(() => {
    return optionsData.reduce((acc, option) => {
      acc[option.product_id] = acc[option.product_id] || []
      acc[option.product_id].push(option)
      return acc
    }, {})
  }, [optionsData])

  const optionItemsByOption = useMemo(() => {
    return optionItemsData.reduce((acc, item) => {
      acc[item.option_id] = acc[item.option_id] || []
      acc[item.option_id].push(item)
      return acc
    }, {})
  }, [optionItemsData])

  const addToCart = (product) => {
    if (
      cartRestaurantId &&
      selectedRestaurantId &&
      cartRestaurantId !== selectedRestaurantId
    ) {
      setCheckoutError(
        "Ton panier contient deja un autre restaurant. Vide-le pour changer."
      )
      setIsCartOpen(true)
      return
    }
    if (!cartRestaurantId && selectedRestaurantId) {
      setCartRestaurantId(selectedRestaurantId)
    }
    const selectedOptionItems =
      selectedOptionItemsByProduct[product.id] || []
    const optionItemsTotal = selectedOptionItems.reduce(
      (sum, item) => sum + (item.price || 0),
      0
    )
    const cartKey =
      `${product.id}-` +
      selectedOptionItems
        .map((item) => item.id)
        .sort((a, b) => a - b)
        .join(",")

    setCartItems((prev) => {
      const existing = prev.find((item) => item.cartKey === cartKey)
      if (existing) {
        return prev.map((item) =>
          item.cartKey === cartKey
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [
        ...prev,
        {
          ...product,
          cartKey,
          basePrice: product.price,
          optionItems: selectedOptionItems,
          optionItemsTotal,
          quantity: 1,
        },
      ]
    })
    setSelectedOptionItemsByProduct((prev) => ({
      ...prev,
      [product.id]: [],
    }))
    setIsCartOpen(true)
  }

  const updateQuantity = (cartKey, delta) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.cartKey === cartKey
            ? { ...item, quantity: Math.max(1, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    )
  }

  const removeFromCart = (cartKey) => {
    setCartItems((prev) => prev.filter((item) => item.cartKey !== cartKey))
  }

  const clearCart = () => {
    setCartItems([])
    setCartRestaurantId(null)
  }

  const startCheckout = async () => {
    setCheckoutError("")
    if (!customerName.trim() || !customerPhone.trim()) {
      setCheckoutError("Merci de renseigner ton nom et ton telephone.")
      return
    }
    if (cartItems.length === 0) {
      setCheckoutError("Ajoute au moins un produit.")
      return
    }

    try {
      setIsCheckingOut(true)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin

      const response = await fetch(
        `${supabaseUrl}/functions/v1/create-checkout-session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${anonKey}`,
            apikey: anonKey,
          },
          body: JSON.stringify({
            restaurant_id: cartRestaurantId ?? selectedRestaurantId,
            items: cartItems.map((item) => ({
              id: item.id,
              name: item.name,
              price: (item.basePrice ?? item.price) + (item.optionItemsTotal ?? 0),
              quantity: item.quantity,
              options: item.optionItems || [],
            })),
            customer: {
              name: customerName.trim(),
              phone: customerPhone.trim(),
            },
            success_url: `${siteUrl}/?success=true`,
            cancel_url: `${siteUrl}/?canceled=true`,
          }),
        }
      )

      const raw = await response.text()
      const data = raw ? JSON.parse(raw) : {}
      if (!response.ok) {
        throw new Error(data.error || `Paiement impossible (${response.status}).`)
      }
      if (!data.url) {
        throw new Error("Lien de paiement manquant.")
      }

      window.location.href = data.url
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Paiement impossible."
      setCheckoutError(message)
    } finally {
      setIsCheckingOut(false)
    }
  }

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const cartTotal = cartItems.reduce((sum, item) => {
    const unitTotal = (item.basePrice ?? item.price) + (item.optionItemsTotal ?? 0)
    return sum + unitTotal * item.quantity
  }, 0)

  const restaurantSignupLink = selectedRestaurantId
    ? `#/restaurant-signup?restaurant=${selectedRestaurantId}`
    : "#/restaurant-signup"

  return (
    <div className="min-h-screen bg-slate-950 pb-28 text-slate-100">
      <div className="relative overflow-hidden">
        <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute left-0 top-40 h-80 w-80 rounded-full bg-orange-400/20 blur-3xl" />
        <header className="relative z-10 px-4 pt-8 pb-6">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-emerald-200/70">
                LineSkeats
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
                {selectedRestaurant ? "Menu" : "Choisis ton restaurant"}
              </h1>
              <p className="mt-2 max-w-md text-sm text-slate-300 sm:text-base">
                {selectedRestaurant?.description ||
                  "Des adresses locales, des plats frais et une experience mobile fluide."}
              </p>
            </div>
            {selectedRestaurant && (
              <button
                onClick={() => setSelectedRestaurantId(null)}
                className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-widest text-white/80 transition hover:border-white/40 hover:text-white"
              >
                Retour
              </button>
            )}
          </div>
          <div className="mx-auto mt-3 flex w-full max-w-5xl justify-end">
            <a
              href={restaurantSignupLink}
              className="text-xs uppercase tracking-widest text-emerald-200/70 hover:text-emerald-200"
            >
              Espace restaurant
            </a>
          </div>
        </header>
      </div>

      <main className="px-4 pb-16">
        <div className="mx-auto w-full max-w-5xl">
          {dataError && (
            <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {dataError}
            </div>
          )}

          {dataLoading && (
            <div className="mb-6 text-sm text-slate-400">
              Chargement des restaurants...
            </div>
          )}

          {!selectedRestaurant && (
            <div className="space-y-6">
              {/* Carte interactive */}
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">
                  Restaurants près de vous
                </h2>
                <RestaurantMap
                  restaurants={restaurantsList.filter(r => r.is_active !== false)}
                  onRestaurantSelect={(restaurant) => setSelectedRestaurantId(restaurant.id)}
                />
              </div>

              {/* Liste des restaurants */}
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
                          <h2 className="text-xl font-semibold text-white">
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
                  <span className="rounded-full border border-white/20 px-3 py-1">
                    20-30 min
                  </span>
                </div>
              </div>

              <div className="space-y-6">
                {restaurantCategories.map((category) => (
                  <section key={category.id} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold text-white">
                        {category.name}
                      </h3>
                      <span className="text-xs uppercase tracking-widest text-emerald-200/70">
                        {productsByCategory[category.id]?.length || 0} items
                      </span>
                    </div>
                    <div className="grid gap-3">
                      {productsByCategory[category.id]?.map((product) => (
                        <div
                          key={product.id}
                          className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/60 px-5 py-4"
                        >
                          <div className="flex gap-4">
                            {product.image_url && (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-20 h-20 object-cover rounded-xl"
                              />
                            )}
                            <div className="flex-1">
                              <p className="text-base font-medium text-white">
                                {product.name}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                Sauce signature, ingredients frais
                              </p>
                            </div>
                          </div>
                          {(optionsByProduct[product.id] || []).length > 0 && (
                            <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
                              {(optionsByProduct[product.id] || []).map(
                                (option) => (
                                  <div key={option.id} className="space-y-2">
                                    <p className="text-xs uppercase tracking-widest text-slate-400">
                                      {option.name}
                                    </p>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                      {(optionItemsByOption[option.id] || []).map(
                                        (item) => {
                                          const selected =
                                            selectedOptionItemsByProduct[
                                              product.id
                                            ]?.some(
                                              (selectedItem) =>
                                                selectedItem.id === item.id
                                            ) || false
                                          return (
                                            <label
                                              key={item.id}
                                              className={`flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2 text-xs transition ${
                                                selected
                                                  ? "border-emerald-300/60 bg-emerald-300/10 text-emerald-100"
                                                  : "border-white/10 bg-slate-950/40 text-slate-300"
                                              }`}
                                            >
                                              <span>{item.name}</span>
                                              <span className="text-emerald-200">
                                                {item.price
                                                  ? `+${currency(item.price)}`
                                                  : "gratuit"}
                                              </span>
                                              <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={selected}
                                                onChange={() => {
                                                  setSelectedOptionItemsByProduct(
                                                    (prev) => {
                                                      const current =
                                                        prev[product.id] || []
                                                      const exists = current.some(
                                                        (c) => c.id === item.id
                                                      )
                                                      return {
                                                        ...prev,
                                                        [product.id]: exists
                                                          ? current.filter(
                                                              (c) =>
                                                                c.id !== item.id
                                                            )
                                                          : [...current, item],
                                                      }
                                                    }
                                                  )
                                                }}
                                              />
                                            </label>
                                          )
                                        }
                                      )}
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-3 sm:justify-end">
                            <span className="text-sm font-semibold text-emerald-200">
                              {currency(product.price)}
                            </span>
                            <button
                              onClick={() => addToCart(product)}
                              className="rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-950 transition hover:bg-emerald-300"
                            >
                              Ajouter au panier
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-4">
        <div className="mx-auto w-full max-w-5xl">
          <button
            onClick={() => setIsCartOpen((prev) => !prev)}
            className="glass flex w-full items-center justify-between rounded-2xl border border-white/10 px-4 py-3 text-left shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400 text-sm font-semibold text-slate-950">
                {cartCount}
              </span>
              <div>
                <p className="text-sm font-semibold text-white">Panier</p>
                <p className="text-xs text-slate-400">
                  {cartCount > 0 ? "Voir les articles" : "Aucun article"}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-emerald-200">
                {currency(cartTotal)}
              </p>
              <p className="text-xs text-slate-400">Total</p>
            </div>
          </button>

          {isCartOpen && (
            <div className="mt-3 rounded-3xl border border-white/10 bg-slate-900/90 p-5 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Ton panier</h3>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="text-xs uppercase tracking-widest text-slate-400 hover:text-white"
                >
                  Fermer
                </button>
              </div>

              {cartItems.length === 0 && (
                <p className="text-sm text-slate-400">
                  Ajoute des plats pour commencer.
                </p>
              )}

              {cartItems.length > 0 && (
                <div className="space-y-3">
                  {cartItems.map((item) => (
                    <div
                      key={item.cartKey}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">
                          {item.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {currency((item.basePrice ?? item.price) + (item.optionItemsTotal ?? 0))}{" "}
                          x {item.quantity}
                        </p>
                        {(item.optionItems || []).length > 0 && (
                          <div className="mt-1 text-[11px] text-slate-500">
                            {(item.optionItems || [])
                              .map((opt) => opt.name)
                              .join(", ")}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.cartKey, -1)}
                          className="h-8 w-8 rounded-full border border-white/10 text-sm text-white hover:border-white/30"
                        >
                          -
                        </button>
                        <span className="w-6 text-center text-sm">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.cartKey, 1)}
                          className="h-8 w-8 rounded-full border border-white/10 text-sm text-white hover:border-white/30"
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeFromCart(item.cartKey)}
                          className="ml-2 text-xs uppercase tracking-widest text-rose-300 hover:text-rose-200"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t border-white/10 pt-4 text-sm">
                    <span className="text-slate-400">Total</span>
                    <span className="font-semibold text-emerald-200">
                      {currency(cartTotal)}
                    </span>
                  </div>
                  <div className="space-y-3 border-t border-white/10 pt-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-xs uppercase tracking-widest text-slate-400">
                        Nom
                        <input
                          value={customerName}
                          onChange={(event) => setCustomerName(event.target.value)}
                          className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-300/50 focus:outline-none"
                          placeholder="Alex Martin"
                        />
                      </label>
                      <label className="text-xs uppercase tracking-widest text-slate-400">
                        Telephone
                        <input
                          value={customerPhone}
                          onChange={(event) => setCustomerPhone(event.target.value)}
                          className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-300/50 focus:outline-none"
                          placeholder="+32 470 00 00 00"
                        />
                      </label>
                    </div>

                    {checkoutError && (
                      <p className="text-xs text-rose-300">{checkoutError}</p>
                    )}

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        onClick={startCheckout}
                        disabled={isCheckingOut}
                        className="rounded-full bg-emerald-400 px-5 py-3 text-xs font-semibold uppercase tracking-widest text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isCheckingOut ? "Redirection..." : "Commander"}
                      </button>
                      <button
                        onClick={clearCart}
                        className="text-xs uppercase tracking-widest text-slate-500 hover:text-white"
                      >
                        Vider le panier
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function App() {
  const [route, setRoute] = useState(getHashRoute().path)

  useEffect(() => {
    const onHashChange = () => setRoute(getHashRoute().path)
    window.addEventListener("hashchange", onHashChange)
    return () => window.removeEventListener("hashchange", onHashChange)
  }, [])

  if (route.startsWith("/restaurant-signup")) {
    return <RestaurantSignup />
  }

  if (route.startsWith("/dashboard")) {
    return <Dashboard />
  }

  return <CustomerApp />
}

export default App
