import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@12.7.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
})

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
const supabaseServiceRoleKey =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  Deno.env.get("SERVICE_ROLE_KEY") ??
  ""
const defaultSiteUrl = Deno.env.get("SITE_URL") ?? ""
const defaultCountry = Deno.env.get("STRIPE_CONNECT_COUNTRY") ?? "BE"

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

const syncRestaurantStripeStatus = async (
  adminClient: ReturnType<typeof createClient>,
  restaurant: { id: number; stripe_account_id: string }
) => {
  const account = await stripe.accounts.retrieve(restaurant.stripe_account_id)

  const status = {
    stripe_account_id: account.id,
    stripe_charges_enabled: account.charges_enabled,
    stripe_payouts_enabled: account.payouts_enabled,
    stripe_onboarding_completed:
      Boolean(account.details_submitted) &&
      Boolean(account.charges_enabled) &&
      Boolean(account.payouts_enabled),
  }

  const { error } = await adminClient
    .from("restaurants")
    .update(status)
    .eq("id", restaurant.id)

  if (error) {
    throw error
  }

  return status
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const action = String(body.action ?? "refresh")
    const { userClient, adminClient } = getClients()
    const accessToken = String(body.access_token ?? "").trim()

    if (!accessToken) {
      return jsonResponse({ error: "Session utilisateur manquante." }, 401)
    }

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(accessToken)

    if (userError || !user) {
      return jsonResponse({ error: "Utilisateur non authentifie." }, 401)
    }

    const { data: restaurant, error: restaurantError } = await adminClient
      .from("restaurants")
      .select("id, name, owner_id, stripe_account_id")
      .eq("owner_id", user.id)
      .maybeSingle()

    if (restaurantError) {
      throw restaurantError
    }

    if (!restaurant) {
      return jsonResponse({ error: "Restaurant introuvable." }, 404)
    }

    if (action === "refresh") {
      if (!restaurant.stripe_account_id) {
        return jsonResponse({
          stripe_account_id: null,
          stripe_charges_enabled: false,
          stripe_payouts_enabled: false,
          stripe_onboarding_completed: false,
        })
      }

      const status = await syncRestaurantStripeStatus(adminClient, {
        id: restaurant.id,
        stripe_account_id: restaurant.stripe_account_id,
      })

      return jsonResponse(status)
    }

    let stripeAccountId = restaurant.stripe_account_id

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: String(body.country || defaultCountry),
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          restaurant_id: String(restaurant.id),
          owner_id: String(user.id),
          restaurant_name: restaurant.name ?? "",
        },
      })

      stripeAccountId = account.id

      const { error: updateRestaurantError } = await adminClient
        .from("restaurants")
        .update({
          stripe_account_id: stripeAccountId,
          stripe_charges_enabled: account.charges_enabled,
          stripe_payouts_enabled: account.payouts_enabled,
          stripe_onboarding_completed: false,
        })
        .eq("id", restaurant.id)

      if (updateRestaurantError) {
        throw updateRestaurantError
      }
    }

    if (action === "dashboard") {
      const loginLink = await stripe.accounts.createLoginLink(stripeAccountId)
      return jsonResponse({ url: loginLink.url })
    }

    const returnUrl = String(body.return_url || `${defaultSiteUrl}/restaurant?stripe=return`)
    const refreshUrl = String(body.refresh_url || `${defaultSiteUrl}/restaurant?stripe=refresh`)

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    })

    return jsonResponse({ url: accountLink.url })
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de connecter Stripe.",
      },
      500
    )
  }
})
