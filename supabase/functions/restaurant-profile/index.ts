import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
const supabaseServiceRoleKey =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  Deno.env.get("SERVICE_ROLE_KEY") ??
  ""

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

const jsonResponse = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  })

const getClients = () => ({
  userClient: createClient(supabaseUrl, supabaseAnonKey),
  adminClient: createClient(supabaseUrl, supabaseServiceRoleKey),
})

const normalizeRestaurantPayload = (payload: Record<string, unknown>, ownerId?: string) => ({
  name: String(payload.name ?? "").trim(),
  description: String(payload.description ?? "").trim(),
  image: String(payload.image ?? "").trim(),
  address: String(payload.address ?? "").trim(),
  latitude:
    payload.latitude === null || payload.latitude === undefined || payload.latitude === ""
      ? null
      : Number(payload.latitude),
  longitude:
    payload.longitude === null || payload.longitude === undefined || payload.longitude === ""
      ? null
      : Number(payload.longitude),
  wait_time_minutes: Number(payload.wait_time_minutes ?? 15) || 15,
  is_active: Boolean(payload.is_active ?? true),
  wait_time_mode: String(payload.wait_time_mode ?? "manual"),
  base_wait_time: Number(payload.base_wait_time ?? 15) || 15,
  max_wait_time: Number(payload.max_wait_time ?? 60) || 60,
  capacity_threshold: Number(payload.capacity_threshold ?? 10) || 10,
  ...(ownerId ? { owner_id: ownerId } : {}),
})

const loadRestaurant = async (
  adminClient: ReturnType<typeof createClient>,
  userId: string
) => {
  const { data, error } = await adminClient
    .from("restaurants")
    .select(`
      id, name, description, image, owner_id, address, latitude, longitude,
      wait_time_minutes, is_active, wait_time_mode, base_wait_time,
      max_wait_time, capacity_threshold, stripe_account_id,
      stripe_charges_enabled, stripe_payouts_enabled, stripe_onboarding_completed,
      restaurant_cuisine_types (
        cuisine_type_id,
        cuisine_types (id, name, icon, color)
      )
    `)
    .eq("owner_id", userId)
    .maybeSingle()

  if (error) throw error
  return data
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const action = String(body.action ?? "get")
    const accessToken = String(body.access_token ?? "").trim()

    if (!accessToken) {
      return jsonResponse({ error: "Session utilisateur manquante." }, 401)
    }

    const { userClient, adminClient } = getClients()
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(accessToken)

    if (userError || !user) {
      return jsonResponse({ error: "Utilisateur non authentifie." }, 401)
    }

    if (action === "get") {
      const restaurant = await loadRestaurant(adminClient, user.id)
      return jsonResponse({ restaurant })
    }

    if (action === "create") {
      const payload = normalizeRestaurantPayload(body.restaurant ?? {}, user.id)

      const { data, error } = await adminClient
        .from("restaurants")
        .insert(payload)
        .select()
        .single()

      if (error) throw error

      const restaurant = await loadRestaurant(adminClient, user.id)
      return jsonResponse({ restaurant: restaurant ?? data })
    }

    if (action === "update") {
      const currentRestaurant = await loadRestaurant(adminClient, user.id)

      if (!currentRestaurant) {
        return jsonResponse({ error: "Restaurant introuvable." }, 404)
      }

      const payload = normalizeRestaurantPayload(body.restaurant ?? {})

      const { error: updateError } = await adminClient
        .from("restaurants")
        .update(payload)
        .eq("id", currentRestaurant.id)

      if (updateError) throw updateError

      const selectedCuisineTypes = Array.isArray(body.selected_cuisine_types)
        ? body.selected_cuisine_types
            .map((value: unknown) => Number(value))
            .filter((value: number) => Number.isFinite(value))
        : []

      const { error: deleteCuisineError } = await adminClient
        .from("restaurant_cuisine_types")
        .delete()
        .eq("restaurant_id", currentRestaurant.id)

      if (deleteCuisineError) throw deleteCuisineError

      if (selectedCuisineTypes.length > 0) {
        const relations = selectedCuisineTypes.map((cuisineTypeId) => ({
          restaurant_id: currentRestaurant.id,
          cuisine_type_id: cuisineTypeId,
        }))

        const { error: insertCuisineError } = await adminClient
          .from("restaurant_cuisine_types")
          .insert(relations)

        if (insertCuisineError) throw insertCuisineError
      }

      const restaurant = await loadRestaurant(adminClient, user.id)
      return jsonResponse({ restaurant })
    }

    return jsonResponse({ error: "Action inconnue." }, 400)
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de gerer le restaurant.",
      },
      500
    )
  }
})
