import { useEffect, useMemo, useRef, useState } from "react"
import RestaurantMap from "./RestaurantMap"
import { useCallback } from "react"
import { supabase } from "../lib/supabaseClient"
import { getDisplayCuisineLabel } from "../lib/cuisineLabels"
import BrandLogo from "./BrandLogo"

const fallbackImage =
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80"
const CLIENT_PAYMENT_ENABLED = false

const currency = (value) =>
  new Intl.NumberFormat("fr-BE", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value) || 0)

const formatCoordinateAddress = (latitude, longitude) => {
  if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
    return "Adresse indisponible"
  }

  return `${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`
}

const getSelectedRestaurantIdFromUrl = () => {
  const query = new URLSearchParams(window.location.search || "")
  const rawId = query.get("restaurant")

  if (!rawId) return null

  const parsed = Number.parseInt(rawId, 10)
  return Number.isNaN(parsed) ? null : parsed
}

const navigateToClient = (restaurantId = null) => {
  const targetUrl = restaurantId ? `/?restaurant=${restaurantId}` : "/"
  window.history.pushState({}, "", targetUrl)
  window.dispatchEvent(new PopStateEvent("popstate"))
}

const getDisplayOptionName = (optionName) => {
  const normalizedName = String(optionName || "").trim().toLowerCase()

  if (normalizedName === "supplement" || normalizedName === "supplements") {
    return "Options supplementaires"
  }

  return optionName
}

const mapPublicRestaurantRow = (row) => ({
  id: row.restaurant_id,
  name: row.name,
  description: row.description,
  image: row.image,
  address: row.address,
  latitude: row.latitude,
  longitude: row.longitude,
  wait_time_minutes: row.wait_time_minutes,
  is_active: row.is_active,
  accepts_online_payment: row.accepts_online_payment,
})

const sortRestaurantsByNewest = (a, b) => Number(b.id) - Number(a.id)

const normalizeSearchValue = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const radius = 6371
  const deltaLat = ((lat2 - lat1) * Math.PI) / 180
  const deltaLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2)

  return radius * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

const estimateTravelMinutes = (distanceKm) => {
  if (!Number.isFinite(distanceKm)) return null

  if (distanceKm <= 0.25) {
    return 3
  }

  return Math.max(4, Math.round(distanceKm * 12))
}

const formatReadyLabel = (minutes, isSynchronized = false) =>
  `${isSynchronized ? "Retrait" : "Pret"} dans ${minutes} min`

const formatClockFromNow = (minutesFromNow) => {
  const date = new Date(Date.now() + minutesFromNow * 60 * 1000)
  return date.toLocaleTimeString("fr-BE", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

const formatClockFromDate = (date) =>
  date.toLocaleTimeString("fr-BE", {
    hour: "2-digit",
    minute: "2-digit",
  })

const roundDateUpToFiveMinutes = (date) => {
  const nextDate = new Date(date)
  nextDate.setSeconds(0, 0)

  const minutes = nextDate.getMinutes()
  const remainder = minutes % 5

  if (remainder !== 0) {
    nextDate.setMinutes(minutes + (5 - remainder))
  }

  return nextDate
}

const formatDateTimeLocalValue = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

const getMinutesUntilDate = (date) =>
  Math.max(0, Math.ceil((date.getTime() - Date.now()) / 60000))

const getPickupScore = ({ syncPickupMinutes, travelMinutes }) => {
  if (syncPickupMinutes <= 15 && (travelMinutes ?? 99) <= 8) {
    return {
      label: "Top retrait",
      tone: "emerald",
      detail: "Synchronisation tres rapide",
    }
  }

  if (syncPickupMinutes <= 20) {
    return {
      label: "Rapide",
      tone: "amber",
      detail: "Retrait bien cadence",
    }
  }

  return {
    label: "Cadence live",
    tone: "rose",
    detail: "Bon choix si tu anticipes",
  }
}

const getPickupRankingValue = ({ waitTime, travelMinutes, distanceKm }) => {
  if (travelMinutes === null) {
    return waitTime
  }

  let rankingValue = Math.max(waitTime, travelMinutes)

  if (travelMinutes > 12) {
    rankingValue += (travelMinutes - 12) * 4
  }

  if (travelMinutes > 20) {
    rankingValue += 60 + (travelMinutes - 20) * 8
  }

  if (distanceKm > 2.5) {
    rankingValue += 90
  }

  return rankingValue
}

const isMissingPublicRestaurantLiveError = (error) => {
  const message = String(error?.message || "").toLowerCase()
  return (
    message.includes("public_restaurant_live") &&
    (message.includes("could not find the table") || message.includes("does not exist"))
  )
}

export default function ClientInterface() {
  const [restaurants, setRestaurants] = useState([])
  const [resolvedAddresses, setResolvedAddresses] = useState({})
  const [cuisineTypes, setCuisineTypes] = useState([])
  const [restaurantCuisineTypes, setRestaurantCuisineTypes] = useState([])
  const [selectedCuisineIds, setSelectedCuisineIds] = useState([])
  const [restaurantSearchQuery, setRestaurantSearchQuery] = useState("")
  const [activeMapRestaurant, setActiveMapRestaurant] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [isRestaurantListVisible, setIsRestaurantListVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(() =>
    getSelectedRestaurantIdFromUrl()
  )
  const [menuCategories, setMenuCategories] = useState([])
  const [menuProducts, setMenuProducts] = useState([])
  const [menuOptions, setMenuOptions] = useState([])
  const [menuOptionItems, setMenuOptionItems] = useState([])
  const [isMenuLoading, setIsMenuLoading] = useState(false)
  const [menuError, setMenuError] = useState("")
  const [cartItems, setCartItems] = useState([])
  const [selectedOptionItemsByProduct, setSelectedOptionItemsByProduct] = useState({})
  const [productCommentsByProduct, setProductCommentsByProduct] = useState({})
  const [checkoutForm, setCheckoutForm] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    scheduledArrivalAt: "",
  })
  const [checkoutError, setCheckoutError] = useState("")
  const [checkoutSuccess, setCheckoutSuccess] = useState("")
  const [checkoutSuccessOrderId, setCheckoutSuccessOrderId] = useState(null)
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false)
  const restaurantListRef = useRef(null)
  const supportsPublicRestaurantLiveRef = useRef(true)
  const previousScheduledRestaurantIdRef = useRef(null)

  const loadRestaurants = useCallback(async ({ showLoader = true } = {}) => {
    if (showLoader) {
      setIsLoading(true)
    }

    setError("")

    const [cuisineTypesRes, restaurantCuisineRes] = await Promise.all([
      supabase.from("cuisine_types").select("id, name, icon, color").order("name"),
      supabase
        .from("restaurant_cuisine_types")
        .select("restaurant_id, cuisine_type_id"),
    ])

    let restaurantsRes = supportsPublicRestaurantLiveRef.current
      ? await supabase
          .from("public_restaurant_live")
          .select(
            "restaurant_id, name, description, image, address, latitude, longitude, wait_time_minutes, is_active, accepts_online_payment"
          )
          .eq("is_active", true)
          .order("restaurant_id", { ascending: false })
      : await supabase.rpc("get_public_restaurants")

    if (restaurantsRes.error && isMissingPublicRestaurantLiveError(restaurantsRes.error)) {
      supportsPublicRestaurantLiveRef.current = false
      restaurantsRes = await supabase.rpc("get_public_restaurants")
    }

    if (restaurantsRes.error) {
      setError(restaurantsRes.error.message)
      setRestaurants([])
    } else {
      setRestaurants(
        supportsPublicRestaurantLiveRef.current
          ? (restaurantsRes.data || []).map(mapPublicRestaurantRow)
          : restaurantsRes.data || []
      )
    }

    if (cuisineTypesRes.error) {
      setCuisineTypes([])
    } else {
      setCuisineTypes(cuisineTypesRes.data || [])
    }

    if (restaurantCuisineRes.error) {
      setRestaurantCuisineTypes([])
    } else {
      setRestaurantCuisineTypes(restaurantCuisineRes.data || [])
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    loadRestaurants()

    const refreshVisibleData = () => {
      if (document.visibilityState === "visible") {
        loadRestaurants({ showLoader: false })
      }
    }

    document.addEventListener("visibilitychange", refreshVisibleData)

    return () => {
      document.removeEventListener("visibilitychange", refreshVisibleData)
    }
  }, [loadRestaurants])

  useEffect(() => {
    if (!supportsPublicRestaurantLiveRef.current) return undefined

    const channel = supabase
      .channel("public-restaurant-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "public_restaurant_live",
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const deletedRestaurantId = payload.old?.restaurant_id
            if (!deletedRestaurantId) return

            setRestaurants((prev) =>
              prev.filter((restaurant) => Number(restaurant.id) !== Number(deletedRestaurantId))
            )
            return
          }

          const nextRow = payload.new
          if (!nextRow?.restaurant_id) return

          setRestaurants((prev) => {
            const withoutCurrentRestaurant = prev.filter(
              (restaurant) => Number(restaurant.id) !== Number(nextRow.restaurant_id)
            )

            if (!nextRow.is_active) {
              return withoutCurrentRestaurant.sort(sortRestaurantsByNewest)
            }

            return [...withoutCurrentRestaurant, mapPublicRestaurantRow(nextRow)].sort(
              sortRestaurantsByNewest
            )
          })
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          loadRestaurants({ showLoader: false })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadRestaurants])

  useEffect(() => {
    const handleRouteChange = () => {
      setSelectedRestaurantId(getSelectedRestaurantIdFromUrl())
    }

    window.addEventListener("popstate", handleRouteChange)
    window.addEventListener("hashchange", handleRouteChange)
    return () => {
      window.removeEventListener("popstate", handleRouteChange)
      window.removeEventListener("hashchange", handleRouteChange)
    }
  }, [])

  useEffect(() => {
    setCartItems([])
    setSelectedOptionItemsByProduct({})
    setProductCommentsByProduct({})
    setActiveMapRestaurant(null)
    setIsRestaurantListVisible(false)
    setCheckoutError("")
    setCheckoutSuccess("")
    setCheckoutSuccessOrderId(null)
    setCheckoutForm({
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      scheduledArrivalAt: "",
    })
    previousScheduledRestaurantIdRef.current = null
  }, [selectedRestaurantId])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search || "")
    const checkoutState = params.get("checkout")
    const restaurantId = params.get("restaurant")

    if (!checkoutState) return

    if (checkoutState === "success") {
      setCheckoutSuccess("Paiement confirme. Le restaurant prepare maintenant la commande.")
      setCheckoutSuccessOrderId(null)
      setCheckoutError("")
    }

    if (checkoutState === "cancel") {
      setCheckoutError("Paiement annule. Tu peux reprendre le panier quand tu veux.")
      setCheckoutSuccess("")
      setCheckoutSuccessOrderId(null)
    }

    const nextUrl = restaurantId ? `/?restaurant=${restaurantId}` : "/"
    window.history.replaceState({}, "", nextUrl)
  }, [])

  useEffect(() => {
    let isCancelled = false

    const restaurantsNeedingAddress = restaurants.filter(
      (restaurant) =>
        !restaurant.address &&
        Number.isFinite(Number(restaurant.latitude)) &&
        Number.isFinite(Number(restaurant.longitude)) &&
        !resolvedAddresses[restaurant.id]
    )

    if (restaurantsNeedingAddress.length === 0) return undefined

    const loadMissingAddresses = async () => {
      const results = await Promise.all(
        restaurantsNeedingAddress.map(async (restaurant) => {
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${restaurant.latitude}&lon=${restaurant.longitude}&zoom=18&addressdetails=1`
            )

            if (!response.ok) {
              throw new Error("reverse geocode failed")
            }

            const data = await response.json()
            return [
              restaurant.id,
              data.display_name ||
                formatCoordinateAddress(restaurant.latitude, restaurant.longitude),
            ]
          } catch {
            return [
              restaurant.id,
              formatCoordinateAddress(restaurant.latitude, restaurant.longitude),
            ]
          }
        })
      )

      if (isCancelled) return

      setResolvedAddresses((prev) => ({
        ...prev,
        ...Object.fromEntries(results),
      }))
    }

    loadMissingAddresses()

    return () => {
      isCancelled = true
    }
  }, [resolvedAddresses, restaurants])

  useEffect(() => {
    if (!isRestaurantListVisible) return

    restaurantListRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
  }, [isRestaurantListVisible])

  useEffect(() => {
    if (!activeMapRestaurant) return

    const matchingRestaurant = filteredRestaurants.find(
      (restaurant) => restaurant.id === activeMapRestaurant.id
    )

    if (!matchingRestaurant) {
      setActiveMapRestaurant(null)
      return
    }

    if (matchingRestaurant !== activeMapRestaurant) {
      setActiveMapRestaurant(matchingRestaurant)
    }
  }, [activeMapRestaurant, filteredRestaurants])

  useEffect(() => {
    if (selectedRestaurantId || typeof window === "undefined" || window.innerWidth >= 640) {
      return undefined
    }

    const shouldLockBody = isRestaurantListVisible || Boolean(activeMapRestaurant)
    if (!shouldLockBody) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [activeMapRestaurant, isRestaurantListVisible, selectedRestaurantId])

  useEffect(() => {
    let isMounted = true

    const loadMenu = async () => {
      if (!selectedRestaurantId) {
        setMenuCategories([])
        setMenuProducts([])
        setMenuOptions([])
        setMenuOptionItems([])
        setMenuError("")
        return
      }

      setIsMenuLoading(true)
      setMenuError("")

      const categoriesRes = await supabase
        .from("categories")
        .select("id, restaurant_id, name")
        .eq("restaurant_id", selectedRestaurantId)
        .order("name")

      if (!isMounted) return

      if (categoriesRes.error) {
        setMenuError(categoriesRes.error.message)
        setMenuCategories([])
        setMenuProducts([])
        setMenuOptions([])
        setMenuOptionItems([])
        setIsMenuLoading(false)
        return
      }

      const categories = categoriesRes.data || []
      const categoryIds = categories.map((category) => category.id)

      const productsRes =
        categoryIds.length === 0
          ? { data: [], error: null }
          : await supabase
              .from("products")
              .select("id, category_id, name, price, image_url")
              .in("category_id", categoryIds)
              .order("name")

      if (!isMounted) return

      const products = productsRes.error ? [] : productsRes.data || []
      const productIds = products.map((product) => product.id)

      const optionsRes =
        productIds.length === 0
          ? { data: [], error: null }
          : await supabase
              .from("product_options")
              .select("id, product_id, name, required")
              .in("product_id", productIds)
              .order("name")

      if (!isMounted) return

      const options = optionsRes.error ? [] : optionsRes.data || []
      const optionIds = options.map((option) => option.id)

      const optionItemsRes =
        optionIds.length === 0
          ? { data: [], error: null }
          : await supabase
              .from("product_option_items")
              .select("id, option_id, name, price")
              .in("option_id", optionIds)
              .order("name")

      if (!isMounted) return

      setMenuCategories(categories)
      setMenuProducts(products)
      setMenuOptions(options)
      setMenuOptionItems(optionItemsRes.error ? [] : optionItemsRes.data || [])
      setIsMenuLoading(false)
    }

    loadMenu()

    return () => {
      isMounted = false
    }
  }, [selectedRestaurantId])

  const cuisineTypeById = cuisineTypes.reduce((acc, cuisine) => {
    acc[cuisine.id] = cuisine
    return acc
  }, {})

  const cuisineIdsByRestaurant = restaurantCuisineTypes.reduce((acc, relation) => {
    if (!acc[relation.restaurant_id]) acc[relation.restaurant_id] = []
    acc[relation.restaurant_id].push(relation.cuisine_type_id)
    return acc
  }, {})

  const enrichedRestaurants = useMemo(
    () =>
      restaurants
        .map((restaurant) => {
          const latitude = Number(restaurant.latitude)
          const longitude = Number(restaurant.longitude)
          const hasCoordinates =
            Number.isFinite(latitude) && Number.isFinite(longitude)
          const distanceKm =
            userLocation && hasCoordinates
              ? calculateDistance(userLocation.lat, userLocation.lng, latitude, longitude)
              : null
          const travelMinutes = estimateTravelMinutes(distanceKm)
          const waitTime = Number(restaurant.wait_time_minutes) || 15
          const syncPickupMinutes =
            travelMinutes === null ? waitTime : Math.max(waitTime, travelMinutes)
          const leaveInMinutes =
            travelMinutes === null ? null : Math.max(syncPickupMinutes - travelMinutes, 0)
          const pickupScore = getPickupScore({
            syncPickupMinutes,
            travelMinutes,
          })
          const pickupRankingValue = getPickupRankingValue({
            waitTime,
            travelMinutes,
            distanceKm,
          })

          return {
            ...restaurant,
            distanceKm,
            travelMinutes,
            waitTime,
            syncPickupMinutes,
            leaveInMinutes,
            prepReadyAtLabel: formatClockFromNow(waitTime),
            readyAtLabel: formatClockFromNow(syncPickupMinutes),
            pickupAtLabel: formatClockFromNow(syncPickupMinutes),
            readyLabel: formatReadyLabel(syncPickupMinutes, travelMinutes !== null),
            pickupScore,
            pickupRankingValue,
          }
        })
        .sort((firstRestaurant, secondRestaurant) => {
          const firstScore = userLocation
            ? firstRestaurant.pickupRankingValue
            : firstRestaurant.waitTime
          const secondScore = userLocation
            ? secondRestaurant.pickupRankingValue
            : secondRestaurant.waitTime

          if (firstScore !== secondScore) {
            return firstScore - secondScore
          }

          return sortRestaurantsByNewest(firstRestaurant, secondRestaurant)
        }),
    [restaurants, userLocation]
  )

  const filteredRestaurants = useMemo(() => {
    const normalizedSearchQuery = normalizeSearchValue(restaurantSearchQuery)

    return enrichedRestaurants.filter((restaurant) => {
      const matchesCuisine =
        selectedCuisineIds.length === 0 ||
        (cuisineIdsByRestaurant[restaurant.id] || []).some((cuisineId) =>
          selectedCuisineIds.includes(cuisineId)
        )

      if (!matchesCuisine) {
        return false
      }

      if (!normalizedSearchQuery) {
        return true
      }

      const searchableText = normalizeSearchValue(
        [restaurant.name, restaurant.address, resolvedAddresses[restaurant.id]]
          .filter(Boolean)
          .join(" ")
      )

      return searchableText.includes(normalizedSearchQuery)
    })
  }, [
    cuisineIdsByRestaurant,
    enrichedRestaurants,
    resolvedAddresses,
    restaurantSearchQuery,
    selectedCuisineIds,
  ])

  const selectedRestaurant =
    enrichedRestaurants.find((restaurant) => restaurant.id === selectedRestaurantId) || null

  const pickupScheduling = useMemo(() => {
    if (!selectedRestaurant) return null

    const minimumArrivalDate = roundDateUpToFiveMinutes(
      new Date(Date.now() + selectedRestaurant.waitTime * 60 * 1000)
    )
    const suggestedArrivalDate = roundDateUpToFiveMinutes(
      new Date(Date.now() + selectedRestaurant.syncPickupMinutes * 60 * 1000)
    )

    return {
      minimumArrivalDate,
      suggestedArrivalDate,
      minimumValue: formatDateTimeLocalValue(minimumArrivalDate),
      suggestedValue: formatDateTimeLocalValue(suggestedArrivalDate),
      minimumLabel: formatClockFromDate(minimumArrivalDate),
      suggestedLabel: formatClockFromDate(suggestedArrivalDate),
    }
  }, [selectedRestaurant])

  const scheduledArrivalDetails = useMemo(() => {
    if (!selectedRestaurant || !pickupScheduling) return null

    const rawScheduledArrival = String(checkoutForm.scheduledArrivalAt || "").trim()
    const parsedRequestedDate = rawScheduledArrival ? new Date(rawScheduledArrival) : null
    const requestedDate =
      parsedRequestedDate && !Number.isNaN(parsedRequestedDate.getTime())
        ? parsedRequestedDate
        : pickupScheduling.suggestedArrivalDate
    const effectiveDate =
      requestedDate.getTime() < pickupScheduling.minimumArrivalDate.getTime()
        ? pickupScheduling.minimumArrivalDate
        : requestedDate
    const pickupLeadMinutes = getMinutesUntilDate(effectiveDate)
    const leaveInMinutes =
      selectedRestaurant.travelMinutes === null
        ? null
        : Math.max(pickupLeadMinutes - selectedRestaurant.travelMinutes, 0)

    return {
      effectiveDate,
      effectiveValue: formatDateTimeLocalValue(effectiveDate),
      effectiveLabel: formatClockFromDate(effectiveDate),
      pickupLeadMinutes,
      leaveInMinutes,
      isAdjustedToMinimum:
        rawScheduledArrival.length > 0 &&
        requestedDate.getTime() < pickupScheduling.minimumArrivalDate.getTime(),
    }
  }, [checkoutForm.scheduledArrivalAt, pickupScheduling, selectedRestaurant])

  const bestRestaurantNow = filteredRestaurants[0] || null

  const liveRestaurantLeaders = useMemo(() => {
    if (filteredRestaurants.length <= 1) {
      return filteredRestaurants.slice(0, 3)
    }

    return filteredRestaurants.slice(1, 4)
  }, [filteredRestaurants])

  const isSelectedRestaurantPaymentReady = CLIENT_PAYMENT_ENABLED
    ? Boolean(selectedRestaurant?.accepts_online_payment)
    : true

  useEffect(() => {
    if (!selectedRestaurant || !pickupScheduling) return

    setCheckoutForm((prev) => {
      const restaurantChanged = previousScheduledRestaurantIdRef.current !== selectedRestaurant.id
      const currentDate = prev.scheduledArrivalAt ? new Date(prev.scheduledArrivalAt) : null
      const hasValidCurrentDate = currentDate && !Number.isNaN(currentDate.getTime())
      const needsReset =
        restaurantChanged ||
        !hasValidCurrentDate ||
        currentDate.getTime() < pickupScheduling.minimumArrivalDate.getTime()
      const nextScheduledArrivalAt = needsReset
        ? pickupScheduling.suggestedValue
        : prev.scheduledArrivalAt

      previousScheduledRestaurantIdRef.current = selectedRestaurant.id

      if (nextScheduledArrivalAt === prev.scheduledArrivalAt) {
        return prev
      }

      return {
        ...prev,
        scheduledArrivalAt: nextScheduledArrivalAt,
      }
    })
  }, [pickupScheduling, selectedRestaurant])

  const optionItemsByOption = menuOptionItems.reduce((acc, item) => {
    if (!acc[item.option_id]) acc[item.option_id] = []
    acc[item.option_id].push(item)
    return acc
  }, {})

  const optionsByProduct = useMemo(
    () =>
      menuOptions.reduce((acc, option) => {
        if (!acc[option.product_id]) acc[option.product_id] = []
        acc[option.product_id].push(option)
        return acc
      }, {}),
    [menuOptions]
  )

  const optionItemById = useMemo(
    () =>
      Object.fromEntries(menuOptionItems.map((item) => [String(item.id), item])),
    [menuOptionItems]
  )

  const cartCount = useMemo(
    () => cartItems.reduce((total, item) => total + item.quantity, 0),
    [cartItems]
  )

  const cartTotal = useMemo(
    () => cartItems.reduce((total, item) => total + item.totalPrice * item.quantity, 0),
    [cartItems]
  )

  const getProductSelectionMeta = (product) => {
    const productOptions = optionsByProduct[product.id] || []
    const productSelections = selectedOptionItemsByProduct[String(product.id)] || {}
    const requiredOptions = productOptions.filter(
      (option) => option.required && (optionItemsByOption[option.id] || []).length > 0
    )
    const completedRequiredCount = requiredOptions.filter(
      (option) => (productSelections[String(option.id)] || []).length > 0
    ).length
    const selectedItems = productOptions.flatMap((option) =>
      (productSelections[String(option.id)] || [])
        .map((itemId) => optionItemById[String(itemId)])
        .filter(Boolean)
        .map((item) => ({
          ...item,
          optionName: getDisplayOptionName(option.name),
        }))
    )
    const extraPrice = selectedItems.reduce(
      (total, item) => total + (Number(item.price) || 0),
      0
    )

    return {
      productOptions,
      requiredOptions,
      completedRequiredCount,
      selectedItems,
      extraPrice,
      missingRequiredCount: requiredOptions.length - completedRequiredCount,
    }
  }

  const updateCheckoutField = (field, value) => {
    setCheckoutForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const toggleOptionItemSelection = (productId, option, itemId) => {
    const productKey = String(productId)
    const optionKey = String(option.id)
    const itemKey = String(itemId)

    setSelectedOptionItemsByProduct((prev) => {
      const productSelections = prev[productKey] || {}
      const currentSelection = productSelections[optionKey] || []

      const nextSelection = option.required
        ? [itemKey]
        : currentSelection.includes(itemKey)
          ? currentSelection.filter((value) => value !== itemKey)
          : [...currentSelection, itemKey]

      return {
        ...prev,
        [productKey]: {
          ...productSelections,
          [optionKey]: nextSelection,
        },
      }
    })
  }

  const addProductToCart = (product) => {
    const { productOptions } = getProductSelectionMeta(product)
    const productSelections = selectedOptionItemsByProduct[String(product.id)] || {}

    for (const option of productOptions) {
      const selectableItems = optionItemsByOption[option.id] || []

      if (
        option.required &&
        selectableItems.length > 0 &&
        !(productSelections[String(option.id)] || []).length
      ) {
        setCheckoutError(`Selectionne une option pour ${product.name}.`)
        return
      }
    }

    const productComment =
      String(productCommentsByProduct[String(product.id)] || "").trim()

    const selectedOptionItems = productOptions.flatMap((option) =>
      (productSelections[String(option.id)] || [])
        .map((itemId) => optionItemById[String(itemId)])
        .filter(Boolean)
        .map((item) => ({
          id: item.id,
          optionId: option.id,
          optionName: option.name,
          name: item.name,
          price: Number(item.price) || 0,
        }))
    )

    const selectionKey = JSON.stringify({
      optionItemIds: selectedOptionItems
        .map((item) => item.id)
        .sort((firstValue, secondValue) => firstValue - secondValue),
      comment: productComment,
    })
    const totalPrice =
      Number(product.price) +
      selectedOptionItems.reduce((total, item) => total + Number(item.price || 0), 0)

    setCartItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.productId === product.id && item.selectionKey === selectionKey
      )

      if (existingIndex === -1) {
        return [
          ...prev,
          {
            cartKey: `${product.id}-${selectionKey}-${Date.now()}`,
            productId: product.id,
            productName: product.name,
            basePrice: Number(product.price) || 0,
            quantity: 1,
            totalPrice,
            selectionKey,
            optionItems: selectedOptionItems,
            comment: productComment,
          },
        ]
      }

      return prev.map((item, index) =>
        index === existingIndex
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item
      )
    })

    setCheckoutError("")
    setCheckoutSuccess("")
    setSelectedOptionItemsByProduct((prev) => ({
      ...prev,
      [String(product.id)]: {},
    }))
    setProductCommentsByProduct((prev) => ({
      ...prev,
      [String(product.id)]: "",
    }))
  }

  const decreaseCartItem = (cartKey) => {
    setCartItems((prev) =>
      prev.flatMap((item) => {
        if (item.cartKey !== cartKey) return [item]
        if (item.quantity <= 1) return []
        return [
          {
            ...item,
            quantity: item.quantity - 1,
          },
        ]
      })
    )
  }

  const submitGuestOrder = async () => {
    if (!selectedRestaurant || cartItems.length === 0) return

    if (!checkoutForm.customerName.trim() || !checkoutForm.customerPhone.trim()) {
      setCheckoutError("Nom et telephone sont obligatoires.")
      return
    }

    if (!pickupScheduling || !scheduledArrivalDetails) {
      setCheckoutError("Impossible de calculer l'arrivee programmee pour ce restaurant.")
      return
    }

    if (
      scheduledArrivalDetails.effectiveDate.getTime() <
      pickupScheduling.minimumArrivalDate.getTime()
    ) {
      setCheckoutError(
        `L'arrivee ne peut pas etre avant ${pickupScheduling.minimumLabel}, le minimum annonce par le restaurant.`
      )
      return
    }

    if (CLIENT_PAYMENT_ENABLED && !isSelectedRestaurantPaymentReady) {
      setCheckoutError("Ce restaurant n'accepte pas encore les paiements en ligne.")
      return
    }

    setIsSubmittingOrder(true)
    setCheckoutError("")
    setCheckoutSuccess("")
    setCheckoutSuccessOrderId(null)

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const siteOrigin = window.location.origin

      const response = await fetch(
        `${supabaseUrl}/functions/v1/create-checkout-session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: anonKey,
          },
          body: JSON.stringify({
            restaurant_id: selectedRestaurant.id,
            items: cartItems.map((item) => ({
              product_id: item.productId,
              quantity: item.quantity,
              option_item_ids: item.optionItems.map((optionItem) => optionItem.id),
              comment: item.comment || "",
            })),
            customer: {
              name: checkoutForm.customerName.trim(),
              phone: checkoutForm.customerPhone.trim(),
              email: checkoutForm.customerEmail.trim(),
            },
            requested_arrival_at: scheduledArrivalDetails.effectiveDate.toISOString(),
            payment_mode: CLIENT_PAYMENT_ENABLED ? "stripe" : "direct",
            success_url: `${siteOrigin}/?restaurant=${selectedRestaurant.id}&checkout=success`,
            cancel_url: `${siteOrigin}/?restaurant=${selectedRestaurant.id}&checkout=cancel`,
          }),
        }
      )

      const raw = await response.text()
      const data = raw ? JSON.parse(raw) : {}

      if (!response.ok) {
        throw new Error(data.error || "Paiement impossible.")
      }

      if (!CLIENT_PAYMENT_ENABLED && data.order_id) {
        setCheckoutSuccess(
          `Commande envoyee. Arrivee programmee a ${scheduledArrivalDetails.effectiveLabel}.`
        )
        setCheckoutSuccessOrderId(data.order_id)
        setCheckoutError("")
        setCartItems([])
        setSelectedOptionItemsByProduct({})
        setProductCommentsByProduct({})
        setCheckoutForm({
          customerName: "",
          customerPhone: "",
          customerEmail: "",
          scheduledArrivalAt: pickupScheduling.suggestedValue,
        })
        setIsSubmittingOrder(false)
        return
      }

      if (!data.url) {
        throw new Error("Lien Stripe manquant.")
      }

      window.location.assign(data.url)
    } catch (error) {
      setCheckoutError(error.message)
      setIsSubmittingOrder(false)
      return
    }
  }

  const getRestaurantAddress = (restaurant) =>
    restaurant.address ||
    resolvedAddresses[restaurant.id] ||
    formatCoordinateAddress(restaurant.latitude, restaurant.longitude)

  const closeCheckoutSuccess = () => {
    setCheckoutSuccess("")
    setCheckoutSuccessOrderId(null)
  }

  const handleReturnToMap = () => {
    closeCheckoutSuccess()
    navigateToClient(null)
  }

  return (
    <div className="lineskeats-theme min-h-screen bg-slate-950 text-slate-100">
      {checkoutSuccess && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
          <style>{`
            @keyframes lineskeatsPopupIn {
              from { opacity: 0; transform: translateY(14px) scale(0.96); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
          <div
            className="w-full max-w-sm rounded-[1.75rem] border p-5 shadow-2xl sm:p-6"
            style={{
              background: "#fffaf4",
              borderColor: "rgba(62, 42, 54, 0.12)",
              color: "#3e2a36",
              animation: "lineskeatsPopupIn 220ms ease-out",
            }}
          >
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl"
              style={{
                background: "rgba(143, 64, 82, 0.12)",
                color: "#8f4052",
              }}
            >
              ✓
            </div>
            <h3 className="lineskeats-brand mt-4 text-center text-2xl font-semibold">
              Commande confirmee
            </h3>
            <p className="mt-2 text-center text-sm" style={{ color: "#64748b" }}>
              {checkoutSuccess}
            </p>
            {checkoutSuccessOrderId && (
              <p
                className="mt-3 text-center text-xs uppercase tracking-widest"
                style={{ color: "#64748b" }}
              >
                Commande #{checkoutSuccessOrderId}
              </p>
            )}
            {selectedRestaurant && (
              <>
                <p
                  className="mt-2 text-center text-xs uppercase tracking-widest"
                  style={{ color: "#8f4052" }}
                >
                  {selectedRestaurant.name}
                </p>
                <p
                  className="mt-2 text-center text-xs uppercase tracking-widest"
                  style={{ color: "#64748b" }}
                >
                  Retrait synchronise vers {selectedRestaurant.readyAtLabel}
                </p>
              </>
            )}
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleReturnToMap}
                className="w-full rounded-full border border-white/10 px-5 py-3 text-xs font-semibold uppercase tracking-widest"
                style={{ color: "#3e2a36" }}
              >
                Retour a la carte
              </button>
              <button
                type="button"
                onClick={closeCheckoutSuccess}
                className="w-full rounded-full bg-emerald-400 px-5 py-3 text-xs font-semibold uppercase tracking-widest text-slate-950"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-8">
        <div className="theme-header-panel mb-5 px-4 py-4 sm:mb-8 sm:px-8 sm:py-6">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="rounded-[2rem] border border-white/10 bg-black/10 px-5 py-5 shadow-[0_20px_50px_rgba(21,7,14,0.18)] sm:px-6 sm:py-6">
                <div className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-white/75">
                  Pickup live
                </div>
                <BrandLogo
                  preset="xl"
                  tone="dark"
                  showTagline={true}
                  showSubline={true}
                  className="shrink-0"
                />
              </div>
              <div className="max-w-2xl">
                <p className="text-[0.8rem] leading-snug text-slate-300 sm:text-base">
                  Le repas prêt quand tu arrives.
                </p>
              </div>
            </div>
          </div>
        </div>

        {!selectedRestaurantId && (
          <div className="space-y-6">
            <h2 className="lineskeats-menu mb-3 text-lg font-semibold text-white sm:mb-4 sm:text-xl">
              Choisis le retrait le plus intelligent
            </h2>

            {error && (
              <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
                Impossible de charger les restaurants: {error}
              </div>
            )}

            {isLoading ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-48 animate-pulse rounded-3xl border border-white/10 bg-slate-900/60 sm:h-64"
                  />
                ))}
              </div>
            ) : restaurants.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-slate-900/40 px-6 py-10 text-sm text-slate-400">
                Aucun restaurant actif n est visible pour le moment.
              </div>
            ) : (
              <>
                <section className="relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-slate-900/70 p-2 shadow-2xl sm:p-3">
                  <RestaurantMap
                    heroMode
                    restaurants={filteredRestaurants}
                    heightClass="h-[58vh] min-h-[30rem] sm:h-[72vh] sm:min-h-[42rem]"
                    onUserLocationChange={setUserLocation}
                    onRestaurantPreview={(restaurant) => {
                      setActiveMapRestaurant(restaurant)
                      if (typeof window !== "undefined" && window.innerWidth < 640) {
                        setIsRestaurantListVisible(false)
                      }
                    }}
                    onRestaurantSelect={(restaurant) => {
                      navigateToClient(restaurant.id)
                    }}
                  />

                  <div className="pointer-events-none absolute inset-x-0 top-0 z-[1002] p-3 sm:p-5">
                    <div className="max-w-xl space-y-3">
                      <div className="pointer-events-auto rounded-[1.75rem] border border-white/10 bg-slate-950/82 p-3 shadow-xl backdrop-blur sm:p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="lineskeats-menu text-base font-semibold text-white sm:text-lg">
                              Carte des retraits synchronises
                            </h3>
                            <p className="mt-1 text-xs text-slate-300 sm:text-sm">
                              La carte pilote l experience. Cherche, filtre et ouvre un resto
                              directement depuis ici.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setIsRestaurantListVisible((currentValue) => !currentValue)
                              setActiveMapRestaurant(null)
                            }}
                            className="shrink-0 rounded-full border border-white/10 bg-slate-900/80 px-3 py-2 text-[10px] font-medium uppercase tracking-widest text-white transition hover:border-white/30 hover:text-emerald-200 sm:px-4"
                          >
                            {isRestaurantListVisible ? "Fermer" : "Liste"}
                          </button>
                        </div>

                        <div className="mt-3">
                          <label className="sr-only" htmlFor="restaurant-search">
                            Rechercher un restaurant
                          </label>
                          <div className="relative">
                            <input
                              id="restaurant-search"
                              type="search"
                              value={restaurantSearchQuery}
                              onChange={(event) => setRestaurantSearchQuery(event.target.value)}
                              placeholder="Rechercher un restaurant..."
                              className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 pr-16 text-sm text-white placeholder:text-slate-500 focus:border-emerald-300/40 focus:outline-none"
                            />
                            {restaurantSearchQuery ? (
                              <button
                                type="button"
                                onClick={() => setRestaurantSearchQuery("")}
                                className="absolute inset-y-0 right-3 my-auto h-8 rounded-full px-2 text-[10px] uppercase tracking-widest text-slate-300 transition hover:text-white"
                              >
                                Effacer
                              </button>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <p className="text-[10px] uppercase tracking-widest text-slate-400">
                            {filteredRestaurants.length} restaurant
                            {filteredRestaurants.length > 1 ? "s" : ""} visible
                            {filteredRestaurants.length > 1 ? "s" : ""}
                          </p>
                          {selectedCuisineIds.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => setSelectedCuisineIds([])}
                              className="text-[10px] uppercase tracking-widest text-emerald-200 transition hover:text-white"
                            >
                              Reinitialiser
                            </button>
                          ) : null}
                        </div>

                        {cuisineTypes.length > 0 ? (
                          <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
                            <button
                              type="button"
                              onClick={() => setSelectedCuisineIds([])}
                              className={[
                                "shrink-0 whitespace-nowrap rounded-full border px-3 py-2 text-[10px] uppercase tracking-widest transition-colors sm:px-4 sm:text-xs",
                                selectedCuisineIds.length === 0
                                  ? "border-emerald-300/40 bg-emerald-400"
                                  : "border-white/10 bg-slate-900/70 text-white/70 hover:border-white/30 hover:text-white",
                              ].join(" ")}
                            >
                              Tous
                            </button>

                            {cuisineTypes.map((cuisine) => {
                              const isSelected = selectedCuisineIds.includes(cuisine.id)

                              return (
                                <button
                                  key={cuisine.id}
                                  type="button"
                                  onClick={() =>
                                    setSelectedCuisineIds((prev) =>
                                      prev.includes(cuisine.id)
                                        ? prev.filter((id) => id !== cuisine.id)
                                        : [...prev, cuisine.id]
                                    )
                                  }
                                  className={[
                                    "shrink-0 whitespace-nowrap rounded-full border px-3 py-2 text-[10px] uppercase tracking-widest transition-colors sm:px-4 sm:text-xs",
                                    isSelected
                                      ? "border-emerald-300/40 bg-emerald-400"
                                      : "border-white/10 bg-slate-900/70 text-white/70 hover:border-white/30 hover:text-white",
                                  ].join(" ")}
                                >
                                  {cuisine.icon ? `${cuisine.icon} ` : ""}
                                  {getDisplayCuisineLabel(cuisine.name)}
                                </button>
                              )
                            })}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {(activeMapRestaurant || bestRestaurantNow) && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1002] hidden p-5 sm:block">
                      <div className="pointer-events-auto max-w-md rounded-[1.8rem] border border-white/10 bg-slate-950/88 p-4 shadow-2xl backdrop-blur">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.24em] text-emerald-200/80">
                              {activeMapRestaurant ? "Apercu carte" : "Meilleur retrait maintenant"}
                            </p>
                            <h3 className="lineskeats-brand mt-2 text-2xl font-semibold text-white">
                              {(activeMapRestaurant || bestRestaurantNow).name}
                            </h3>
                            <p className="mt-2 text-sm text-slate-300">
                              {(activeMapRestaurant || bestRestaurantNow).readyLabel}
                            </p>
                          </div>
                          {activeMapRestaurant ? (
                            <button
                              type="button"
                              onClick={() => setActiveMapRestaurant(null)}
                              className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-widest text-slate-300 transition hover:border-white/30 hover:text-white"
                            >
                              Fermer
                            </button>
                          ) : null}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-[10px] uppercase tracking-widest text-slate-300">
                            Retrait vers {(activeMapRestaurant || bestRestaurantNow).readyAtLabel}
                          </span>
                          {(activeMapRestaurant || bestRestaurantNow).travelMinutes ? (
                            <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-[10px] uppercase tracking-widest text-slate-300">
                              A pied {(activeMapRestaurant || bestRestaurantNow).travelMinutes} min
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-4 flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              navigateToClient((activeMapRestaurant || bestRestaurantNow).id)
                            }
                            className="rounded-full bg-emerald-400 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest transition hover:bg-emerald-300 sm:text-xs"
                          >
                            Ouvrir le menu
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsRestaurantListVisible(true)}
                            className="rounded-full border border-white/10 px-4 py-2 text-[10px] uppercase tracking-widest text-white/80 transition hover:border-white/30 hover:text-white sm:text-xs"
                          >
                            Voir la liste
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {!activeMapRestaurant && bestRestaurantNow ? (
                    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-[1002] px-3 sm:hidden">
                      <div className="pointer-events-auto rounded-[1.5rem] border border-white/10 bg-slate-950/88 p-3 shadow-xl backdrop-blur">
                        <p className="text-[10px] uppercase tracking-[0.24em] text-emerald-200/80">
                          Meilleur retrait maintenant
                        </p>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">
                              {bestRestaurantNow.name}
                            </p>
                            <p className="text-xs text-slate-300">{bestRestaurantNow.readyLabel}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => navigateToClient(bestRestaurantNow.id)}
                            className="shrink-0 rounded-full bg-emerald-400 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest transition hover:bg-emerald-300"
                          >
                            Menu
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </section>

                <section className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-4 shadow-lg">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400">
                      Meilleur retrait
                    </p>
                    <p className="mt-2 text-base font-semibold text-white">
                      {bestRestaurantNow ? bestRestaurantNow.readyLabel : "--"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-4 shadow-lg">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400">
                      Strategie active
                    </p>
                    <p className="mt-2 text-base font-semibold text-white">
                      {userLocation ? "Cuisine synchronisee" : "Cuisine live"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-4 shadow-lg">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400">
                      Restaurants affiches
                    </p>
                    <p className="mt-2 text-base font-semibold text-white">
                      {filteredRestaurants.length} visible{filteredRestaurants.length > 1 ? "s" : ""}
                    </p>
                  </div>
                </section>

                {liveRestaurantLeaders.length > 0 ? (
                  <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-4 shadow-xl">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-slate-400">
                          Rythmes live
                        </p>
                        <h3 className="lineskeats-menu mt-2 text-base font-semibold text-white sm:text-lg">
                          D autres retraits rapides a ouvrir
                        </h3>
                      </div>
                    </div>
                    <div className="mt-4 -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
                      {liveRestaurantLeaders.map((restaurant, index) => (
                        <button
                          key={restaurant.id}
                          type="button"
                          onClick={() => navigateToClient(restaurant.id)}
                          className="min-w-[15rem] rounded-[1.5rem] border border-white/10 bg-slate-950/50 px-4 py-4 text-left transition hover:border-white/20 hover:bg-slate-950/70"
                        >
                          <p className="text-[10px] uppercase tracking-widest text-slate-400">
                            #{index + 1}
                          </p>
                          <p className="mt-2 text-sm font-semibold text-white">{restaurant.name}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            retrait vers {restaurant.readyAtLabel}
                          </p>
                        </button>
                      ))}
                    </div>
                  </section>
                ) : null}

                {activeMapRestaurant && !isRestaurantListVisible ? (
                  <div className="fixed inset-0 z-[1100] flex items-end bg-slate-950/35 sm:hidden">
                    <button
                      type="button"
                      onClick={() => setActiveMapRestaurant(null)}
                      className="absolute inset-0"
                      aria-label="Fermer l apercu"
                    />
                    <div className="relative z-10 w-full rounded-t-[2rem] border border-white/10 bg-slate-950/98 p-5 shadow-2xl">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.24em] text-emerald-200/80">
                            Apercu carte
                          </p>
                          <h3 className="lineskeats-brand mt-2 text-2xl font-semibold text-white">
                            {activeMapRestaurant.name}
                          </h3>
                          <p className="mt-2 text-sm text-slate-300">
                            {activeMapRestaurant.description || "Cuisine disponible a proximite."}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveMapRestaurant(null)}
                          className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-widest text-slate-300"
                        >
                          Fermer
                        </button>
                      </div>

                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3">
                          <p className="text-[10px] uppercase tracking-widest text-slate-400">
                            Retrait
                          </p>
                          <p className="mt-1 text-sm font-semibold text-white">
                            {activeMapRestaurant.readyLabel}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3">
                          <p className="text-[10px] uppercase tracking-widest text-slate-400">
                            Synchronisation
                          </p>
                          <p className="mt-1 text-sm font-semibold text-white">
                            {activeMapRestaurant.leaveInMinutes !== null
                              ? `Pars dans ${activeMapRestaurant.leaveInMinutes} min`
                              : `Retrait ${activeMapRestaurant.readyAtLabel}`}
                          </p>
                        </div>
                      </div>

                      <p className="mt-4 text-xs uppercase tracking-widest text-slate-400">
                        {getRestaurantAddress(activeMapRestaurant)}
                      </p>

                      <div className="mt-5 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => navigateToClient(activeMapRestaurant.id)}
                          className="flex-1 rounded-full bg-emerald-400 px-5 py-3 text-xs font-semibold uppercase tracking-widest transition hover:bg-emerald-300"
                        >
                          Ouvrir le menu
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsRestaurantListVisible(true)
                            setActiveMapRestaurant(null)
                          }}
                          className="rounded-full border border-white/10 px-4 py-3 text-[10px] uppercase tracking-widest text-white/80"
                        >
                          Liste
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

                {isRestaurantListVisible && (
                  <>
                  <section ref={restaurantListRef} className="hidden space-y-4 sm:block">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="lineskeats-menu text-base font-semibold text-white sm:text-lg">
                          Classement live des retraits
                        </h3>
                        <p className="text-xs text-slate-400 sm:text-sm">
                          Trie automatiquement par vitesse de retrait
                          {userLocation ? " et marche synchronisee." : "."}
                        </p>
                      </div>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-widest text-slate-300 sm:text-xs">
                        {filteredRestaurants.length}
                      </span>
                    </div>

                    {filteredRestaurants.length === 0 ? (
                      <div className="rounded-3xl border border-dashed border-white/10 bg-slate-900/40 px-6 py-10 text-sm text-slate-400">
                        Aucun restaurant ne correspond au filtre selectionne.
                      </div>
                    ) : (
                      <div className="-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-2 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-3">
                        {filteredRestaurants.map((restaurant) => {
                          const cuisineLabels = (cuisineIdsByRestaurant[restaurant.id] || [])
                            .map((cuisineId) => cuisineTypeById[cuisineId])
                            .filter(Boolean)

                          return (
                            <article
                              key={restaurant.id}
                              className="group min-w-[17.5rem] snap-start overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-900/60 text-left shadow-xl transition hover:-translate-y-0.5 sm:min-w-0"
                              onClick={() => navigateToClient(restaurant.id)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault()
                                  navigateToClient(restaurant.id)
                                }
                              }}
                              role="button"
                              tabIndex={0}
                            >
                              <div className="relative">
                                <img
                                  src={restaurant.image || fallbackImage}
                                  alt={restaurant.name}
                                  className="h-40 w-full object-cover sm:h-44"
                                />
                                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent" />
                                <span className="absolute left-3 top-3 rounded-full bg-rose-600 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white shadow-lg">
                                  {restaurant.readyLabel}
                                </span>
                                <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-lg text-slate-950 shadow-lg transition group-hover:translate-x-0.5">
                                  →
                                </span>
                              </div>

                              <div className="space-y-3 p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <h3 className="lineskeats-brand truncate text-xl font-semibold text-white">
                                      {restaurant.name}
                                    </h3>
                                    <p className="mt-1 text-xs text-slate-400">
                                      {getRestaurantAddress(restaurant)}
                                    </p>
                                  </div>
                                  <span
                                    className={[
                                      "rounded-full px-3 py-1 text-[10px] uppercase tracking-widest",
                                      restaurant.pickupScore.tone === "emerald"
                                        ? "border border-emerald-300/40 bg-emerald-500/10 text-emerald-200"
                                        : restaurant.pickupScore.tone === "amber"
                                          ? "border border-amber-500/30 bg-amber-500/10 text-amber-100"
                                          : "border border-rose-500/30 bg-rose-500/10 text-rose-200",
                                    ].join(" ")}
                                  >
                                    {restaurant.pickupScore.label}
                                  </span>
                                </div>

                                {cuisineLabels.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {cuisineLabels.slice(0, 3).map((cuisine) => (
                                      <span
                                        key={`${restaurant.id}-${cuisine.id}`}
                                        className="rounded-full border border-white/10 bg-slate-950/40 px-2.5 py-1 text-[9px] uppercase tracking-widest text-slate-300"
                                      >
                                        {cuisine.icon ? `${cuisine.icon} ` : ""}
                                        {getDisplayCuisineLabel(cuisine.name)}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                <div className="grid gap-2 sm:grid-cols-2">
                                  <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-3">
                                    <p className="text-[10px] uppercase tracking-widest text-slate-400">
                                      Cuisine live
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-white">
                                      {restaurant.waitTime} min
                                    </p>
                                  </div>
                                  <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-3">
                                    <p className="text-[10px] uppercase tracking-widest text-slate-400">
                                      Synchronisation
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-white">
                                      {restaurant.leaveInMinutes !== null
                                        ? `Pars dans ${restaurant.leaveInMinutes} min`
                                        : `Retrait ${restaurant.readyAtLabel}`}
                                    </p>
                                  </div>
                                </div>

                                <p className="text-sm text-slate-300">
                                  {restaurant.description || "Cuisine disponible a proximite."}
                                </p>

                                <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3 text-[10px] uppercase tracking-widest sm:text-xs">
                                  <div className="flex flex-col">
                                    <span className="text-emerald-200/80 group-hover:text-emerald-100">
                                      Ouvrir le restaurant
                                    </span>
                                    <span className="mt-1 text-[11px] normal-case tracking-normal text-slate-400">
                                      {restaurant.travelMinutes
                                        ? `${restaurant.travelMinutes} min a pied, retrait vers ${restaurant.readyAtLabel}`
                                        : `Retrait estime a ${restaurant.readyAtLabel}`}
                                    </span>
                                  </div>
                                  <span className="rounded-full border border-white/10 px-3 py-1 text-slate-300">
                                    {cuisineLabels[0]
                                      ? getDisplayCuisineLabel(cuisineLabels[0].name)
                                      : "Menu"}
                                  </span>
                                </div>
                              </div>
                            </article>
                          )
                        })}
                      </div>
                    )}
                  </section>
                  <div className="fixed inset-0 z-[1110] bg-slate-950/45 sm:hidden">
                    <button
                      type="button"
                      onClick={() => setIsRestaurantListVisible(false)}
                      className="absolute inset-0"
                      aria-label="Fermer la liste"
                    />
                    <section className="absolute inset-x-0 bottom-0 max-h-[78vh] overflow-hidden rounded-t-[2rem] border border-white/10 bg-slate-950/98 shadow-2xl">
                      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                        <div>
                          <h3 className="lineskeats-menu text-base font-semibold text-white">
                            Classement live
                          </h3>
                          <p className="text-xs text-slate-400">
                            {filteredRestaurants.length} restaurant
                            {filteredRestaurants.length > 1 ? "s" : ""} visible
                            {filteredRestaurants.length > 1 ? "s" : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsRestaurantListVisible(false)}
                          className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-widest text-slate-300"
                        >
                          Fermer
                        </button>
                      </div>

                      <div className="max-h-[calc(78vh-5rem)] space-y-3 overflow-y-auto px-4 py-4">
                        {filteredRestaurants.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 px-5 py-8 text-sm text-slate-400">
                            Aucun restaurant ne correspond au filtre selectionne.
                          </div>
                        ) : (
                          filteredRestaurants.map((restaurant, index) => (
                            <button
                              key={restaurant.id}
                              type="button"
                              onClick={() => navigateToClient(restaurant.id)}
                              className="w-full rounded-[1.5rem] border border-white/10 bg-slate-900/70 px-4 py-4 text-left"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-[10px] uppercase tracking-widest text-slate-400">
                                    #{index + 1}
                                  </p>
                                  <p className="mt-2 truncate text-sm font-semibold text-white">
                                    {restaurant.name}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-400">
                                    {restaurant.travelMinutes
                                      ? `${restaurant.travelMinutes} min a pied`
                                      : "Cuisine en direct"}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-semibold text-emerald-200">
                                    {restaurant.syncPickupMinutes} min
                                  </p>
                                  <p className="mt-1 text-[11px] text-slate-400">
                                    {restaurant.readyAtLabel}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </section>
                  </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {selectedRestaurantId && (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <a
                href="/"
                className="self-start rounded-full border border-white/10 px-4 py-2 text-[10px] uppercase tracking-widest text-white/70 hover:border-white/30 hover:text-white sm:text-xs"
              >
                Retour
              </a>
              {selectedRestaurant && (
                <span className="self-start rounded-full border border-emerald-200/20 px-4 py-2 text-[10px] uppercase tracking-widest text-emerald-200/80 sm:self-auto sm:text-xs">
                  {selectedRestaurant.readyLabel}
                </span>
              )}
            </div>

            {!selectedRestaurant && !isLoading && (
              <div className="rounded-3xl border border-dashed border-white/10 bg-slate-900/40 px-6 py-10 text-sm text-slate-400">
                Ce restaurant n est pas disponible.
              </div>
            )}

            {selectedRestaurant && (
              <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 shadow-xl">
                <img
                  src={selectedRestaurant.image || fallbackImage}
                  alt={selectedRestaurant.name}
                  className="h-40 w-full object-cover sm:h-56"
                />
                <div className="grid gap-5 p-4 sm:gap-6 sm:p-6 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-3">
                    <h2 className="lineskeats-brand text-2xl font-semibold text-white sm:text-3xl">
                      {selectedRestaurant.name}
                    </h2>
                    <p className="text-sm text-slate-300">
                      {selectedRestaurant.description || "Aucune description disponible."}
                    </p>
                    <p className="text-xs uppercase tracking-widest text-slate-400">
                      {getRestaurantAddress(selectedRestaurant)}
                    </p>
                  </div>

                  <div className="grid gap-3">
                    <div className="rounded-3xl border border-emerald-300/30 bg-emerald-500/10 px-4 py-4">
                      <p className="text-[10px] uppercase tracking-widest text-slate-400">
                        Si tu commandes maintenant
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-white">
                        {selectedRestaurant.readyLabel}
                      </p>
                      <p className="mt-2 text-sm text-slate-300">
                        Retrait synchronise vers {selectedRestaurant.readyAtLabel}
                        {selectedRestaurant.travelMinutes
                          ? `, avec environ ${selectedRestaurant.travelMinutes} min a pied.`
                          : "."}
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
                        <p className="text-[10px] uppercase tracking-widest text-slate-400">
                          Score live
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {selectedRestaurant.pickupScore.label}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
                        <p className="text-[10px] uppercase tracking-widest text-slate-400">
                          Timing depart
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {selectedRestaurant.leaveInMinutes !== null
                            ? `Pars dans ${selectedRestaurant.leaveInMinutes} min`
                            : "Active la carte pour synchroniser"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {menuError && (
              <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
                Impossible de charger le menu: {menuError}
              </div>
            )}

            {selectedRestaurant && isMenuLoading && (
              <div className="grid gap-3 sm:gap-4">
                {[1, 2].map((item) => (
                  <div
                    key={item}
                    className="h-36 animate-pulse rounded-3xl border border-white/10 bg-slate-900/60 sm:h-44"
                  />
                ))}
              </div>
            )}

            {selectedRestaurant && !isMenuLoading && menuCategories.length === 0 && (
              <div className="rounded-3xl border border-dashed border-white/10 bg-slate-900/40 px-6 py-10 text-sm text-slate-400">
                Aucun produit n est encore disponible pour ce restaurant.
              </div>
            )}

            {selectedRestaurant && !isMenuLoading && menuCategories.length > 0 && (
              <div className="space-y-6">
                {menuCategories.map((category) => {
                  const categoryProducts = menuProducts.filter(
                    (product) => String(product.category_id) === String(category.id)
                  )

                  return (
                    <section
                      key={category.id}
                      className="rounded-3xl border border-white/10 bg-slate-900/60 p-4 sm:p-6"
                    >
                      <h3 className="lineskeats-menu text-lg font-semibold text-white sm:text-xl">
                        {category.name}
                      </h3>

                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        {categoryProducts.length === 0 && (
                          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 px-5 py-6 text-sm text-slate-400">
                            Aucun produit visible dans cette categorie.
                          </div>
                        )}

                        {categoryProducts.map((product) => {
                          const productOptions = menuOptions.filter(
                            (option) => String(option.product_id) === String(product.id)
                          )

                          return (
                            <article
                              key={product.id}
                              className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
                            >
                              <div className="flex flex-col gap-4 sm:flex-row">
                                {product.image_url && (
                                  <img
                                    src={product.image_url}
                                    alt={product.name}
                                    className="h-32 w-full rounded-xl object-cover sm:h-24 sm:w-24"
                                  />
                                )}

                                <div className="flex-1">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <h4 className="lineskeats-menu text-base font-semibold text-white sm:text-lg">
                                        {product.name}
                                      </h4>
                                      <p className="mt-1 text-sm text-slate-300">
                                        {product.description || "Aucune description disponible."}
                                      </p>
                                    </div>
                                    <span className="rounded-full border border-emerald-200/20 px-3 py-1 text-xs text-emerald-200 sm:text-sm">
                                      {currency(product.price)}
                                    </span>
                                  </div>

                                  {productOptions.length > 0 && (
                                    <div className="mt-4 space-y-3">
                                      {productOptions.map((option) => {
                                        const optionItems = optionItemsByOption[option.id] || []

                                        return (
                                          <div
                                            key={option.id}
                                            className="rounded-xl border border-white/10 bg-slate-900/70 p-3"
                                          >
                                            <div className="flex items-center justify-between gap-3">
                                              <p className="lineskeats-menu text-sm font-medium text-white">
                                                {getDisplayOptionName(option.name)}
                                              </p>
                                              <span className="text-[10px] uppercase tracking-widest text-slate-400">
                                                {option.required ? "Obligatoire" : "Optionnel"}
                                              </span>
                                            </div>

                                            <div className="mt-2 space-y-2">
                                              {optionItems.length === 0 && (
                                                <div className="rounded-lg border border-dashed border-white/10 px-3 py-2 text-xs text-slate-500">
                                                  Aucun choix disponible pour cette option.
                                                </div>
                                              )}

                                              {optionItems.map((item) => (
                                                <label
                                                  key={item.id}
                                                  className="flex cursor-pointer items-center justify-between rounded-lg border border-white/5 px-3 py-2 text-xs text-slate-300"
                                                >
                                                  <div className="flex items-center gap-2">
                                                    <input
                                                      type={option.required ? "radio" : "checkbox"}
                                                      name={`product-${product.id}-option-${option.id}`}
                                                      checked={(
                                                        selectedOptionItemsByProduct[String(product.id)]?.[
                                                          String(option.id)
                                                        ] || []
                                                      ).includes(String(item.id))}
                                                      onChange={() =>
                                                        toggleOptionItemSelection(
                                                          product.id,
                                                          option,
                                                          item.id
                                                        )
                                                      }
                                                      className="h-4 w-4 rounded border-white/10 bg-slate-950 text-emerald-400"
                                                    />
                                                    <span>{item.name}</span>
                                                  </div>
                                                  <span className="text-emerald-200">
                                                    {Number(item.price) > 0
                                                      ? `+${currency(item.price)}`
                                                      : "gratuit"}
                                                  </span>
                                                </label>
                                              ))}
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}

                                  <div className="mt-4">
                                    <label className="block text-[10px] uppercase tracking-widest text-slate-400">
                                      Commentaire produit
                                    </label>
                                    <textarea
                                      value={productCommentsByProduct[String(product.id)] || ""}
                                      onChange={(event) =>
                                        setProductCommentsByProduct((prev) => ({
                                          ...prev,
                                          [String(product.id)]: event.target.value,
                                        }))
                                      }
                                      rows="2"
                                      maxLength={180}
                                      className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-emerald-300/60 focus:outline-none"
                                      placeholder="Ex: sans cornichons, allergie aux noix..."
                                    />
                                  </div>

                                  <div className="mt-4 flex items-center justify-between gap-3">
                                    <span className="text-xs uppercase tracking-widest text-slate-400">
                                      Ajout panier invite
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => addProductToCart(product)}
                                      className="rounded-full bg-emerald-400 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-950 hover:bg-emerald-300 sm:text-xs"
                                    >
                                      Ajouter
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </article>
                          )
                        })}
                      </div>
                    </section>
                  )
                })}

                <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-4 shadow-xl sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="lineskeats-menu text-lg font-semibold text-white sm:text-xl">
                        Votre panier
                      </h3>
                      <p className="text-xs text-slate-400 sm:text-sm">
                        Finalise un retrait parfaitement synchronise.
                      </p>
                    </div>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-widest text-slate-300 sm:text-xs">
                      {cartCount} article{cartCount > 1 ? "s" : ""}
                    </span>
                  </div>

                  {cartItems.length === 0 ? (
                    <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-slate-950/40 px-5 py-8 text-sm text-slate-400">
                      Ajoute des produits au panier pour preparer la commande.
                    </div>
                  ) : (
                    <div className="mt-4 space-y-6">
                      <div className="space-y-3">
                        {cartItems.map((item) => (
                          <div
                            key={item.cartKey}
                            className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="lineskeats-menu text-sm font-semibold text-white">
                                  {item.productName}
                                </p>
                                {item.optionItems.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {item.optionItems.map((optionItem) => (
                                      <span
                                        key={`${item.cartKey}-${optionItem.id}`}
                                        className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-widest text-slate-300"
                                      >
                                        {optionItem.optionName}: {optionItem.name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {item.comment && (
                                  <p className="mt-2 text-xs text-slate-400">
                                    Commentaire: {item.comment}
                                  </p>
                                )}
                              </div>

                              <div className="text-right">
                                <p className="text-sm font-semibold text-emerald-200">
                                  {currency(item.totalPrice * item.quantity)}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {currency(item.totalPrice)} / unite
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => decreaseCartItem(item.cartKey)}
                                  className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/80 hover:border-white/30 hover:text-white"
                                >
                                  -
                                </button>
                                <span className="min-w-8 text-center text-sm text-white">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCartItems((prev) =>
                                      prev.map((cartItem) =>
                                        cartItem.cartKey === item.cartKey
                                          ? {
                                              ...cartItem,
                                              quantity: cartItem.quantity + 1,
                                            }
                                          : cartItem
                                      )
                                    )
                                  }
                                  className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/80 hover:border-white/30 hover:text-white"
                                >
                                  +
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  setCartItems((prev) =>
                                    prev.filter((cartItem) => cartItem.cartKey !== item.cartKey)
                                  )
                                }
                                className="text-xs uppercase tracking-widest text-rose-300 hover:text-rose-200"
                              >
                                Supprimer
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-300">
                            Nom
                          </label>
                          <input
                            value={checkoutForm.customerName}
                            onChange={(event) =>
                              updateCheckoutField("customerName", event.target.value)
                            }
                            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-600"
                            placeholder="Votre nom"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300">
                            Telephone
                          </label>
                          <input
                            value={checkoutForm.customerPhone}
                            onChange={(event) =>
                              updateCheckoutField("customerPhone", event.target.value)
                            }
                            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-600"
                            placeholder="Votre numero"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300">
                            Email
                          </label>
                          <input
                            value={checkoutForm.customerEmail}
                            onChange={(event) =>
                              updateCheckoutField("customerEmail", event.target.value)
                            }
                            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-600"
                            placeholder="Optionnel pour le recu"
                            type="email"
                          />
                        </div>
                      </div>

                      {selectedRestaurant && pickupScheduling && scheduledArrivalDetails && (
                        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                              <label className="block text-sm font-medium text-gray-300">
                                Programmer ton arrivee
                              </label>
                              <p className="mt-1 text-xs text-slate-400">
                                Premiere arrivee possible a {pickupScheduling.minimumLabel}. Le
                                restaurant annonce {selectedRestaurant.waitTime} min minimum de
                                preparation.
                              </p>
                            </div>
                            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] uppercase tracking-widest text-emerald-100">
                              Suggere: {pickupScheduling.suggestedLabel}
                            </span>
                          </div>

                          <input
                            type="datetime-local"
                            value={checkoutForm.scheduledArrivalAt}
                            min={pickupScheduling.minimumValue}
                            step={300}
                            onChange={(event) =>
                              updateCheckoutField("scheduledArrivalAt", event.target.value)
                            }
                            className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white"
                          />

                          <div className="mt-3 grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3">
                              <p className="text-[10px] uppercase tracking-widest text-slate-400">
                                Arrivee programmee
                              </p>
                              <p className="mt-1 text-sm font-semibold text-white">
                                {scheduledArrivalDetails.effectiveLabel}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3">
                              <p className="text-[10px] uppercase tracking-widest text-slate-400">
                                Commande prete
                              </p>
                              <p className="mt-1 text-sm font-semibold text-white">
                                {scheduledArrivalDetails.effectiveLabel}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3">
                              <p className="text-[10px] uppercase tracking-widest text-slate-400">
                                Depart conseille
                              </p>
                              <p className="mt-1 text-sm font-semibold text-white">
                                {scheduledArrivalDetails.leaveInMinutes !== null
                                  ? `Pars dans ${scheduledArrivalDetails.leaveInMinutes} min`
                                  : "Selon ta position"}
                              </p>
                            </div>
                          </div>

                          {scheduledArrivalDetails.isAdjustedToMinimum && (
                            <p className="mt-3 text-xs text-amber-200">
                              Cette arrivee etait trop tot. Le minimum reste{" "}
                              {pickupScheduling.minimumLabel}.
                            </p>
                          )}
                        </div>
                      )}

                      <div className="rounded-2xl border border-emerald-400/10 bg-slate-950/50 px-4 py-3 text-xs text-slate-300">
                        {CLIENT_PAYMENT_ENABLED
                          ? "Retrait sur place uniquement. Le paiement se fait sur Stripe, sans compte obligatoire."
                          : "Mode conception actif. La commande est envoyee directement au restaurant, sans paiement client."}
                      </div>

                      {selectedRestaurant && (
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
                            <p className="text-[10px] uppercase tracking-widest text-slate-400">
                              Cuisine live
                            </p>
                            <p className="mt-1 text-sm font-semibold text-white">
                              {selectedRestaurant.waitTime} min
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
                            <p className="text-[10px] uppercase tracking-widest text-slate-400">
                              Arrivee programmee
                            </p>
                            <p className="mt-1 text-sm font-semibold text-white">
                              {scheduledArrivalDetails?.effectiveLabel ||
                                pickupScheduling?.suggestedLabel ||
                                selectedRestaurant.readyAtLabel}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
                            <p className="text-[10px] uppercase tracking-widest text-slate-400">
                              Action ideale
                            </p>
                            <p className="mt-1 text-sm font-semibold text-white">
                              {scheduledArrivalDetails?.leaveInMinutes !== null
                                ? `Pars dans ${scheduledArrivalDetails.leaveInMinutes} min`
                                : "Commande puis regarde la carte"}
                            </p>
                          </div>
                        </div>
                      )}

                      {CLIENT_PAYMENT_ENABLED && !isSelectedRestaurantPaymentReady && (
                        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                          Le paiement en ligne n'est pas encore actif pour ce restaurant.
                        </div>
                      )}

                      {checkoutError && (
                        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                          {checkoutError}
                        </div>
                      )}

                      <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-widest text-slate-400">
                            Total
                          </p>
                          <p className="text-2xl font-semibold text-white">
                            {currency(cartTotal)}
                          </p>
                          {selectedRestaurant && (
                            <p className="mt-1 text-xs text-slate-400">
                              Arrivee programmee a{" "}
                              {scheduledArrivalDetails?.effectiveLabel ||
                                pickupScheduling?.suggestedLabel ||
                                selectedRestaurant.readyAtLabel}
                              {selectedRestaurant.travelMinutes
                                ? `, a environ ${selectedRestaurant.travelMinutes} min a pied.`
                                : "."}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={submitGuestOrder}
                          disabled={
                            isSubmittingOrder ||
                            (CLIENT_PAYMENT_ENABLED && !isSelectedRestaurantPaymentReady)
                          }
                          className="rounded-full bg-emerald-400 px-6 py-3 text-xs font-semibold uppercase tracking-widest text-slate-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isSubmittingOrder
                            ? CLIENT_PAYMENT_ENABLED
                              ? "Redirection..."
                              : "Envoi..."
                            : CLIENT_PAYMENT_ENABLED
                              ? "Payer avec Stripe"
                              : "Commander"}
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

