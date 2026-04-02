import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabaseClient"
import RestaurantMap from "./RestaurantMap"

const currency = (value) =>
  new Intl.NumberFormat("fr-BE", {
    style: "currency",
    currency: "EUR",
  }).format(value)

export default function ClientInterface() {
  const [loading, setLoading] = useState(true)
  const [dataError, setDataError] = useState("")
  const [restaurantsData, setRestaurantsData] = useState([])
  const [categoriesData, setCategoriesData] = useState([])
  const [productsData, setProductsData] = useState([])
  const [optionsData, setOptionsData] = useState([])
  const [itemsData, setItemsData] = useState([])
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(null)
  const [cartItems, setCartItems] = useState({})
  const [selectedOptionItemsByProduct, setSelectedOptionItemsByProduct] = useState({})

  useEffect(() => {
    const loadData = async () => {
      setDataError("")
      setLoading(true)
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
        setDataError("Erreur lors du chargement des données")
      } else {
        setRestaurantsData(restaurantsRes.data || [])
        setCategoriesData(categoriesRes.data || [])
        setProductsData(productsRes.data || [])
        setOptionsData(optionsRes.data || [])
        setItemsData(itemsRes.data || [])
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const productsByCategory = useMemo(() => {
    if (!selectedRestaurantId) return {}
    const restaurantCategories = categoriesData.filter(
      (category) => category.restaurant_id === selectedRestaurantId
    )
    return restaurantCategories.reduce((acc, category) => {
      acc[category.id] = productsData.filter(
        (product) => product.category_id === category.id
      )
      return acc
    }, {})
  }, [categoriesData, selectedRestaurantId, productsData])

  const productsList = productsData
  const restaurantsList = restaurantsData.filter(r => r.is_active !== false)
  const selectedRestaurant = restaurantsList.find(r => r.id === selectedRestaurantId)
  const restaurantCategories = categoriesData.filter(
    (category) => category.restaurant_id === selectedRestaurantId
  )

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
      const product = productsList.find((p) => p.id === parseInt(productId))
      if (product) {
        items.forEach((item) => {
          total += product.price
          if (item.option_item_id) {
            const optionItem = itemsData.find((oi) => oi.id === item.option_item_id)
            if (optionItem) total += optionItem.price
          }
        })
      }
    })
    return total
  }

  const checkout = async () => {
    if (!selectedRestaurant) return

    const { error } = await supabase.from("orders").insert({
      restaurant_id: selectedRestaurant,
      items: cartItems,
      total: getCartTotal(),
    })

    if (error) {
      setDataError(error.message)
    } else {
      setCartItems({})
      alert("Commande passée avec succès!")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-lg">Chargement...</div>
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
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="lineskeats-brand text-3xl font-bold text-white">
            Lineskeats
          </h1>
          <p className="mt-2 text-slate-300">
            Des restaurants près de vous, des plats frais et une experience mobile fluide.
          </p>
        </div>

        {!selectedRestaurant && (
          <div className="space-y-6">
            {/* Carte interactive */}
            <div className="space-y-4">
              <h2 className="lineskeats-menu text-xl font-semibold text-white">
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
                Tous les restaurants
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
                <span>★</span>
                <span>(200+)</span>
                <span>€€€</span>
              </div>
            </div>

            {/* Menu du restaurant */}
            <div className="space-y-6">
              {restaurantCategories.map((category) => (
                <section key={category.id} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="lineskeats-menu text-xl font-semibold text-white">
                      {category.name}
                    </h3>
                    <span className="text-xs uppercase tracking-widest text-emerald-200/70">
                      {productsByCategory[category.id]?.length || 0} articles
                    </span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {productsByCategory[category.id]?.map((product) => (
                      <div
                        key={product.id}
                        className="group rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300/40 hover:bg-slate-900"
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
                              onClick={() => addToCart(product.id, [])}
                              className="rounded-lg bg-emerald-400 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-950 hover:bg-emerald-500"
                            >
                              Ajouter
                            </button>
                          </div>
                        </div>
                        <p className="mt-3 text-sm text-slate-300">
                          {product.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}

        {/* Panier */}
        {selectedRestaurant && Object.keys(cartItems).length > 0 && (
          <div className="fixed bottom-4 right-4 w-full max-w-sm">
            <div className="glass rounded-2xl border border-white/10 bg-slate-900/90 p-4 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="lineskeats-menu text-lg font-semibold text-white">
                  Votre commande
                </h3>
                <button
                  onClick={() => setCartItems({})}
                  className="text-xs uppercase tracking-widest text-rose-300 hover:text-rose-200"
                >
                  Vider
                </button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {Object.entries(cartItems).map(([productId, items]) => {
                  const product = productsList.find((p) => p.id === parseInt(productId))
                  return (
                    <div key={productId} className="flex items-center justify-between rounded-lg bg-slate-950/40 p-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">
                          {product?.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {currency(product?.price)} × {items.length}
                        </p>
                      </div>
                      <button
                        onClick={() => removeFromCart(productId, items.length - 1)}
                        className="text-xs text-rose-300 hover:text-rose-200"
                      >
                        Supprimer
                      </button>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-white">
                    Total: {currency(getCartTotal())}
                  </span>
                  <button
                    onClick={checkout}
                    className="rounded-full bg-emerald-400 px-6 py-3 text-sm font-semibold uppercase tracking-widest text-slate-950 hover:bg-emerald-500"
                  >
                    Commander
                  </button>
                </div>
              </div>
            </div>
          )}

        {!selectedRestaurant &&
          !loading &&
          restaurantsList.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-5 py-6 text-sm text-slate-400">
              Aucun restaurant disponible pour le moment.
            </div>
          )}
      </div>
    </div>
  )
}
